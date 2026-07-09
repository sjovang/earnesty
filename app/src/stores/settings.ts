import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { runtimeConfig, type ResolvedTheme } from '../config/runtime'

export type Theme = 'system' | 'light' | 'dark'
export type Font = 'serif' | 'sans-serif' | 'handwriting'
export type ProofreadingMode = 'off' | 'native' | 'advanced'
export type AutocorrectSetting = 'on' | 'off'

export const FONT_SIZES = [18, 24, 30] as const
export const CONTENT_WIDTHS = [50, 60, 70] as const

export function fontFamilyFor(font: Font): string {
  switch (font) {
    case 'sans-serif': return runtimeConfig.appearance.fonts.sansSerif
    case 'handwriting': return runtimeConfig.appearance.fonts.handwriting
    default: return runtimeConfig.appearance.fonts.serif
  }
}

const STORAGE_KEY = `${runtimeConfig.app.storageNamespace}:settings`
const THEME_VARIABLES = [
  ...new Set(
    Object.values(runtimeConfig.appearance.themes)
      .flatMap((theme) => Object.keys(theme.colors)),
  ),
]

interface Settings {
  theme: Theme
  fontSize: number
  lineSpacing: number
  font: Font
  contentWidth: number
  proofreadingMode: ProofreadingMode
  spellcheck: boolean
  autocorrect: AutocorrectSetting
  writingSuggestions: boolean
  editorLanguage: string
}

function defaultSettings(): Settings {
  return {
    theme: 'system',
    fontSize: 24,
    lineSpacing: 1.7,
    font: 'serif',
    contentWidth: 60,
    proofreadingMode: 'native',
    spellcheck: true,
    autocorrect: 'on',
    writingSuggestions: true,
    editorLanguage: 'en',
  }
}

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isFont(value: unknown): value is Font {
  return value === 'serif' || value === 'sans-serif' || value === 'handwriting'
}

function isProofreadingMode(value: unknown): value is ProofreadingMode {
  return value === 'off' || value === 'native' || value === 'advanced'
}

function isAutocorrectSetting(value: unknown): value is AutocorrectSetting {
  return value === 'on' || value === 'off'
}

function normalizeEditorLanguage(value: unknown): string {
  if (typeof value !== 'string') return defaultSettings().editorLanguage
  const trimmed = value.trim()
  if (!trimmed) return defaultSettings().editorLanguage
  return trimmed
}

function normalizeSettings(raw: Partial<Settings> | null | undefined): Settings {
  const defaults = defaultSettings()
  const storedFont = (raw as { font?: unknown } | null | undefined)?.font
  const rawFont = storedFont === 'comical' ? 'handwriting' : storedFont
  return {
    theme: isTheme(raw?.theme) ? raw.theme : defaults.theme,
    fontSize: typeof raw?.fontSize === 'number' ? raw.fontSize : defaults.fontSize,
    lineSpacing: typeof raw?.lineSpacing === 'number' ? raw.lineSpacing : defaults.lineSpacing,
    font: isFont(rawFont) ? rawFont : defaults.font,
    contentWidth: typeof raw?.contentWidth === 'number' ? raw.contentWidth : defaults.contentWidth,
    proofreadingMode: isProofreadingMode(raw?.proofreadingMode) ? raw.proofreadingMode : defaults.proofreadingMode,
    spellcheck: typeof raw?.spellcheck === 'boolean' ? raw.spellcheck : defaults.spellcheck,
    autocorrect: isAutocorrectSetting(raw?.autocorrect) ? raw.autocorrect : defaults.autocorrect,
    writingSuggestions: typeof raw?.writingSuggestions === 'boolean'
      ? raw.writingSuggestions
      : defaults.writingSuggestions,
    editorLanguage: normalizeEditorLanguage(raw?.editorLanguage),
  }
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return normalizeSettings(JSON.parse(raw) as Partial<Settings>)
  } catch {
    // ignore
  }
  return defaultSettings()
}

function supportsSystemTheme(): boolean {
  return typeof window.matchMedia === 'function'
}

function systemPrefersDark(): boolean {
  return supportsSystemTheme() && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme
  return systemPrefersDark() ? 'dark' : 'light'
}

function applyTheme(theme: Theme) {
  const resolvedTheme = resolveTheme(theme)
  const root = document.documentElement
  const themeConfig = runtimeConfig.appearance.themes[resolvedTheme]

  for (const variable of THEME_VARIABLES) {
    root.style.removeProperty(variable)
  }

  for (const [variable, color] of Object.entries(themeConfig.colors)) {
    root.style.setProperty(variable, color)
  }

  root.style.colorScheme = themeConfig.colorScheme
  root.setAttribute('data-theme', resolvedTheme)
  root.setAttribute('data-theme-preference', theme)
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(loadSettings())
  const systemThemeQuery = supportsSystemTheme()
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      applyTheme(val.theme)
    },
    { deep: true, immediate: true },
  )

  const handleSystemThemeChange = () => {
    if (settings.value.theme === 'system') {
      applyTheme('system')
    }
  }

  if (systemThemeQuery) {
    if (typeof systemThemeQuery.addEventListener === 'function') {
      systemThemeQuery.addEventListener('change', handleSystemThemeChange)
    } else if (typeof systemThemeQuery.addListener === 'function') {
      systemThemeQuery.addListener(handleSystemThemeChange)
    }
  }

  function setTheme(theme: Theme) {
    settings.value.theme = theme
  }

  function setFontSize(size: number) {
    settings.value.fontSize = size
  }

  function setLineSpacing(spacing: number) {
    settings.value.lineSpacing = spacing
  }

  function setFont(font: Font) {
    settings.value.font = font
  }

  function setContentWidth(width: number) {
    settings.value.contentWidth = width
  }

  function setProofreadingMode(mode: ProofreadingMode) {
    settings.value.proofreadingMode = mode
  }

  function setSpellcheck(enabled: boolean) {
    settings.value.spellcheck = enabled
  }

  function setAutocorrect(value: AutocorrectSetting) {
    settings.value.autocorrect = value
  }

  function setWritingSuggestions(enabled: boolean) {
    settings.value.writingSuggestions = enabled
  }

  function setEditorLanguage(language: string) {
    settings.value.editorLanguage = normalizeEditorLanguage(language)
  }

  return {
    settings,
    setTheme,
    setFontSize,
    setLineSpacing,
    setFont,
    setContentWidth,
    setProofreadingMode,
    setSpellcheck,
    setAutocorrect,
    setWritingSuggestions,
    setEditorLanguage,
  }
})
