;(function () {
  try {
    var settings = JSON.parse(localStorage.getItem('ernesty:settings') || '{}')
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark')
  } catch (_error) {
    document.documentElement.setAttribute('data-theme', 'dark')
  }
})()
