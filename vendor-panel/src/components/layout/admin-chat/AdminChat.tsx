import { ChatBubble } from "@medusajs/icons"
import { Drawer, Heading, IconButton } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useMe } from "../../../hooks/api"
import { useChatContext } from "../../../providers/chat-provider"

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

export const AdminChat = () => {
  const [open, setOpen] = useState(false)
  const { chatUrl } = useChatContext()

  const [roomId, setRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState("")

  const wsRef = useRef<WebSocket | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { seller, isPending } = useMe()

  if (isPending)
    return <div className="flex justify-center items-center h-screen" />

  const handleOnOpen = (shouldOpen: boolean) => {
    if (shouldOpen) {
      setOpen(true)
    } else {
      setOpen(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  useEffect(() => {
    let cancelled = false

    async function boot() {
      wsRef.current?.close()
      wsRef.current = null
      setMessages([])
      setRoomId(null)

      if (!open || !chatUrl || !seller?.id) return

      const createRes = await fetch(`${chatUrl}/api/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: `admin-vendor-${seller.id}`,
          subject: "Chat with admin",
          participants: [
            {
              userId: seller.id,
              name: seller.name || "Seller",
              role: "seller",
            },
            { userId: "admin", name: "Admin", role: "admin" },
          ],
        }),
      })
      const created = (await createRes.json().catch(() => ({}))) as {
        roomId?: string
      }
      if (!createRes.ok || !created.roomId) return

      if (cancelled) return
      setRoomId(created.roomId)

      const historyRes = await fetch(
        `${chatUrl}/api/messages?roomId=${encodeURIComponent(created.roomId)}&limit=50`,
        { cache: "no-store" }
      )
      const history = (await historyRes.json().catch(() => ({}))) as {
        messages?: ChatMessage[]
      }
      if (cancelled) return
      setMessages(history.messages || [])

      await fetch(`${chatUrl}/api/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: created.roomId,
          userId: seller.id,
          ts: Date.now(),
        }),
      }).catch(() => null)

      const ws = new WebSocket(toWsUrl(chatUrl))
      wsRef.current = ws
      ws.addEventListener("open", () => {
        ws.send(
          JSON.stringify({
            type: "join",
            roomId: created.roomId,
            userId: seller.id,
            name: seller.name || "Seller",
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

    boot()

    return () => {
      cancelled = true
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [open, chatUrl, seller?.id, seller?.name])

  async function send() {
    const trimmed = text.trim()
    if (!trimmed || !chatUrl || !seller?.id || !roomId) return
    setText("")

    const payload = {
      type: "send",
      roomId,
      userId: seller.id,
      name: seller.name || "Seller",
      text: trimmed,
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    } else {
      await fetch(`${chatUrl}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          userId: seller.id,
          name: seller.name || "Seller",
          text: trimmed,
        }),
      }).catch(() => null)
    }
  }

  return (
    <Drawer open={open} onOpenChange={handleOnOpen}>
      <Drawer.Trigger asChild>
        <IconButton
          variant="transparent"
          className="text-ui-fg-muted hover:text-ui-fg-subtle"
        >
          <ChatBubble />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title asChild>
            <Heading>Chat with admin</Heading>
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto px-4">
          {!chatUrl ? (
            <div className="h-full flex items-center justify-center text-ui-fg-subtle">
              Set VITE_CHAT_URL to enable chat
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-auto bg-ui-bg-subtle rounded-md p-3">
                {messages.map((m) => {
                  const mine = m.userId === seller?.id
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
                className="mt-3 flex gap-2"
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
          )}
        </Drawer.Body>
      </Drawer.Content>
    </Drawer>
  )
}
