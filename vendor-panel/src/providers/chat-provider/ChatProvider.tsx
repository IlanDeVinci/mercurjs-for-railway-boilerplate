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
  role?: string
}

type ChatContextValue = {
  chatUrl: string | null
  user: ChatUser | null
  chatToken: string | null
  tokenLoading: boolean
}

const ChatContext = createContext<ChatContextValue>({
  chatUrl: typeof __CHAT_URL__ === "string" ? __CHAT_URL__ : null,
  user: null,
  chatToken: null,
  tokenLoading: false,
})

export const ChatProvider = ({
  user,
  children,
}: {
  user: ChatUser | null
  children: React.ReactNode
}) => {
  const [chatToken, setChatToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const chatUrl = typeof __CHAT_URL__ === "string" ? __CHAT_URL__ : null
      const bearer = window.localStorage.getItem("medusa_auth_token") || ""

      if (!chatUrl || !bearer || !user?.id) {
        setChatToken(null)
        setTokenLoading(false)
        return
      }

      setTokenLoading(true)

      try {
        const res = await fetch(`${chatUrl}/api/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: `Bearer ${bearer}`,
          },
          body: JSON.stringify({ role: user.role || "seller" }),
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
    const chatUrl = typeof __CHAT_URL__ === "string" ? __CHAT_URL__ : null
    return { chatUrl, user, chatToken, tokenLoading }
  }, [user, chatToken, tokenLoading])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  return useContext(ChatContext)
}
