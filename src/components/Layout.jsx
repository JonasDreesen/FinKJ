import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navItems = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/transacties', label: 'Transacties' },
  { to: '/budgetten', label: 'Budgetten' },
  { to: '/instellingen', label: 'Instellingen' },
]

export default function Layout() {
  const { signOut, session } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="font-semibold">Budget Planner</span>
          <nav className="flex gap-4 text-sm">
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
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500 dark:text-gray-400">{session?.user?.email}</span>
            <button onClick={signOut} className="text-red-600 hover:underline">
              Uitloggen
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
