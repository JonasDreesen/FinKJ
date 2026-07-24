export function friendlyError(error, fallback) {
  if (!error) return fallback
  if (error.code === '23505') return 'Deze naam of combinatie bestaat al.'
  if (error.code === '23503') return 'Kon niet opslaan: een gekoppeld item bestaat niet (meer).'
  if (error.message?.toLowerCase().includes('failed to fetch')) {
    return 'Geen verbinding met de server. Controleer je internetverbinding.'
  }
  return fallback
}
