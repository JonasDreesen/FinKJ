import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const PrefsContext = createContext(undefined)

function read(key, fallback) {
  try {
    return localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // negeren
  }
}

export function PrefsProvider({ children }) {
  const [theme, setTheme] = useState(() => read('finkj:theme', 'system'))
  const [privacy, setPrivacy] = useState(() => read('finkj:privacy', 'off') === 'on')

  useEffect(() => {
    write('finkj:theme', theme)
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      document.documentElement.classList.toggle('dark', dark)
    }
    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  useEffect(() => {
    write('finkj:privacy', privacy ? 'on' : 'off')
    document.documentElement.classList.toggle('privacy', privacy)
  }, [privacy])

  const value = useMemo(
    () => ({ theme, setTheme, privacy, setPrivacy, togglePrivacy: () => setPrivacy((p) => !p) }),
    [theme, privacy],
  )
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs() {
  const ctx = useContext(PrefsContext)
  if (!ctx) throw new Error('usePrefs moet binnen PrefsProvider gebruikt worden')
  return ctx
}
