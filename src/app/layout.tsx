import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SOPify — SOP & Training for Small Business',
  description: 'Create SOPs, assign training, and track team progress.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// Runs synchronously before paint — prevents flash of wrong theme
const themeScript = `(function(){
  try {
    var t = localStorage.getItem('theme');
    var d = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark' || (t === null && d)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geist.className} antialiased`}>{children}</body>
    </html>
  )
}
