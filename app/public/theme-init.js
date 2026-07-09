;(function () {
  function resolveTheme(theme) {
    if (theme === 'light' || theme === 'dark') return theme
    try {
      if (globalThis.matchMedia && globalThis.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark'
      }
    } catch {
      return 'light'
    }
    return 'light'
  }

  function readSettings() {
    var storage = globalThis.localStorage
    if (!storage) return {}

    var knownKeys = ['earnesty:settings', 'ernesty:settings']
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i)
      if (typeof key === 'string' && /:settings$/.test(key) && knownKeys.indexOf(key) === -1) {
        knownKeys.unshift(key)
      }
    }

    for (var j = 0; j < knownKeys.length; j++) {
      var raw = storage.getItem(knownKeys[j])
      if (!raw) continue
      try {
        var parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') return parsed
      } catch {
        continue
      }
    }

    return {}
  }

  try {
    var settings = readSettings()
    globalThis.document?.documentElement?.setAttribute('data-theme', resolveTheme(settings.theme))
  } catch {
    globalThis.document?.documentElement?.setAttribute('data-theme', 'light')
  }
})()
