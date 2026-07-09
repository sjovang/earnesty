import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from '../settings'
import { runtimeConfig } from '../../config/runtime'

const SETTINGS_KEY = `${runtimeConfig.app.storageNamespace}:settings`

function makeStorage() {
  const values = new Map<string, string>()
  return {
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((_index: number) => null),
    removeItem: vi.fn((key: string) => void values.delete(key)),
    setItem: vi.fn((key: string, value: string) => void values.set(key, value)),
    get length() {
      return values.size
    },
  }
}

describe('settings store proofreading controls', () => {
  const storage = makeStorage()

  beforeEach(() => {
    setActivePinia(createPinia())
    storage.clear()
    vi.stubGlobal('localStorage', storage)
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
    document.documentElement.removeAttribute('data-theme')
  })

  it('uses native proofreading defaults', () => {
    const store = useSettingsStore()

    expect(store.settings.theme).toBe('system')
    expect(store.settings.font).toBe('serif')
    expect(store.settings.proofreadingMode).toBe('native')
    expect(store.settings.spellcheck).toBe(true)
    expect(store.settings.autocorrect).toBe('on')
    expect(store.settings.writingSuggestions).toBe(true)
    expect(store.settings.editorLanguage).toBe('en')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('normalizes missing proofreading fields from stored settings', () => {
    storage.setItem(SETTINGS_KEY, JSON.stringify({
      theme: 'whimsical',
      fontSize: 30,
      lineSpacing: 1.4,
      font: 'comic-sans',
      contentWidth: 70,
    }))

    const store = useSettingsStore()
    expect(store.settings.theme).toBe('system')
    expect(store.settings.font).toBe('serif')
    expect(store.settings.proofreadingMode).toBe('native')
    expect(store.settings.editorLanguage).toBe('en')
  })

  it('persists proofreading changes', async () => {
    const store = useSettingsStore()
    store.setProofreadingMode('advanced')
    store.setSpellcheck(false)
    store.setAutocorrect('off')
    store.setWritingSuggestions(false)
    store.setEditorLanguage('fr')
    await Promise.resolve()

    const raw = storage.getItem(SETTINGS_KEY)
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw ?? '{}') as Record<string, unknown>
    expect(parsed['proofreadingMode']).toBe('advanced')
    expect(parsed['spellcheck']).toBe(false)
    expect(parsed['autocorrect']).toBe('off')
    expect(parsed['writingSuggestions']).toBe(false)
    expect(parsed['editorLanguage']).toBe('fr')
  })
})
