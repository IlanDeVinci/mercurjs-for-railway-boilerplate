import { Container, Heading, Text } from "@medusajs/ui"
import { useChatContext } from "../../providers/chat-provider"
import { useEffect, useRef, useState } from "react"

type ChatRoom = {
  id: string
  subject?: string | null
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

export const Messages = () => {
  const { chatUrl, user, chatToken } = useChatContext()
  const myId = user?.id || ""

  const [rooms, setRooms] = useState<ChatRoom[]>([])
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(true)

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function loadRooms() {
      if (!chatUrl || !myId || !chatToken) {
        if (!cancelled) {
          setRooms([])
          setActiveRoomId(null)
          setMessages([])
          setLoading(false)
        }
        return
      }

      try {
        const res = await fetch(`${chatUrl}/api/rooms`, {
          cache: "no-store",
          headers: { authorization: `Bearer ${chatToken}` },
        })
        const data = (await res.json().catch(() => ({}))) as {
          rooms?: ChatRoom[]
        }
        if (cancelled) return
        const next = data.rooms || []
        setRooms(next)
        setActiveRoomId((prev) => prev || next?.[0]?.id || null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    const loop = async () => {
      await loadRooms()
      if (cancelled) return
      timer = setTimeout(loop, 15000)
    }

    loop()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [chatUrl, myId, chatToken])

  useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      wsRef.current?.close()
      wsRef.current = null
      setMessages([])

      if (!chatUrl || !myId || !activeRoomId || !chatToken) return

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
    <Container className="divide-y p-0 min-h-[700px]">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading>Messages</Heading>
        </div>
      </div>

      <div className="px-6 py-4 h-[655px]">
        {!chatUrl ? (
          <div className="flex flex-col items-center w-full h-full justify-center">
            <Heading>Chat not configured</Heading>
            <Text className="text-ui-fg-subtle mt-4" size="small">
              Set VITE_CHAT_URL to point to the self-hosted chat service
            </Text>
          </div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center">
            Loading...
          </div>
        ) : !rooms.length ? (
          <div className="flex flex-col items-center w-full h-full justify-center">
            <Heading>No conversations yet</Heading>
            <Text className="text-ui-fg-subtle mt-4" size="small">
              Conversations will appear when customers message you
            </Text>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
            <div className="border rounded-md overflow-hidden h-full">
              <div className="p-3 border-b font-medium">Conversations</div>
              <div className="overflow-auto h-[560px]">
                {rooms.map((r) => {
                  const active = r.id === activeRoomId
                  const unread = Number(r.unread_count || 0)
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveRoomId(r.id)}
                      className={`w-full text-left p-3 border-b ${active ? "bg-ui-bg-subtle" : "bg-ui-bg-base"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate font-medium">
                          {r.subject || "Conversation"}
                        </div>
                        {unread > 0 && (
                          <div className="text-xs bg-ui-bg-interactive text-ui-fg-on-color rounded-full px-2 py-0.5">
                            {unread}
                          </div>
                        )}
                      </div>
                      {r.last_message?.text && (
                        <div className="text-sm text-ui-fg-subtle truncate mt-1">
                          {r.last_message.text}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="border rounded-md overflow-hidden md:col-span-2 h-full flex flex-col">
              <div className="p-3 border-b font-medium">
                {rooms.find((r) => r.id === activeRoomId)?.subject ||
                  "Messages"}
              </div>
              <div className="flex-1 overflow-auto bg-ui-bg-subtle p-3">
                {messages.map((m) => {
                  const mine = m.userId === myId
                  return (
                    <div
                      key={m.id}
                      className={`mb-2 flex ${mine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-md border px-3 py-2 ${mine ? "bg-ui-bg-interactive text-ui-fg-on-color" : "bg-ui-bg-base"}`}
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
                className="p-3 border-t flex gap-2 bg-ui-bg-base"
                onSubmit={(e) => {
                  e.preventDefault()
                  send()
                }}
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-md border px-3 py-2"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-ui-bg-interactive text-ui-fg-on-color"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}
