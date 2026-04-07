import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'AtVenture — Deal Flow Portal',
  description: 'Investment Committee Review Portal',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
