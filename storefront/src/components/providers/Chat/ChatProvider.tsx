"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

export type ChatUser = {
  id: string
  name?: string
  email?: string | null
  role?: string
}

type ChatContextValue = {
  chatUrl: string | null
  user: ChatUser | null
  chatToken: string | null
  tokenLoading: boolean
}

const ChatContext = createContext<ChatContextValue>({
  chatUrl: null,
  user: null,
  chatToken: null,
  tokenLoading: false,
})

const DEFAULT_CHAT_URL =
  process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:4010"

export function ChatProvider({
  user,
  children,
}: {
  user: ChatUser | null
  children: React.ReactNode
}) {
  const [chatToken, setChatToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!user?.id) {
        setChatToken(null)
        setTokenLoading(false)
        return
      }

      setTokenLoading(true)

      try {
        const res = await fetch("/api/chat/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: user.role || "customer" }),
        })
        if (!res.ok) throw new Error("Token request failed")
        const data = (await res.json()) as { token?: string }
        if (!cancelled) setChatToken(data.token || null)
      } catch {
        if (!cancelled) setChatToken(null)
      } finally {
        if (!cancelled) setTokenLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [user?.id, user?.role])

  const value = useMemo<ChatContextValue>(() => {
    const chatUrl = DEFAULT_CHAT_URL || null
    return { chatUrl, user, chatToken, tokenLoading }
  }, [user, chatToken, tokenLoading])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  return useContext(ChatContext)
}
