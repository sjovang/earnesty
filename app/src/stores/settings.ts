import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type Theme = 'light' | 'dark' | 'whimsical'
export type Font = 'serif' | 'sans-serif' | 'comic-sans'

export const FONT_SIZES = [18, 24, 30] as const
export const CONTENT_WIDTHS = [50, 60, 70] as const

export function fontFamilyFor(font: Font): string {
  switch (font) {
    case 'sans-serif': return 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'
    case 'comic-sans': return '\'Comic Sans MS\', \'Comic Sans\', cursive'
    default:           return '\'Lora\', Georgia, \'Times New Roman\', serif'
  }
}

/* ── Whimsical colour palettes ─────────────────────────────────────────── */
const WHIMSICAL_PALETTES = [
  {
    name: 'pink',
    vars: {
      '--ctp-text': '#f5bde6', '--ctp-subtext1': '#f0c6c6', '--ctp-subtext0': '#eed49f',
      '--ctp-overlay2': '#c6a0f6', '--ctp-overlay1': '#b7bdf8', '--ctp-overlay0': '#8aadf4',
      '--ctp-surface2': '#494d64', '--ctp-surface1': '#363a4f', '--ctp-surface0': '#4a1f3a',
      '--ctp-base': '#361428', '--ctp-mantle': '#2a0e1f', '--ctp-crust': '#1f0816',
    },
  },
  {
    name: 'lavender',
    vars: {
      '--ctp-text': '#c6b4f8', '--ctp-subtext1': '#b7a5e8', '--ctp-subtext0': '#dab8f0',
      '--ctp-overlay2': '#9d8ec8', '--ctp-overlay1': '#8a7db8', '--ctp-overlay0': '#776daa',
      '--ctp-surface2': '#3e3060', '--ctp-surface1': '#312550', '--ctp-surface0': '#271d42',
      '--ctp-base': '#1e1535', '--ctp-mantle': '#160f2a', '--ctp-crust': '#100a20',
    },
  },
  {
    name: 'mint',
    vars: {
      '--ctp-text': '#8be0cc', '--ctp-subtext1': '#91d7e3', '--ctp-subtext0': '#a6e4b8',
      '--ctp-overlay2': '#6db8a8', '--ctp-overlay1': '#5da89a', '--ctp-overlay0': '#4d988c',
      '--ctp-surface2': '#2a4d48', '--ctp-surface1': '#20403a', '--ctp-surface0': '#18352e',
      '--ctp-base': '#0e2822', '--ctp-mantle': '#081e19', '--ctp-crust': '#041510',
    },
  },
  {
    name: 'sunset',
    vars: {
      '--ctp-text': '#f5b07f', '--ctp-subtext1': '#eed49f', '--ctp-subtext0': '#f0c6a0',
      '--ctp-overlay2': '#d49870', '--ctp-overlay1': '#c48a62', '--ctp-overlay0': '#b47c55',
      '--ctp-surface2': '#4d3322', '--ctp-surface1': '#40291a', '--ctp-surface0': '#352012',
      '--ctp-base': '#2a180c', '--ctp-mantle': '#201008', '--ctp-crust': '#180a04',
    },
  },
  {
    name: 'ocean',
    vars: {
      '--ctp-text': '#8ab8f4', '--ctp-subtext1': '#91c4e3', '--ctp-subtext0': '#a0b8f0',
      '--ctp-overlay2': '#7098d0', '--ctp-overlay1': '#6088c0', '--ctp-overlay0': '#5078b0',
      '--ctp-surface2': '#2a3550', '--ctp-surface1': '#202c44', '--ctp-surface0': '#182438',
      '--ctp-base': '#0e1a2e', '--ctp-mantle': '#081222', '--ctp-crust': '#040c18',
    },
  },
] as const

type PaletteVarKey = keyof (typeof WHIMSICAL_PALETTES)[number]['vars']
const ALL_PALETTE_VARS: PaletteVarKey[] = [
  ...new Set(WHIMSICAL_PALETTES.flatMap((p) => Object.keys(p.vars))),
] as PaletteVarKey[]

function applyWhimsicalPalette() {
  const palette = WHIMSICAL_PALETTES[Math.floor(Math.random() * WHIMSICAL_PALETTES.length)]!
  const el = document.documentElement
  for (const [prop, value] of Object.entries(palette.vars)) {
    el.style.setProperty(prop, value)
  }
}

function clearWhimsicalPalette() {
  const el = document.documentElement
  for (const prop of ALL_PALETTE_VARS) {
    el.style.removeProperty(prop)
  }
}

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

  // Apply a random whimsical palette on init if already in whimsical mode
  if (settings.value.theme === 'whimsical') {
    applyWhimsicalPalette()
  }

  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
      document.documentElement.setAttribute('data-theme', val.theme)
    },
    { deep: true, immediate: true },
  )

  let fontBeforeWhimsical: Font | null = null

  function setTheme(theme: Theme) {
    if (theme === 'whimsical') {
      fontBeforeWhimsical = settings.value.font
      settings.value.font = 'comic-sans'
      applyWhimsicalPalette()
    } else {
      if (settings.value.theme === 'whimsical' && fontBeforeWhimsical) {
        settings.value.font = fontBeforeWhimsical
        fontBeforeWhimsical = null
      }
      clearWhimsicalPalette()
    }
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

  return { settings, setTheme, setFontSize, setLineSpacing, setFont, setContentWidth }
})
