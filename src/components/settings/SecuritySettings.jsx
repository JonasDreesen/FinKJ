import { useEffect, useRef, useState } from 'react'
import { KeyRound, LogOut, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react'
import { Card, CardHeader, Field, Sheet } from '../ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

function passwordProblem(password, email) {
  if (password.length < 12) return 'Minstens 12 tekens.'
  if (email && password.toLowerCase().includes(email.split('@')[0].toLowerCase())) return 'Gebruik je e-mailadres niet in je wachtwoord.'
  if (/^(.)\1+$/.test(password)) return 'Te voorspelbaar.'
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length
  if (password.length < 16 && classes < 3) return 'Combineer hoofdletters, kleine letters, cijfers of tekens — of kies een langere zin.'
  return null
}

// Supabase geeft de QR-code als niet-gecodeerde SVG-data-URL; tekens als "#"
// breken die in de browser. Daarom de SVG zelf correct coderen.
function qrSource(qr) {
  if (!qr) return ''
  const start = qr.indexOf('<svg')
  if (start === -1) return qr
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr.slice(start))}`
}

function PasswordSheet({ onClose }) {
  const { user } = useAuth()
  const { toast, showError } = useToast()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const problem = password ? passwordProblem(password, user.email) : null

  async function submit(e) {
    e.preventDefault()
    if (problem || password !== confirm) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) {
      const msg = String(error.message).toLowerCase()
      if (msg.includes('reauthentic') || msg.includes('recent')) {
        showError(null, 'Uit veiligheid moet je opnieuw inloggen voor je je wachtwoord kan wijzigen.')
      } else if (msg.includes('same') || msg.includes('different')) {
        showError(null, 'Kies een ander wachtwoord dan je huidige.')
      } else if (msg.includes('weak') || msg.includes('pwned') || msg.includes('leaked')) {
        showError(null, 'Dit wachtwoord is te zwak of kwam voor in een datalek. Kies een ander.')
      } else {
        showError(error, 'Wachtwoord wijzigen mislukt.')
      }
      return
    }
    toast('Wachtwoord gewijzigd')
    onClose()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Wachtwoord wijzigen"
      footer={
        <button form="pw-form" className="btn btn-primary w-full" disabled={busy || Boolean(problem) || password !== confirm || !password}>
          Opslaan
        </button>
      }
    >
      <form id="pw-form" onSubmit={submit} className="space-y-4">
        <Field label="Nieuw wachtwoord" error={problem}>
          <input type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field label="Herhaal" error={confirm && confirm !== password ? 'Komt niet overeen.' : null}>
          <input type="password" className="input" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <p className="text-xs text-muted">Tip: een lange zin van 4+ woorden is sterk én makkelijk te onthouden. Een wachtwoordbeheerder is nog beter.</p>
      </form>
    </Sheet>
  )
}

function EnrollSheet({ onClose, onDone }) {
  const { showError, toast } = useToast()
  const [factor, setFactor] = useState(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: list } = await supabase.auth.mfa.listFactors()
      for (const f of list?.all || []) {
        if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `FinKJ ${new Date().toISOString().slice(0, 16)}`,
      })
      if (cancelled) return
      if (error) {
        showError(error, 'Tweestapsverificatie starten mislukt. Staat MFA aan in Supabase?')
        closeRef.current()
      } else setFactor(data)
    })()
    return () => {
      cancelled = true
    }
  }, [showError])

  async function verify(e) {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code })
    setBusy(false)
    if (error) {
      setCode('')
      return showError(null, 'Code klopt niet. Controleer de tijd op je gsm en probeer opnieuw.')
    }
    toast('Tweestapsverificatie staat aan')
    onDone()
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title="Tweestapsverificatie instellen"
      footer={
        <button form="mfa-form" className="btn btn-primary w-full" disabled={!factor || code.length !== 6 || busy}>
          Activeren
        </button>
      }
    >
      {!factor ? (
        <p className="py-8 text-center text-sm text-muted">Even geduld…</p>
      ) : (
        <form id="mfa-form" onSubmit={verify} className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
            <li>Open een authenticator-app (bv. Google Authenticator, Microsoft Authenticator, 1Password).</li>
            <li>Scan deze QR-code, of voer de sleutel handmatig in.</li>
            <li>Typ de 6-cijferige code die verschijnt.</li>
          </ol>
          <div className="flex justify-center rounded-3xl bg-white p-4">
            <img src={qrSource(factor.totp.qr_code)} alt="QR-code voor je authenticator-app" className="h-48 w-48" />
          </div>
          <p className="break-all rounded-2xl bg-surface-2 p-3 text-center font-mono text-xs">{factor.totp.secret}</p>
          <input
            className="input text-center text-2xl font-semibold tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            aria-label="Verificatiecode"
          />
        </form>
      )}
    </Sheet>
  )
}

export default function SecuritySettings() {
  const { signOut } = useAuth()
  const { toast, showError } = useToast()
  const [factors, setFactors] = useState(null)
  const [sheet, setSheet] = useState(null)

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors((data?.totp || []).filter((f) => f.status === 'verified'))
  }

  useEffect(() => {
    loadFactors()
  }, [])

  async function disableMfa() {
    if (!window.confirm('Tweestapsverificatie uitschakelen? Je account is dan enkel nog beschermd met je wachtwoord.')) return
    for (const f of factors) {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
      if (error) return showError(error, 'Uitschakelen mislukt.')
    }
    await supabase.auth.refreshSession()
    toast('Tweestapsverificatie uitgeschakeld')
    loadFactors()
  }

  const enabled = factors?.length > 0

  return (
    <Card className="p-5">
      <CardHeader title="Beveiliging" icon={ShieldCheck} />
      <ul className="divide-y divide-line/60">
        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-start gap-3">
            <Smartphone size={18} className={`mt-0.5 shrink-0 ${enabled ? 'text-income' : 'text-muted'}`} />
            <div>
              <p className="text-sm font-medium">Tweestapsverificatie</p>
              <p className="text-xs text-muted">
                {factors === null ? '…' : enabled ? 'Aan — een code uit je app is nodig bij het inloggen.' : 'Uit — sterk aangeraden voor financiële gegevens.'}
              </p>
            </div>
          </div>
          {factors !== null &&
            (enabled ? (
              <button className="btn btn-ghost btn-sm text-expense" onClick={disableMfa}>
                <ShieldOff size={15} /> Uit
              </button>
            ) : (
              <button className="btn btn-primary btn-sm" onClick={() => setSheet('mfa')}>
                Instellen
              </button>
            ))}
        </li>
        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-start gap-3">
            <KeyRound size={18} className="mt-0.5 shrink-0 text-muted" />
            <p className="text-sm font-medium">Wachtwoord</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => setSheet('password')}>
            Wijzigen
          </button>
        </li>
        <li className="flex items-center justify-between gap-3 py-3">
          <div className="flex items-start gap-3">
            <LogOut size={18} className="mt-0.5 shrink-0 text-muted" />
            <div>
              <p className="text-sm font-medium">Overal uitloggen</p>
              <p className="text-xs text-muted">Bv. als je een toestel verloren bent.</p>
            </div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => {
              if (window.confirm('Uitloggen op al je toestellen?')) signOut({ everywhere: true })
            }}
          >
            Uitloggen
          </button>
        </li>
      </ul>

      {sheet === 'password' && <PasswordSheet onClose={() => setSheet(null)} />}
      {sheet === 'mfa' && (
        <EnrollSheet
          onClose={() => setSheet(null)}
          onDone={() => {
            setSheet(null)
            loadFactors()
          }}
        />
      )}
    </Card>
  )
}
