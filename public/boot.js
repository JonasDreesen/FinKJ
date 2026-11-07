// Draait vóór de app: juiste thema meteen (geen witte flits) en weigeren om
// in een iframe van een andere site getoond te worden (clickjacking).
;(function () {
  if (window.top !== window.self) {
    document.documentElement.style.display = 'none'
    throw new Error('FinKJ mag niet in een frame geladen worden.')
  }
  var theme = 'system'
  try {
    theme = localStorage.getItem('finkj:theme') || 'system'
  } catch {
    theme = 'system'
  }
  var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
})()
