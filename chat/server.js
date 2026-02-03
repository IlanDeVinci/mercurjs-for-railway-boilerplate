import cors from "cors";
import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import pg from "pg";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 4010);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DATABASE_URL = process.env.CHAT_DATABASE_URL || "";
const CHAT_JWT_SECRET =
  process.env.CHAT_JWT_SECRET || process.env.JWT_SECRET || "supersecret";
const CHAT_TOKEN_TTL_SECONDS = Number(
  process.env.CHAT_TOKEN_TTL_SECONDS || 300,
);
const MEDUSA_BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "";
const MEDUSA_PUBLISHABLE_KEY = process.env.MEDUSA_PUBLISHABLE_KEY || "";

const app = express();
app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (CORS_ORIGIN === "*") return cb(null, true);
      const allowed = CORS_ORIGIN.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      return cb(null, allowed.includes(origin));
    },
    credentials: true,
  }),
);

let pool = null;

// In-memory fallback if CHAT_DATABASE_URL is not configured.
const memRooms = new Map(); // roomId -> room
const memMessages = new Map(); // roomId -> messages[]
const memParticipants = new Map(); // roomId -> Map(userId -> {name, role, lastReadTs})

function nowTs() {
  return Date.now();
}

function randomId() {
  return crypto.randomUUID ? crypto.randomUUID() : cryptoRandomId();
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function normalizeParticipant(p) {
  return {
    userId: String(p?.userId || p?.id || ""),
    name: String(p?.name || ""),
    role: String(p?.role || ""),
  };
}

function computeRoomKey({ order_id, product_id, participants }) {
  const ctx = String(product_id || order_id || "general");
  const ids = (participants || [])
    .map((p) => String(p.userId || p.id || ""))
    .filter(Boolean)
    .sort();
  return `ctx-${ctx}-${ids.join("-")}`;
}

function extractBearer(authHeader) {
  const value = String(authHeader || "");
  if (!value.startsWith("Bearer ")) return null;
  return value.slice("Bearer ".length).trim();
}

function signChatToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name || "",
      email: user.email || null,
    },
    CHAT_JWT_SECRET,
    { expiresIn: CHAT_TOKEN_TTL_SECONDS },
  );
}

function verifyChatToken(token) {
  try {
    return jwt.verify(token, CHAT_JWT_SECRET);
  } catch {
    return null;
  }
}

async function resolveMedusaUser({ token, role }) {
  if (!MEDUSA_BACKEND_URL || !token) return null;

  const endpoint =
    role === "seller" ? "/vendor/sellers/me" : "/store/customers/me";
  const headers = {
    authorization: `Bearer ${token}`,
  };
  if (MEDUSA_PUBLISHABLE_KEY) {
    headers["x-publishable-api-key"] = MEDUSA_PUBLISHABLE_KEY;
  }

  const res = await fetch(`${MEDUSA_BACKEND_URL}${endpoint}`, {
    method: "GET",
    headers,
  }).catch(() => null);

  if (!res || !res.ok) return null;

  const data = await res.json().catch(() => ({}));
  const user = role === "seller" ? data?.seller : data?.customer;
  if (!user?.id) return null;

  const name =
    user?.name ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
    "";

  return {
    id: String(user.id),
    name: String(name || ""),
    email: user?.email || null,
    role: role === "seller" ? "seller" : "customer",
  };
}

function requireChatAuth(req, res, next) {
  const token = extractBearer(req.headers.authorization);
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  const payload = verifyChatToken(token);
  if (!payload?.sub) return res.status(401).json({ message: "Unauthorized" });

  req.chatUser = {
    id: String(payload.sub),
    role: String(payload.role || ""),
    name: String(payload.name || ""),
    email: payload.email || null,
  };

  return next();
}

