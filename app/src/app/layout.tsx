import type { Metadata } from 'next'
import { Manrope, Noto_Sans_JP } from 'next/font/google'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  display: 'swap',
})

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  variable: '--font-noto-sans-jp',
  display: 'swap',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'editlife',
  description: '自己理解と探索のためのパーソナルストックツール',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${manrope.variable} ${notoSansJP.variable}`}>
        {children}
      </body>
    </html>
  )
}
