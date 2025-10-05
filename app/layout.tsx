// app/layout.tsx — minimal root layout with ZERO redirects
/* @ts-nocheck */
import './globals.css'
export const metadata = { title: 'WageFlow' }
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
