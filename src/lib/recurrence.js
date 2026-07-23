export function addInterval(dateString, interval) {
  const date = new Date(dateString + 'T00:00:00')
  if (interval === 'weekly') {
    date.setDate(date.getDate() + 7)
  } else if (interval === 'monthly') {
    date.setMonth(date.getMonth() + 1)
  } else if (interval === 'yearly') {
    date.setFullYear(date.getFullYear() + 1)
  }
  return date.toISOString().slice(0, 10)
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}
