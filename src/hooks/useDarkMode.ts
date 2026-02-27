'use client'

import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false)

  // Sync state with whatever the no-flash script already applied
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch (e) {}
  }

  return { isDark, toggle }
}
