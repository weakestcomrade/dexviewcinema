import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dex View Cinema",
  description: "Your ultimate destination for premium movie and sports event experiences.",
  generator: "v0.dev",
  icons: {
    icon: "/dexcinema-logo.jpeg", // For favicon
    apple: "/dexcinema-logo.jpeg", // For Apple touch icon
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
