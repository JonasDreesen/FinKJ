import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transacties', label: 'Transacties' },
  { to: '/budgetten', label: 'Budgetten' },
  { to: '/instellingen', label: 'Instellingen' },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title="Schakel donkere modus"
      className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
    >
      {theme === 'dark' ? '☀️ Licht' : '🌙 Donker'}
    </button>
  )
}

export default function Layout() {
  const { signOut, session } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-semibold">Budget Planner</span>

          <nav className="hidden gap-4 text-sm sm:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? 'font-semibold text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 dark:text-gray-300'
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 text-sm sm:flex">
            <ThemeToggle />
            <span className="text-gray-500 dark:text-gray-400">{session?.user?.email}</span>
            <button onClick={signOut} className="text-red-600 hover:underline">
              Uitloggen
            </button>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 sm:hidden"
          >
            Menu
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-700 sm:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  isActive
                    ? 'font-semibold text-blue-600'
                    : 'text-gray-600 hover:text-blue-600 dark:text-gray-300'
                }
              >
                {item.label}
              </NavLink>
            ))}
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <ThemeToggle />
              <button onClick={signOut} className="text-red-600 hover:underline">
                Uitloggen
              </button>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</span>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