async function initDb() {
  if (!DATABASE_URL) {
    console.log("[chat] CHAT_DATABASE_URL not set, using in-memory storage");
    return;
  }

  pool = new Pool({ connectionString: DATABASE_URL });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id UUID PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      subject TEXT NULL,
      order_id TEXT NULL,
      product_id TEXT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_room_participants (
      room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      name TEXT NULL,
      role TEXT NULL,
      last_read_ts BIGINT NOT NULL DEFAULT 0,
      joined_at BIGINT NOT NULL,
      PRIMARY KEY (room_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY,
      room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
      ts BIGINT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NULL,
      text TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS chat_messages_room_ts_idx ON chat_messages(room_id, ts);
  `);

  console.log("[chat] DB initialized");
}

async function ensureRoom({
  key,
  subject,
  order_id,
  product_id,
  participants,
}) {
  const createdAt = nowTs();
  const updatedAt = createdAt;

  if (!pool) {
    const roomId = (() => {
      const existing = Array.from(memRooms.values()).find((r) => r.key === key);
      if (existing) return existing.id;
      const id = randomId();
      memRooms.set(id, {
        id,
        key,
        subject: subject || null,
        order_id: order_id || null,
        product_id: product_id || null,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      memMessages.set(id, []);
      memParticipants.set(id, new Map());
      return id;
    })();

    const partMap = memParticipants.get(roomId) || new Map();
    for (const p of participants) {
      const prev = partMap.get(p.userId);
      partMap.set(p.userId, {
        userId: p.userId,
        name: p.name,
        role: p.role,
        lastReadTs: prev?.lastReadTs || 0,
      });
    }
    memParticipants.set(roomId, partMap);
    return { roomId };
  }

  const roomId = randomId();
  const upsert = await pool.query(
    `
      INSERT INTO chat_rooms (id, key, subject, order_id, product_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (key) DO UPDATE
        SET subject = COALESCE(EXCLUDED.subject, chat_rooms.subject),
            order_id = COALESCE(EXCLUDED.order_id, chat_rooms.order_id),
            product_id = COALESCE(EXCLUDED.product_id, chat_rooms.product_id),
            updated_at = GREATEST(chat_rooms.updated_at, EXCLUDED.updated_at)
      RETURNING id;
    `,
    [
      roomId,
      key,
      subject || null,
      order_id || null,
      product_id || null,
      createdAt,
      updatedAt,
    ],
  );

  const finalRoomId = upsert.rows[0].id;

  for (const p of participants) {
    await pool.query(
      `
        INSERT INTO chat_room_participants (room_id, user_id, name, role, last_read_ts, joined_at)
        VALUES ($1, $2, $3, $4, 0, $5)
        ON CONFLICT (room_id, user_id) DO UPDATE
          SET name = EXCLUDED.name,
              role = EXCLUDED.role;
      `,
      [finalRoomId, p.userId, p.name || null, p.role || null, createdAt],
    );
  }

  return { roomId: finalRoomId };
}

async function listRooms({ userId, role, all }) {
  if (!pool) {
    const rooms = Array.from(memRooms.values());
    const visible =
      all && role === "admin"
        ? rooms
        : rooms.filter((r) => {
            const parts = memParticipants.get(r.id);
            return parts?.has(userId);
          });
    return visible
      .map((r) => {
        const msgs = memMessages.get(r.id) || [];
        const last = msgs[msgs.length - 1] || null;
        const parts = Array.from(
          (memParticipants.get(r.id) || new Map()).values(),
        ).map((p) => ({
          userId: p.userId,
          name: p.name,
          role: p.role,
        }));
        const me = (memParticipants.get(r.id) || new Map()).get(userId);
        const unreadCount = me
          ? msgs.filter(
              (m) => m.ts > (me.lastReadTs || 0) && m.userId !== userId,
            ).length
          : 0;
        return {
          id: r.id,
          key: r.key,
          subject: r.subject,
          order_id: r.order_id,
          product_id: r.product_id,
          last_message: last,
          unread_count: unreadCount,
          participants: parts,
        };
      })
      .sort((a, b) => (b.last_message?.ts || 0) - (a.last_message?.ts || 0));
  }

  if (all && role === "admin") {
    const result = await pool.query(
      `
        SELECT
          r.id,
          r.key,
          r.subject,
          r.order_id,
          r.product_id,
          (
            SELECT json_build_object('id', m.id, 'ts', m.ts, 'userId', m.user_id, 'name', m.name, 'text', m.text)
            FROM chat_messages m
            WHERE m.room_id = r.id
            ORDER BY m.ts DESC
            LIMIT 1
          ) AS last_message,
          (
            SELECT json_agg(json_build_object('userId', p2.user_id, 'name', p2.name, 'role', p2.role))
            FROM chat_room_participants p2
            WHERE p2.room_id = r.id
          ) AS participants,
          0::bigint AS unread_count
        FROM chat_rooms r
        ORDER BY COALESCE((SELECT MAX(ts) FROM chat_messages m WHERE m.room_id = r.id), r.updated_at) DESC;
      `,
    );
    return result.rows;
  }

  const result = await pool.query(
    `
      SELECT
        r.id,
        r.key,
        r.subject,
        r.order_id,
        r.product_id,
        (
          SELECT json_build_object('id', m.id, 'ts', m.ts, 'userId', m.user_id, 'name', m.name, 'text', m.text)
          FROM chat_messages m
          WHERE m.room_id = r.id
          ORDER BY m.ts DESC
          LIMIT 1
        ) AS last_message,
        (
          SELECT COUNT(*)
          FROM chat_messages m
          WHERE m.room_id = r.id AND m.ts > p.last_read_ts AND m.user_id <> $1
        )::bigint AS unread_count,
        (
          SELECT json_agg(json_build_object('userId', p2.user_id, 'name', p2.name, 'role', p2.role))
          FROM chat_room_participants p2
          WHERE p2.room_id = r.id
        ) AS participants
      FROM chat_rooms r
      JOIN chat_room_participants p ON p.room_id = r.id
      WHERE p.user_id = $1
      ORDER BY COALESCE((SELECT MAX(ts) FROM chat_messages m WHERE m.room_id = r.id), r.updated_at) DESC;
    `,
    [userId],
  );
  return result.rows;
}

async function isParticipant({ roomId, userId }) {
  if (!roomId || !userId) return false;

  if (!pool) {
    const parts = memParticipants.get(roomId);
    return Boolean(parts?.has(userId));
  }

  const res = await pool.query(
    `SELECT 1 FROM chat_room_participants WHERE room_id = $1 AND user_id = $2 LIMIT 1;`,
    [roomId, userId],
  );
  return Boolean(res.rows?.[0]);
}

async function listMessages({ roomId, limit = 50 }) {
  if (!pool) {
    const msgs = memMessages.get(roomId) || [];
    return msgs.slice(Math.max(0, msgs.length - limit));
  }

  const res = await pool.query(
    `SELECT id, ts, user_id as "userId", name, text FROM chat_messages WHERE room_id = $1 ORDER BY ts DESC LIMIT $2`,
    [roomId, limit],
  );
  return res.rows.reverse();
}

async function addMessage({ roomId, userId, name, text }) {
  const message = {
    id: randomId(),
    ts: nowTs(),
    userId: String(userId),
    name: String(name || ""),
    text: String(text),
  };

  if (!pool) {
    const msgs = memMessages.get(roomId) || [];
    msgs.push(message);
    memMessages.set(roomId, msgs);
    const room = memRooms.get(roomId);
    if (room) room.updated_at = message.ts;
    return message;
  }

  await pool.query(
    `INSERT INTO chat_messages (id, room_id, ts, user_id, name, text) VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      message.id,
      roomId,
      message.ts,
      message.userId,
      message.name || null,
      message.text,
    ],
  );
  await pool.query(`UPDATE chat_rooms SET updated_at = $2 WHERE id = $1`, [
    roomId,
    message.ts,
  ]);
  return message;
}

async function markRead({ roomId, userId, ts }) {
  const newTs = Number(ts || nowTs());

  if (!pool) {
    const partMap = memParticipants.get(roomId);
    if (!partMap) return;
    const cur = partMap.get(userId);
    partMap.set(userId, {
      userId,
      name: cur?.name || "",
      role: cur?.role || "",
      lastReadTs: Math.max(cur?.lastReadTs || 0, newTs),
    });
    return;
  }

  await pool.query(
    `
      UPDATE chat_room_participants
      SET last_read_ts = GREATEST(last_read_ts, $3)
      WHERE room_id = $1 AND user_id = $2
    `,
    [roomId, userId, newTs],
  );
}

async function totalUnreads({ userId }) {
  if (!pool) {
    let count = 0;
    for (const [roomId, msgs] of memMessages.entries()) {
      const partMap = memParticipants.get(roomId);
      const me = partMap?.get(userId);
      if (!me) continue;
      count += msgs.filter(
        (m) => m.ts > (me.lastReadTs || 0) && m.userId !== userId,
      ).length;
    }
    return count;
  }

  const res = await pool.query(
    `
      SELECT COALESCE(SUM(
        (
          SELECT COUNT(*)
          FROM chat_messages m
          WHERE m.room_id = p.room_id AND m.ts > p.last_read_ts AND m.user_id <> $1
        )
      ), 0)::bigint AS total
      FROM chat_room_participants p
      WHERE p.user_id = $1;
    `,
    [userId],
  );
  return Number(res.rows?.[0]?.total || 0);
}

app.get("/health", async (req, res) => {
  try {
    if (pool) await pool.query("SELECT 1");
    res.json({ ok: true, storage: pool ? "postgres" : "memory" });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

app.post("/api/token", async (req, res) => {
  const bearer = extractBearer(req.headers.authorization);
  const role = String(req.body?.role || "customer");
  if (!bearer) return res.status(401).json({ message: "Missing token" });
  if (!["customer", "seller"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }

  try {
    const user = await resolveMedusaUser({ token: bearer, role });
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const token = signChatToken(user);
    res.json({ token, user, expires_in: CHAT_TOKEN_TTL_SECONDS });
  } catch {
    res.status(500).json({ message: "Failed to issue token" });
  }
});

app.get("/api/rooms", requireChatAuth, async (req, res) => {
  const userId = String(req.chatUser?.id || "");
  const role = String(req.chatUser?.role || "");
  const all = String(req.query.all || "").toLowerCase() === "true";

  try {
    const rooms = await listRooms({ userId, role, all });
    res.json({ rooms });
  } catch (e) {
    res.status(500).json({ message: "Failed to list rooms" });
  }
});

app.post("/api/rooms", requireChatAuth, async (req, res) => {
  const userId = String(req.chatUser?.id || "");
  const { subject, order_id, product_id } = req.body || {};
  const participants = (req.body?.participants || [])
    .map(normalizeParticipant)
    .filter((p) => p.userId);
  if (participants.length < 2) {
    return res
      .status(400)
      .json({ message: "participants must include at least 2 users" });
  }
  if (!participants.some((p) => p.userId === userId)) {
    return res.status(403).json({ message: "Not a participant" });
  }
  const key = String(
    req.body?.key || computeRoomKey({ order_id, product_id, participants }),
  );

  try {
    const { roomId } = await ensureRoom({
      key,
      subject,
      order_id,
      product_id,
      participants,
    });
    res.json({ ok: true, roomId, key });
  } catch (e) {
    res.status(500).json({ message: "Failed to create room" });
  }
});

app.get("/api/messages", requireChatAuth, async (req, res) => {
  const roomId = String(req.query.roomId || req.query.room || "");
  const limit = Number(req.query.limit || 50);
  if (!roomId) return res.status(400).json({ message: "Missing roomId" });
  const userId = String(req.chatUser?.id || "");

  try {
    const allowed = await isParticipant({ roomId, userId });
    if (!allowed) return res.status(403).json({ message: "Forbidden" });
  } catch {
    return res.status(500).json({ message: "Failed to verify access" });
  }

  try {
    const messages = await listMessages({ roomId, limit });
    res.json({ roomId, messages });
  } catch (e) {
    res.status(500).json({ message: "Failed to load messages" });
  }
});

app.post("/api/messages", requireChatAuth, async (req, res) => {
  const { roomId, text } = req.body || {};
  const userId = String(req.chatUser?.id || "");
  const name = String(req.chatUser?.name || "");
  if (!roomId || !text) {
    return res.status(400).json({ message: "Missing roomId/text" });
  }

  try {
    const allowed = await isParticipant({ roomId, userId });
    if (!allowed) return res.status(403).json({ message: "Forbidden" });
    const message = await addMessage({
      roomId: String(roomId),
      userId: String(userId),
      name,
      text,
    });
    broadcastRoom(String(roomId), {
      type: "message",
      roomId: String(roomId),
      message,
    });
    res.json({ ok: true, message });
  } catch (e) {
    res.status(500).json({ message: "Failed to send message" });
  }
});

app.post("/api/read", requireChatAuth, async (req, res) => {
  const { roomId, ts } = req.body || {};
  const userId = String(req.chatUser?.id || "");
  if (!roomId) {
    return res.status(400).json({ message: "Missing roomId" });
  }

  try {
    const allowed = await isParticipant({ roomId, userId });
    if (!allowed) return res.status(403).json({ message: "Forbidden" });
    await markRead({
      roomId: String(roomId),
      userId: String(userId),
      ts: Number(ts || nowTs()),
    });
    broadcastRoom(String(roomId), {
      type: "read",
      roomId: String(roomId),
      userId: String(userId),
      ts: Number(ts || nowTs()),
    });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: "Failed to mark read" });
  }
});

app.get("/api/unreads", requireChatAuth, async (req, res) => {
  const userId = String(req.chatUser?.id || "");
  if (!userId) return res.status(400).json({ message: "Missing user" });

  try {
    const total = await totalUnreads({ userId });
    res.json({ userId, total });
  } catch (e) {
    res.status(500).json({ message: "Failed to get unreads" });
  }
});

const server = http.createServer(app);

const wss = new WebSocketServer({ server, path: "/ws" });

// ws clients subscribe to a room by sending: {type:'join', roomId, userId, name}
const clientRoom = new Map(); // ws -> roomId
const clientUser = new Map(); // ws -> userId

function broadcastRoom(roomId, payload) {
  const data = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState !== 1) continue;
    if (clientRoom.get(client) !== roomId) continue;
    client.send(data);
  }
}

wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "/", "http://localhost");
  const token = url.searchParams.get("token");
  const payload = token ? verifyChatToken(token) : null;

  if (!payload?.sub) {
    ws.close(1008, "Unauthorized");
    return;
  }

  ws.chatUser = {
    id: String(payload.sub),
    role: String(payload.role || ""),
    name: String(payload.name || ""),
  };

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(String(raw));
    } catch {
      return;
    }

    if (msg?.type === "join" && msg?.roomId) {
      const userId = String(ws.chatUser?.id || "");
      if (!userId) return;
      const allowed = await isParticipant({
        roomId: String(msg.roomId),
        userId,
      });
      if (!allowed) return;
      clientRoom.set(ws, String(msg.roomId));
      clientUser.set(ws, userId);
      ws.send(JSON.stringify({ type: "joined", roomId: String(msg.roomId) }));
      return;
    }

    if (msg?.type === "send" && msg?.roomId && msg?.text) {
      try {
        const userId = String(ws.chatUser?.id || "");
        if (!userId) return;
        const allowed = await isParticipant({
          roomId: String(msg.roomId),
          userId,
        });
        if (!allowed) return;
        const message = await addMessage({
          roomId: String(msg.roomId),
          userId,
          name: String(ws.chatUser?.name || ""),
          text: String(msg.text),
        });
        broadcastRoom(String(msg.roomId), {
          type: "message",
          roomId: String(msg.roomId),
          message,
        });
      } catch {
        // ignore
      }
      return;
    }

    if (msg?.type === "read" && msg?.roomId) {
      try {
        const userId = String(ws.chatUser?.id || "");
        if (!userId) return;
        const allowed = await isParticipant({
          roomId: String(msg.roomId),
          userId,
        });
        if (!allowed) return;
        const ts = Number(msg.ts || nowTs());
        await markRead({
          roomId: String(msg.roomId),
          userId,
          ts,
        });
        broadcastRoom(String(msg.roomId), {
          type: "read",
          roomId: String(msg.roomId),
          userId,
          ts,
        });
      } catch {
        // ignore
      }
      return;
    }
  });

  ws.on("close", () => {
    clientRoom.delete(ws);
    clientUser.delete(ws);
  });
});

initDb()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[chat] listening on :${PORT}`);
    });
  })
  .catch((e) => {
    console.error("[chat] failed to init:", e);
    process.exit(1);
  });
