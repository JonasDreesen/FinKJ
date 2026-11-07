import { Paperclip, Repeat, Users } from 'lucide-react'
import { CategoryIcon, Money } from './ui'

export default function TransactionRow({ t, category, nameOf, onClick, showDate = false }) {
  const income = t.type === 'income'
  return (
    <li>
      <button
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface-2 active:bg-surface-2"
      >
        <CategoryIcon category={category} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[15px] font-medium">{t.description || category?.name || 'Zonder omschrijving'}</span>
            {t.pending_review && <span className="chip shrink-0 bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">Te bevestigen</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
            {showDate && <span>{t.occurred_on.split('-').reverse().slice(0, 2).join('/')} ·</span>}
            <span className="truncate">{category?.name || 'Zonder categorie'}</span>
            {t.is_shared && (
              <span className="inline-flex items-center gap-0.5 text-violet-600 dark:text-violet-300">
                <Users size={12} /> {nameOf ? nameOf(t.paid_by || t.user_id) : 'gedeeld'}
              </span>
            )}
            {t.parent_transaction_id && <Repeat size={12} />}
            {t.receipt_path && <Paperclip size={12} />}
          </span>
        </span>
        <Money
          amount={income ? t.amount : -t.amount}
          sign
          className={`shrink-0 text-[15px] font-semibold ${income ? 'text-income' : ''}`}
        />
      </button>
    </li>
  )
}
