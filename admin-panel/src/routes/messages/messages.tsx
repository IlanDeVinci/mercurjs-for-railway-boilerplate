import { useEffect, useRef, useState } from "react";

import { Container, Heading } from "@medusajs/ui";

type ChatRoom = {
  roomId: string;
  key: string;
  subject?: string | null;
  participants: Array<{
    userId: string;
    name?: string | null;
    role?: string | null;
  }>;
  unread_count?: number;
  last_ts?: number | null;
  last_message?: {
    text: string;
    ts: number;
    userId: string;
    name?: string | null;
  } | null;
};

type ChatMessage = {
  id: string;
  ts: number;
  userId: string;
  name?: string | null;
  text: string;
};

function toWsUrl(httpUrl: string) {
  const u = new URL(httpUrl);
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
  u.pathname = "/ws";
  u.search = "";
  u.hash = "";
  
return u.toString();
}

export const Messages = () => {
  const chatUrl = import.meta.env.VITE_CHAT_URL || "http://localhost:4010";
  const adminUserId = "admin";

  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");

  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setIsLoading(true);
      try {
        const res = await fetch(
          `${chatUrl}/api/rooms?userId=${encodeURIComponent(adminUserId)}&role=admin&all=true`,
          { cache: "no-store" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          rooms?: ChatRoom[];
        };
        if (cancelled) return;
        const nextRooms = data.rooms || [];
        setRooms(nextRooms);
        setActiveRoomId((prev) => prev || nextRooms[0]?.roomId || null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadRooms();
    const id = window.setInterval(loadRooms, 15000);
    
return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [chatUrl]);

  useEffect(() => {
    let cancelled = false;

    async function openRoom() {
      wsRef.current?.close();
      wsRef.current = null;
      setMessages([]);

      if (!activeRoomId) return;

      const res = await fetch(
        `${chatUrl}/api/messages?roomId=${encodeURIComponent(activeRoomId)}&limit=50`,
        { cache: "no-store" },
      );
      const data = (await res.json().catch(() => ({}))) as {
        messages?: ChatMessage[];
      };
      if (cancelled) return;
      setMessages(data.messages || []);

      await fetch(`${chatUrl}/api/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          userId: adminUserId,
          ts: Date.now(),
        }),
      }).catch(() => null);

      const ws = new WebSocket(toWsUrl(chatUrl));
      wsRef.current = ws;
      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            type: "join",
            roomId: activeRoomId,
            userId: adminUserId,
            name: "Admin",
          }),
        );
      });
      ws.addEventListener("message", (ev) => {
        try {
          const msg = JSON.parse(String(ev.data));
          if (msg?.type === "message" && msg?.message) {
            setMessages((prev) => [...prev, msg.message as ChatMessage]);
          }
        } catch {
          // ignore
        }
      });
    }

    openRoom();

    return () => {
      cancelled = true;
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [activeRoomId, chatUrl]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || !activeRoomId) return;
    setText("");

    const payload = {
      type: "send",
      roomId: activeRoomId,
      userId: adminUserId,
      name: "Admin",
      text: trimmed,
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      await fetch(`${chatUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: activeRoomId,
          userId: adminUserId,
          name: "Admin",
          text: trimmed,
        }),
      }).catch(() => null);
    }
  }

  return (
    <Container>
      <Heading>Messages</Heading>
      <div className="h-[600px] py-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            Loading...
          </div>
        ) : (
          <div className="grid h-full grid-cols-[280px_1fr] gap-3">
            <div className="h-full overflow-auto rounded-md border bg-ui-bg-subtle">
              {rooms.length === 0 ? (
                <div className="p-4 text-ui-fg-subtle">
                  No conversations yet.
                </div>
              ) : (
                rooms.map((r) => {
                  const active = r.roomId === activeRoomId;
                  const label = r.subject || r.key;
                  const unread = r.unread_count || 0;
                  
return (
                    <button
                      key={r.roomId}
                      className={`w-full border-b px-3 py-2 text-left hover:bg-ui-bg-base ${active ? "bg-ui-bg-base" : ""}`}
                      onClick={() => setActiveRoomId(r.roomId)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium">{label}</div>
                        {unread > 0 ? (
                          <span className="rounded-full bg-ui-bg-interactive px-2 py-0.5 text-xs text-ui-fg-on-color">
                            {unread}
                          </span>
                        ) : null}
                      </div>
                      {r.last_message?.text ? (
                        <div className="mt-1 truncate text-xs text-ui-fg-subtle">
                          {r.last_message.text}
                        </div>
                      ) : null}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex h-full flex-col rounded-md border bg-ui-bg-base">
              <div className="flex-1 overflow-auto p-3">
                {activeRoomId ? (
                  messages.map((m) => {
                    const mine = m.userId === adminUserId;
                    
return (
                      <div
                        key={m.id}
                        className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-md border px-3 py-2 ${mine ? "bg-ui-bg-interactive text-ui-fg-on-color" : "bg-ui-bg-subtle"}`}
                        >
                          <div className="mb-1 text-xs opacity-70">
                            {m.name || m.userId}
                          </div>
                          <div className="whitespace-pre-wrap break-words text-sm">
                            {m.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-ui-fg-subtle">
                    Select a conversation
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <form
                className="flex gap-2 border-t p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={
                    activeRoomId ? "Type a message..." : "Select a conversation"
                  }
                  disabled={!activeRoomId}
                  className="flex-1 rounded-md border px-3 py-2"
                />
                <button
                  type="submit"
                  disabled={!activeRoomId || !text.trim()}
                  className="rounded-md bg-ui-bg-interactive px-4 py-2 text-ui-fg-on-color disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
};
