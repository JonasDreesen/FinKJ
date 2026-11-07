import { CheckCircle2, Download, Share, SquarePlus } from 'lucide-react'
import { Card, CardHeader } from './ui'
import { useInstallPrompt } from '../lib/pwa'

export default function InstallCard() {
  const { installed, canPrompt, ios, prompt } = useInstallPrompt()

  return (
    <Card className="p-5">
      <CardHeader title="App op je gsm" icon={Download} />
      {installed ? (
        <p className="flex items-center gap-2 text-sm text-income">
          <CheckCircle2 size={17} /> Je gebruikt FinKJ als geïnstalleerde app.
        </p>
      ) : canPrompt ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">Installeer FinKJ op je beginscherm: opent als een echte app, zonder adresbalk, ook offline.</p>
          <button className="btn btn-primary" onClick={prompt}>
            <Download size={17} /> Installeren
          </button>
        </div>
      ) : ios ? (
        <ol className="space-y-2 text-sm text-muted">
          <li className="flex items-center gap-2">
            1. Open deze pagina in <strong className="text-ink">Safari</strong>.
          </li>
          <li className="flex items-center gap-2">
            2. Tik op <Share size={16} className="text-brand-500" /> <strong className="text-ink">Deel</strong>.
          </li>
          <li className="flex items-center gap-2">
            3. Kies <SquarePlus size={16} className="text-brand-500" /> <strong className="text-ink">Zet op beginscherm</strong>.
          </li>
        </ol>
      ) : (
        <p className="text-sm text-muted">
          Open het browsermenu (⋮) en kies <strong className="text-ink">App installeren</strong> of{' '}
          <strong className="text-ink">Toevoegen aan startscherm</strong>.
        </p>
      )}
    </Card>
  )
}
