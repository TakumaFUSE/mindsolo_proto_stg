import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'editlife',
  description: '自己理解と探索のためのパーソナルストックツール',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  )
}
