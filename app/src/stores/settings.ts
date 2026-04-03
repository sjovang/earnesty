import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'whimsical'
export type Font = 'serif' | 'sans-serif' | 'comic-sans'

export const FONT_SIZES = [18, 24, 30] as const
export const CONTENT_WIDTHS = [50, 60, 70] as const

const STORAGE_KEY = 'ernesty:settings'

interface Settings {
  theme: Theme
  fontSize: number
  lineSpacing: number
  font: Font
  contentWidth: number
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultSettings(), ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    // ignore
  }
  return defaultSettings()
}

function defaultSettings(): Settings {
  return { theme: 'dark', fontSize: 24, lineSpacing: 1.7, font: 'serif', contentWidth: 60 }
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(loadSettings())

  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      document.documentElement.setAttribute('data-theme', val.theme)
    },
    { deep: true, immediate: true },
  )

  function setTheme(theme: Theme) {
    settings.value.theme = theme
    if (theme === 'whimsical') {
      settings.value.font = 'comic-sans'
    }
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

  return { settings, setTheme, setFontSize, setLineSpacing, setFont, setContentWidth }
})
