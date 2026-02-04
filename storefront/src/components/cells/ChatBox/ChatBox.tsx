"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useChatContext } from "@/components/providers"

type ChatProps = {
  order_id?: string
  product_id?: string
  subject?: string | null
  currentUser: {
    id: string
    name: string
    email: string | null
    role: string
  }
  supportUser: {
    id: string
    name: string
    email: string | null
    role: string
  }
}

type ChatMessage = {
  id: string
  ts: number
  userId: string
  name?: string
  text: string
}

function toWsUrl(httpUrl: string, token: string) {
  const u = new URL(httpUrl)
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:"
  u.pathname = "/ws"
  u.searchParams.set("token", token)
  u.hash = ""
  return u.toString()
}

export function ChatBox({
  currentUser,
  supportUser,
  subject,
  order_id,
  product_id,
}: ChatProps) {
  const { chatUrl, chatToken } = useChatContext()
  const [roomId, setRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const participants = useMemo(
    () => [
      {
        userId: currentUser.id,
        name: currentUser.name,
        role: currentUser.role,
      },
      {
        userId: supportUser.id,
        name: supportUser.name,
        role: supportUser.role,
      },
    ],
    [
      currentUser.id,
      currentUser.name,
      currentUser.role,
      supportUser.id,
      supportUser.name,
      supportUser.role,
    ]
  )

  useEffect(() => {
    let cancelled = false

    async function boot() {
      setLoading(true)
      setError(null)
      setRoomId(null)
      setMessages([])

      try {
        if (!chatUrl || !chatToken) {
          throw new Error("Chat not configured")
        }

        const createRes = await fetch(`${chatUrl}/api/rooms`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${chatToken}`,
          },
          body: JSON.stringify({
            subject: subject || null,
            order_id: order_id || null,
            product_id: product_id || null,
            participants,
          }),
        })

        const created = (await createRes.json().catch(() => ({}))) as {
          roomId?: string
          message?: string
        }

        if (!createRes.ok || !created.roomId) {
          throw new Error(created.message || "Failed to create chat room")
        }

        if (cancelled) return
        setRoomId(created.roomId)

        const historyRes = await fetch(
          `${chatUrl}/api/messages?roomId=${encodeURIComponent(created.roomId)}&limit=50`,
          {
            cache: "no-store",
            headers: { authorization: `Bearer ${chatToken}` },
          }
        )
        const history = (await historyRes.json().catch(() => ({}))) as {
          messages?: ChatMessage[]
        }
        if (!cancelled) setMessages(history.messages || [])

        // Mark read after initial load
        await fetch(`${chatUrl}/api/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${chatToken}`,
          },
          body: JSON.stringify({
            roomId: created.roomId,
            ts: Date.now(),
          }),
        }).catch(() => null)

        if (cancelled) return

        const ws = new WebSocket(toWsUrl(chatUrl, chatToken))
        wsRef.current = ws

        ws.addEventListener("open", () => {
          ws.send(
            JSON.stringify({
              type: "join",
              roomId: created.roomId,
            })
          )
        })

        ws.addEventListener("message", (ev) => {
          try {
            const msg = JSON.parse(String(ev.data))
            if (msg?.type === "message" && msg?.message) {
              setMessages((prev) => [...prev, msg.message as ChatMessage])
            }
          } catch {
            // ignore
          }
        })
      } catch (e) {
        const message = e instanceof Error ? e.message : "Chat failed"
        if (!cancelled) setError(message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    boot()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [
    participants,
    subject,
    order_id,
    product_id,
    currentUser.id,
    currentUser.name,
    chatUrl,
    chatToken,
  ])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  async function send() {
    const trimmed = text.trim()
    if (!trimmed || !roomId || !chatUrl || !chatToken) return
    setText("")

    const payload = {
      type: "send",
      roomId,
      text: trimmed,
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    } else {
      await fetch(`${chatUrl}/api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${chatToken}`,
        },
        body: JSON.stringify({
          roomId,
          text: trimmed,
        }),
      }).catch(() => null)
    }

    // optimistic read marker
    await fetch(`${chatUrl}/api/read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${chatToken}`,
      },
      body: JSON.stringify({ roomId, ts: Date.now() }),
    }).catch(() => null)
  }

  if (loading) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="uppercase font-medium">Chat unavailable</div>
          <div className="text-sm opacity-70 mt-1">{error}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-[500px] flex flex-col border border-primary rounded-md overflow-hidden">
      <div className="flex-1 overflow-auto bg-primary/5 p-3">
        {messages.map((m) => {
          const mine = m.userId === currentUser.id
          return (
            <div
              key={m.id}
              className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg border px-3 py-2 ${
                  mine
                    ? "bg-secondary text-primary border-secondary"
                    : "bg-white border-primary"
                }`}
              >
                <div className="text-xs opacity-70 mb-1">
                  {m.name || m.userId}
                </div>
                <div className="text-sm whitespace-pre-wrap break-words">
                  {m.text}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form
        className="p-3 flex gap-2 border-t border-primary bg-white"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border border-primary rounded-md px-3 py-2"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-md bg-primary text-secondary"
        >
          Send
        </button>
      </form>
    </div>
  )
}
