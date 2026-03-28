import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'ernesty:settings'

interface Settings {
  theme: Theme
  fontSize: number
  lineSpacing: number
}

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Settings
  } catch {
    // ignore
  }
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return { theme: prefersDark ? 'dark' : 'light', fontSize: 16, lineSpacing: 1.7 }
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
  }

  function setFontSize(size: number) {
    settings.value.fontSize = size
  }

  function setLineSpacing(spacing: number) {
    settings.value.lineSpacing = spacing
  }

  return { settings, setTheme, setFontSize, setLineSpacing }
})
