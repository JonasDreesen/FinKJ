import { useEffect, useRef, useState } from 'react'
import { KeyRound, Lock, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Field } from '../components/ui'

// Na enkele mislukte pogingen wacht het formulier steeds langer (bovenop de
// limieten die Supabase zelf al oplegt).
function useCooldown() {
  const [failures, setFailures] = useState(0)
  const [until, setUntil] = useState(0)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (until <= now) return
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [until, now])
  return {
    remaining: Math.max(0, Math.ceil((until - now) / 1000)),
    fail() {
      const n = failures + 1
      setFailures(n)
      if (n >= 3) {
        setUntil(Date.now() + Math.min(60, 2 ** (n - 2)) * 1000)
        setNow(Date.now())
      }
    },
    reset() {
      setFailures(0)
      setUntil(0)
    },
  }
}

export default function Login() {
  const { status, signIn, verifyMfa, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const cooldown = useCooldown()
  const codeRef = useRef(null)
  const mfa = status === 'mfa'

  useEffect(() => {
    if (mfa) codeRef.current?.focus()
  }, [mfa])

  async function submitPassword(e) {
    e.preventDefault()
    if (cooldown.remaining) return
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) {
      cooldown.fail()
      setError(
        String(error.message).toLowerCase().includes('fetch')
          ? 'Geen verbinding. Controleer je internet.'
          : 'Inloggen mislukt. Controleer je e-mailadres en wachtwoord.',
      )
    } else {
      cooldown.reset()
      setPassword('')
    }
  }

  async function submitCode(e) {
    e.preventDefault()
    if (cooldown.remaining || code.length !== 6) return
    setError('')
    setBusy(true)
    const { error } = await verifyMfa(code)
    setBusy(false)
    if (error) {
      cooldown.fail()
      setCode('')
      setError('Ongeldige code. Probeer opnieuw met de code die nu in je app staat.')
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-b from-brand-50 to-bg px-5 py-10 dark:from-brand-900/30">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" className="mb-4 h-16 w-16 drop-shadow-xl" />
          <h1 className="text-2xl font-semibold tracking-tight">FinKJ</h1>
          <p className="text-sm text-muted">Jullie privé budget-app</p>
        </div>

        <div className="card p-6">
          {mfa ? (
            <form onSubmit={submitCode} className="space-y-4">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck size={20} className="text-brand-500" /> Tweestapsverificatie
              </div>
              <p className="text-sm text-muted">Geef de 6-cijferige code uit je authenticator-app.</p>
              <input
                ref={codeRef}
                className="input text-center text-2xl font-semibold tracking-[0.5em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                aria-label="Verificatiecode"
              />
              {error && <p className="text-sm font-medium text-expense">{error}</p>}
              <button className="btn btn-primary w-full" disabled={busy || code.length !== 6 || cooldown.remaining > 0}>
                {cooldown.remaining ? `Wacht ${cooldown.remaining}s` : busy ? 'Controleren…' : 'Bevestigen'}
              </button>
              <button type="button" className="btn btn-ghost w-full" onClick={() => signOut()}>
                Annuleren
              </button>
            </form>
          ) : (
            <form onSubmit={submitPassword} className="space-y-4">
              <Field label="E-mailadres">
                <input
                  type="email"
                  className="input"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Wachtwoord">
                <input
                  type="password"
                  className="input"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Field>
              {error && <p className="text-sm font-medium text-expense">{error}</p>}
              <button className="btn btn-primary w-full" disabled={busy || cooldown.remaining > 0}>
                <KeyRound size={17} />
                {cooldown.remaining ? `Wacht ${cooldown.remaining}s` : busy ? 'Bezig…' : 'Inloggen'}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Lock size={12} /> Versleutelde verbinding · enkel voor Jonas &amp; Kim
        </p>
      </div>
    </div>
  )
}
