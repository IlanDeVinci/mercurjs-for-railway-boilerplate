"use client"

import { useChatContext } from "@/components/providers"
import { useEffect, useMemo, useRef, useState } from "react"

type ChatRoom = {
  id: string
  subject?: string | null
  participants?: Array<{
    userId: string
    name?: string | null
    role?: string | null
  }> | null
  last_message?: {
    id: string
    ts: number
    userId: string
    name?: string | null
    text: string
  } | null
  unread_count?: number
}

type ChatMessage = {
  id: string
  ts: number
  userId: string
  name?: string | null
  text: string
}

function toWsUrl(httpUrl: string) {
  const u = new URL(httpUrl)
  u.protocol = u.protocol === "https:" ? "wss:" : "ws:"
  u.pathname = "/ws"
  u.search = ""
  u.hash = ""
  return u.toString()
}

export const UserMessagesSection = () => {
  const { chatUrl, user, chatToken } = useChatContext()

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const myId = user?.id || ""

  const activeRoom = useMemo(
    () => rooms.find((r) => r.id === activeRoomId) || null,
    [rooms, activeRoomId]
  )

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function load() {
      if (!chatUrl || !myId || !chatToken) {
        if (!cancelled) {
          setRooms([])
          setActiveRoomId(null)
          setMessages([])
          setLoadingRooms(false)
        }
        return
      }

      try {
        const res = await fetch(`${chatUrl}/api/rooms`, {
          cache: "no-store",
          headers: { authorization: `Bearer ${chatToken}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as { rooms?: ChatRoom[] }
        const nextRooms = data.rooms || []
        if (cancelled) return
        setRooms(nextRooms)
        setActiveRoomId((prev) => prev || nextRooms?.[0]?.id || null)
      } finally {
        if (!cancelled) setLoadingRooms(false)
      }
    }

    const loop = async () => {
      await load()
      if (cancelled) return
      timer = setTimeout(loop, 15000)
    }

    loop()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [chatUrl, myId, user?.role, chatToken])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      wsRef.current?.close()
      wsRef.current = null
      setMessages([])

      if (!chatUrl || !myId || !activeRoomId || !chatToken) return

      setLoadingMessages(true)
      try {
        const res = await fetch(
          `${chatUrl}/api/messages?roomId=${encodeURIComponent(activeRoomId)}&limit=100`,
          {
            cache: "no-store",
            headers: { authorization: `Bearer ${chatToken}` },
          }
        )
        const data = (await res.json().catch(() => ({}))) as {
          messages?: ChatMessage[]
        }
        if (cancelled) return
        setMessages(data.messages || [])

        await fetch(`${chatUrl}/api/read`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${chatToken}`,
          },
          body: JSON.stringify({
            roomId: activeRoomId,
            ts: Date.now(),
          }),
        }).catch(() => null)

        if (cancelled) return

        const ws = new WebSocket(
          toWsUrl(chatUrl) + `?token=${encodeURIComponent(chatToken)}`
        )
        wsRef.current = ws
        ws.addEventListener("open", () => {
          ws.send(
            JSON.stringify({
              type: "join",
              roomId: activeRoomId,
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
      } finally {
        if (!cancelled) setLoadingMessages(false)
      }
    }

    loadMessages()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [chatUrl, myId, activeRoomId, user?.name, chatToken])

  async function send() {
    const trimmed = text.trim()
    if (!trimmed || !chatUrl || !myId || !activeRoomId || !chatToken) return
    setText("")

    const payload = {
      type: "send",
      roomId: activeRoomId,
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
          roomId: activeRoomId,
          text: trimmed,
        }),
      }).catch(() => null)
    }
  }

  return (
    <div className="max-w-full">
      {!chatUrl ? (
        <div className="h-96 w-full flex items-center justify-center">
          Chat is not configured
        </div>
      ) : loadingRooms ? (
        <div className="h-96 w-full flex items-center justify-center">
          Loading...
        </div>
      ) : !rooms.length ? (
        <div className="h-96 w-full flex items-center justify-center">
          No conversations yet
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-1 border border-primary rounded-md overflow-hidden">
            <div className="p-3 border-b border-primary uppercase font-medium">
              Conversations
            </div>
            <div className="max-h-[520px] overflow-auto">
              {rooms.map((r) => {
                const active = r.id === activeRoomId
                const last = r.last_message
                const unread = Number(r.unread_count || 0)
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveRoomId(r.id)}
                    className={`w-full text-left p-3 border-b border-primary/30 ${
                      active ? "bg-primary/10" : "bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">
                        {r.subject || "Conversation"}
                      </div>
                      {unread > 0 && (
                        <div className="text-xs bg-primary text-secondary rounded-full px-2 py-0.5">
                          {unread}
                        </div>
                      )}
                    </div>
                    {last?.text && (
                      <div className="text-sm opacity-70 truncate mt-1">
                        {last.text}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="md:col-span-2 border border-primary rounded-md overflow-hidden flex flex-col h-[600px]">
            <div className="p-3 border-b border-primary uppercase font-medium">
              {activeRoom?.subject || "Messages"}
            </div>

            <div className="flex-1 overflow-auto bg-primary/5 p-3">
              {loadingMessages ? (
                <div className="h-full flex items-center justify-center">
                  Loading...
                </div>
              ) : (
                <>
                  {messages.map((m) => {
                    const mine = m.userId === myId
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
                </>
              )}
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
        </div>
      )}
    </div>
  )
}
