export function friendlyError(error, fallback = 'Er ging iets mis. Probeer opnieuw.') {
  if (!error) return fallback
  const message = String(error.message || '').toLowerCase()

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return 'Je bent offline. Wijzigingen kunnen pas opgeslagen worden als je terug verbinding hebt.'
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'Geen verbinding met de server. Controleer je internetverbinding.'
  }
  if (error.code === '23505') return 'Dit bestaat al (zelfde naam of combinatie).'
  if (error.code === '23503') return 'Een gekoppeld item bestaat niet (meer).'
  if (error.code === '23514') return 'Een van de waarden is ongeldig of te lang.'
  if (error.code === '42501' || message.includes('row-level security')) {
    return 'Je hebt geen toestemming voor deze actie.'
  }
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return 'De database is nog niet ingericht. Voer docs/sql/schema.sql uit in Supabase.'
  }
  if (error.code === 'P0001' && error.message) return error.message
  if (message.includes('jwt') || message.includes('session')) {
    return 'Je sessie is verlopen. Meld je opnieuw aan.'
  }
  if (message.includes('payload too large') || message.includes('maximum allowed size')) {
    return 'Bestand is te groot (max. 5 MB).'
  }
  return fallback
}
