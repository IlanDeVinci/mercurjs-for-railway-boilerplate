import { Footer, Header } from "@/components/organisms"
import { ChatProvider } from "@/components/providers"
import { retrieveCustomer } from "@/lib/data/customer"
import { checkRegion } from "@/lib/helpers/check-region"
import { redirect } from "next/navigation"

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const { locale } = await params

  const user = await retrieveCustomer()
  const regionCheck = await checkRegion(locale)

  if (!regionCheck) {
    return redirect("/")
  }

  return (
    <ChatProvider
      user={
        user
          ? {
              id: user.id,
              name: `${user.first_name || ""} ${user.last_name || ""}`.trim(),
              email: user.email,
              role: "customer",
            }
          : null
      }
    >
      <Header />
      {children}
      <Footer />
    </ChatProvider>
  )
}
