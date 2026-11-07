import { Database, ShieldAlert, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const CONTENT = {
  unconfigured: {
    icon: Wrench,
    title: 'App nog niet geconfigureerd',
    text: 'VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY ontbreken. Zet ze in .env (lokaal) of als GitHub Secrets.',
  },
  setup: {
    icon: Database,
    title: 'Database nog niet ingericht',
    text: 'Voer docs/sql/schema.sql uit in de Supabase SQL Editor en probeer opnieuw.',
  },
  denied: {
    icon: ShieldAlert,
    title: 'Geen toegang',
    text: 'Je bent aangemeld, maar dit account is geen lid van het huishouden. Vraag om toegevoegd te worden (zie docs/SETUP.md).',
  },
}

export default function StatusScreen({ status }) {
  const { signOut, recheck } = useAuth()
  const c = CONTENT[status] || CONTENT.denied
  const Icon = c.icon
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5">
      <div className="card max-w-md p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15">
          <Icon size={26} />
        </span>
        <h1 className="mb-2 text-xl font-semibold">{c.title}</h1>
        <p className="mb-6 text-sm text-muted">{c.text}</p>
        {status !== 'unconfigured' && (
          <div className="flex justify-center gap-2">
            <button className="btn btn-secondary" onClick={() => signOut()}>
              Uitloggen
            </button>
            <button className="btn btn-primary" onClick={() => recheck()}>
              Opnieuw proberen
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
