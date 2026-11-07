import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import {
  ArrowLeftRight,
  BookOpen,
  Eye,
  EyeOff,
  HandCoins,
  Home,
  LineChart,
  LogOut,
  MoreHorizontal,
  PiggyBank,
  Plus,
  RefreshCw,
  Settings,
  WifiOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useTransactionSheet } from '../context/SheetContext'
import { useToast } from '../context/ToastContext'
import { useMembers } from '../hooks/useData'
import { useOnline } from '../hooks/useOnline'
import { runDueRecurring } from '../lib/api'

const NAV = [
  { to: '/', label: 'Overzicht', icon: Home, end: true },
  { to: '/transacties', label: 'Transacties', icon: ArrowLeftRight },
  { to: '/budgetten', label: 'Budgetten', icon: PiggyBank },
  { to: '/samen', label: 'Samen', icon: HandCoins },
  { to: '/beleggingen', label: 'Beleggingen', icon: LineChart },
  { to: '/advies', label: 'Budgetadvies', icon: BookOpen },
  { to: '/instellingen', label: 'Instellingen', icon: Settings },
]

const MOBILE_NAV = [
  { to: '/', label: 'Overzicht', icon: Home, end: true },
  { to: '/transacties', label: 'Transacties', icon: ArrowLeftRight },
  null,
  { to: '/budgetten', label: 'Budgetten', icon: PiggyBank },
  { to: '/meer', label: 'Meer', icon: MoreHorizontal, match: ['/meer', '/samen', '/beleggingen', '/advies', '/instellingen'] },
]

function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Elk uur kijken of er een nieuwe versie is.
      if (registration) setInterval(() => registration.update(), 60 * 60 * 1000)
    },
  })
  if (!needRefresh) return null
  return (
    <div className="no-print fixed inset-x-0 top-0 z-[80] flex justify-center p-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <div className="flex items-center gap-3 rounded-pill bg-brand-500 py-2 pl-4 pr-2 text-sm text-white shadow-lift">
        Nieuwe versie beschikbaar
        <button className="btn btn-sm bg-white text-brand-600" onClick={() => updateServiceWorker(true)}>
          <RefreshCw size={14} /> Vernieuwen
        </button>
      </div>
    </div>
  )
}

function SidebarLink({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
          isActive ? 'bg-brand-500 text-white shadow-lift' : 'text-muted hover:bg-surface-2 hover:text-ink'
        }`
      }
    >
      <Icon size={19} />
      {item.label}
    </NavLink>
  )
}

export default function AppShell() {
  const { signOut } = useAuth()
  const { me } = useMembers()
  const { privacy, togglePrivacy } = usePrefs()
  const { openNew } = useTransactionSheet()
  const { showError } = useToast()
  const online = useOnline()
  const location = useLocation()

  useEffect(() => {
    runDueRecurring().catch((error) => showError(error, 'Terugkerende boekingen aanmaken mislukt.'))
    const onVisible = () => {
      if (document.visibilityState === 'visible') runDueRecurring().catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [showError])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <div className="min-h-screen lg:flex">
      <UpdateBanner />

      <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line/70 bg-surface/60 px-4 py-6 backdrop-blur lg:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="h-9 w-9" />
          <div>
            <p className="font-semibold leading-tight tracking-tight">FinKJ</p>
            <p className="text-xs text-muted">Hallo {me?.display_name || ''}</p>
          </div>
        </div>
        <button className="btn btn-primary mb-6 w-full" onClick={() => openNew()}>
          <Plus size={18} /> Nieuwe transactie
        </button>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-6 flex flex-col gap-1 border-t border-line/70 pt-4">
          <button
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-surface-2 hover:text-ink"
            onClick={togglePrivacy}
          >
            {privacy ? <EyeOff size={19} /> : <Eye size={19} />}
            {privacy ? 'Bedragen tonen' : 'Bedragen verbergen'}
          </button>
          <button
            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-expense/10 hover:text-expense"
            onClick={() => signOut()}
          >
            <LogOut size={19} /> Uitloggen
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {!online && (
          <div className="no-print sticky top-0 z-30 flex items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 pt-[calc(0.375rem+env(safe-area-inset-top))] text-xs font-medium text-white">
            <WifiOff size={14} /> Offline — je ziet de laatst bekende gegevens, wijzigen kan niet.
          </div>
        )}
        <main className="pb-nav mx-auto w-full max-w-5xl px-4 pt-[calc(1rem+env(safe-area-inset-top))] sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          <Outlet />
        </main>
      </div>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Hoofdmenu"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2">
          {MOBILE_NAV.map((item) =>
            item === null ? (
              <div key="fab" className="flex w-16 justify-center">
                <button
                  onClick={() => openNew()}
                  className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-lift transition active:scale-95"
                  aria-label="Nieuwe transactie"
                >
                  <Plus size={28} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <MobileTab key={item.to} item={item} pathname={location.pathname} />
            ),
          )}
        </div>
      </nav>
    </div>
  )
}

function MobileTab({ item, pathname }) {
  const Icon = item.icon
  const forcedActive = item.match?.some((p) => pathname.startsWith(p))
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex min-h-[56px] w-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
          isActive || forcedActive ? 'text-brand-500 dark:text-brand-300' : 'text-muted'
        }`
      }
    >
      <Icon size={22} />
      {item.label}
    </NavLink>
  )
}
