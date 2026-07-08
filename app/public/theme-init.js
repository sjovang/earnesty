;(function () {
  try {
    var settings = JSON.parse(globalThis.localStorage?.getItem('ernesty:settings') || '{}')
    globalThis.document?.documentElement?.setAttribute('data-theme', settings.theme || 'dark')
  } catch {
    globalThis.document?.documentElement?.setAttribute('data-theme', 'dark')
  }
})()
