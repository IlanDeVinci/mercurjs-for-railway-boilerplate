"use client"

import { useChatContext } from "@/components/providers/Chat/ChatProvider"
import { useEffect, useState } from "react"

export function useChatUnreads(pollMs: number = 15000) {
  const { chatUrl, user, chatToken } = useChatContext()
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function tick() {
      if (!chatUrl || !user?.id || !chatToken) {
        if (!cancelled) setCount(0)
        return
      }

      try {
        const res = await fetch(`${chatUrl}/api/unreads`, {
          cache: "no-store",
          headers: { authorization: `Bearer ${chatToken}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as { total?: number }
        if (!cancelled) setCount(Number(data.total || 0))
      } catch {
        // ignore
      }
    }

    const loop = async () => {
      await tick()
      if (cancelled) return
      timer = setTimeout(loop, pollMs)
    }

    loop()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [chatUrl, user?.id, pollMs, chatToken])

  return count
}
