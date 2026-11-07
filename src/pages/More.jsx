import { Link } from 'react-router-dom'
import { BookOpen, ChevronRight, Eye, EyeOff, HandCoins, LineChart, LogOut, Settings } from 'lucide-react'
import { Card, PageHeader } from '../components/ui'
import InstallCard from '../components/InstallCard'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useMembers } from '../hooks/useData'

const LINKS = [
  { to: '/samen', icon: HandCoins, title: 'Samen', text: 'Gedeelde balans en afrekenen', color: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  { to: '/beleggingen', icon: LineChart, title: 'Beleggingen', text: 'Je privé portefeuille', color: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300' },
  { to: '/advies', icon: BookOpen, title: 'Budgetadvies', text: 'Hoe verdeel je je inkomen?', color: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  { to: '/instellingen', icon: Settings, title: 'Instellingen', text: 'Categorieën, beveiliging, gegevens', color: 'bg-surface-2 text-muted' },
]

export default function More() {
  const { signOut, user } = useAuth()
  const { me } = useMembers()
  const { privacy, togglePrivacy } = usePrefs()

  return (
    <div className="space-y-5">
      <PageHeader title="Meer" subtitle={me ? `${me.display_name} · ${user.email}` : user.email} />
      <Card className="p-2">
        <ul>
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-surface-2">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${l.color}`}>
                  <l.icon size={21} />
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{l.title}</span>
                  <span className="block text-xs text-muted">{l.text}</span>
                </span>
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-2">
        <button onClick={togglePrivacy} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-surface-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-surface-2 text-muted">
            {privacy ? <EyeOff size={21} /> : <Eye size={21} />}
          </span>
          <span className="flex-1 font-medium">{privacy ? 'Bedragen tonen' : 'Bedragen verbergen'}</span>
        </button>
        <button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-expense hover:bg-expense/10">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-expense/10">
            <LogOut size={21} />
          </span>
          <span className="flex-1 font-medium">Uitloggen</span>
        </button>
      </Card>
      <InstallCard />
    </div>
  )
}
