import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Referent',
  description: 'Краткая аннотация веб страницы с переводом на русский язык',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}





