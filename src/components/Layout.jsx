import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard,
  ArrowRightLeft,
  PiggyBank,
  BookOpen,
  TrendingUp,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  WalletCards,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../hooks/useTheme'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const navItems = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/transacties', label: 'Transacties', icon: ArrowRightLeft },
  { to: '/budgetten', label: 'Budgetten', icon: PiggyBank },
  { to: '/budgetadvies', label: 'Budgetadvies', icon: BookOpen },
  { to: '/beleggingen', label: 'Beleggingen', icon: TrendingUp },
  { to: '/instellingen', label: 'Instellingen', icon: SettingsIcon },
]

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button
      onClick={toggleTheme}
      title="Schakel donkere modus"
      className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-medium shadow-sm transition hover:border-brand-400 dark:border-gray-600"
    >
      {theme === 'dark' ? (
        <>
          <Sun size={14} /> Licht
        </>
      ) : (
        <>
          <Moon size={14} /> Donker
        </>
      )}
    </button>
  )
}

export default function Layout() {
  const { signOut, session } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const online = useOnlineStatus()

  return (
    <div className="min-h-screen">
      {!online && (
        <div className="no-print bg-amber-500 px-4 py-1.5 text-center text-xs font-medium text-white">
          Je bent offline — je ziet mogelijk verouderde gegevens en wijzigen is niet mogelijk.
        </div>
      )}
      <header className="no-print sticky top-0 z-20 border-b border-gray-200 bg-white/90 shadow-sm backdrop-blur dark:border-gray-700 dark:bg-gray-800/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-white shadow-sm">
              <WalletCards size={17} />
            </span>
            FinKJ
          </span>

          <nav className="hidden gap-1 text-sm sm:flex">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/60'
                    }`
                  }
                >
                  <Icon size={15} />
                  {item.label}
                </NavLink>
              )
            })}
          </nav>

          <div className="hidden items-center gap-3 text-sm sm:flex">
            <ThemeToggle />
            <span className="text-gray-500 dark:text-gray-400">{session?.user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium text-red-600 transition hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <LogOut size={15} />
              Uitloggen
            </button>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-full border border-gray-300 px-3 py-1.5 text-sm shadow-sm dark:border-gray-600 sm:hidden"
          >
            {menuOpen ? <X size={16} /> : <Menu size={16} />}
            Menu
          </button>
        </div>

        {menuOpen && (
          <div className="flex flex-col gap-1 border-t border-gray-200 px-4 py-3 text-sm dark:border-gray-700 sm:hidden">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-full px-3 py-2 font-medium transition ${
                      isActive
                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300'
                        : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700/60'
                    }`
                  }
                >
                  <Icon size={16} />
                  {item.label}
                </NavLink>
              )
            })}
            <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
              <ThemeToggle />
              <button onClick={signOut} className="flex items-center gap-1.5 font-medium text-red-600">
                <LogOut size={15} />
                Uitloggen
              </button>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">{session?.user?.email}</span>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
