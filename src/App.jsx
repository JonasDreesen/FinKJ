import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PrefsProvider } from './context/PrefsContext'
import { ToastProvider } from './context/ToastContext'
import { SheetProvider } from './context/SheetContext'
import AppShell from './components/AppShell'
import { Spinner } from './components/ui'
import Login from './pages/Login'
import StatusScreen from './pages/StatusScreen'

const Overview = lazy(() => import('./pages/Overview'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Together = lazy(() => import('./pages/Together'))
const Investments = lazy(() => import('./pages/Investments'))
const Advice = lazy(() => import('./pages/Advice'))
const Settings = lazy(() => import('./pages/Settings'))
const More = lazy(() => import('./pages/More'))

function FullscreenSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  )
}

function Gate() {
  const { status } = useAuth()

  if (status === 'loading') return <FullscreenSpinner />
  if (status === 'signedOut' || status === 'mfa') return <Login />
  if (status !== 'ready') return <StatusScreen status={status} />

  return (
    <SheetProvider>
      <Suspense fallback={<FullscreenSpinner />}>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Overview />} />
            <Route path="transacties" element={<Transactions />} />
            <Route path="budgetten" element={<Budgets />} />
            <Route path="samen" element={<Together />} />
            <Route path="beleggingen" element={<Investments />} />
            <Route path="advies" element={<Advice />} />
            <Route path="instellingen" element={<Settings />} />
            <Route path="meer" element={<More />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </SheetProvider>
  )
}

export default function App() {
  return (
    <PrefsProvider>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </PrefsProvider>
  )
}
