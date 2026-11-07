import { useState } from 'react'
import { Info, Palette, UserRound } from 'lucide-react'
import { Card, CardHeader, Field, PageHeader, Segmented, Switch } from '../components/ui'
import SecuritySettings from '../components/settings/SecuritySettings'
import ListSettings from '../components/settings/ListSettings'
import DataSettings from '../components/settings/DataSettings'
import InstallCard from '../components/InstallCard'
import { useAuth } from '../context/AuthContext'
import { usePrefs } from '../context/PrefsContext'
import { useToast } from '../context/ToastContext'
import { useMembers } from '../hooks/useData'
import * as api from '../lib/api'

function ProfileCard() {
  const { user } = useAuth()
  const { me } = useMembers()
  const { toast, showError } = useToast()
  const [name, setName] = useState(null)
  const value = name ?? me?.display_name ?? ''

  async function save(e) {
    e.preventDefault()
    if (!value.trim()) return
    try {
      await api.updateDisplayName(user.id, value)
      setName(null)
      toast('Naam opgeslagen')
    } catch (error) {
      showError(error)
    }
  }

  return (
    <Card className="p-5">
      <CardHeader title="Profiel" subtitle={user?.email} icon={UserRound} />
      <form onSubmit={save} className="flex items-end gap-2">
        <Field label="Weergavenaam" className="flex-1">
          <input className="input" maxLength={40} value={value} onChange={(e) => setName(e.target.value)} />
        </Field>
        <button className="btn btn-primary" disabled={name === null || !value.trim()}>
          Opslaan
        </button>
      </form>
    </Card>
  )
}

function AppearanceCard() {
  const { theme, setTheme, privacy, setPrivacy } = usePrefs()
  return (
    <Card className="p-5">
      <CardHeader title="Weergave" icon={Palette} />
      <div className="space-y-4">
        <Segmented
          className="w-full"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'light', label: 'Licht' },
            { value: 'dark', label: 'Donker' },
            { value: 'system', label: 'Automatisch' },
          ]}
        />
        <Switch
          checked={privacy}
          onChange={setPrivacy}
          label="Bedragen verbergen"
          description="Handig op de trein of als iemand meekijkt. Tik op een bedrag om het even te zien."
        />
      </div>
    </Card>
  )
}

export default function Settings() {
  return (
    <div className="space-y-5">
      <PageHeader title="Instellingen" />
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <ProfileCard />
          <SecuritySettings />
          <AppearanceCard />
          <InstallCard />
        </div>
        <div className="space-y-5">
          <ListSettings />
          <DataSettings />
        </div>
      </div>
      <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted">
        <Info size={12} /> FinKJ {__APP_VERSION__} · je gegevens staan versleuteld in jullie eigen Supabase-project
      </p>
    </div>
  )
}
