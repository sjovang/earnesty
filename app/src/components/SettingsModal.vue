<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import {
  useSettingsStore,
  fontFamilyFor,
  FONT_SIZES,
  CONTENT_WIDTHS,
  type Theme,
  type Font,
  type ProofreadingMode,
  type AutocorrectSetting,
} from '../stores/settings'
import { useAuthStore } from '../stores/auth'

defineEmits<{ close: [] }>()

const store = useSettingsStore()
const auth = useAuthStore()

const themes: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'whimsical', label: 'Whimsical' },
]

const fonts: { value: Font; label: string }[] = [
  { value: 'serif', label: 'Serif' },
  { value: 'sans-serif', label: 'Sans-serif' },
  { value: 'comic-sans', label: 'Comic Sans' },
]

const fontSizeLabels: Record<number, string> = {
  [FONT_SIZES[0]]: 'Small',
  [FONT_SIZES[1]]: 'Medium',
  [FONT_SIZES[2]]: 'Large',
}

const widthLabels: Record<number, string> = {
  [CONTENT_WIDTHS[0]]: 'Narrow',
  [CONTENT_WIDTHS[1]]: 'Normal',
  [CONTENT_WIDTHS[2]]: 'Wide',
}

const proofreadingModes: { value: ProofreadingMode; label: string }[] = [
  { value: 'off', label: 'Off' },
  { value: 'native', label: 'Native' },
  { value: 'advanced', label: 'Advanced' },
]

const onOffOptions: { value: boolean; label: string }[] = [
  { value: true, label: 'On' },
  { value: false, label: 'Off' },
]

const autocorrectOptions: { value: AutocorrectSetting; label: string }[] = [
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
]

const editorLanguages: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
]

function isProofreadingModeDisabled(mode: ProofreadingMode): boolean {
  return mode === 'advanced' && !auth.isAuthenticated
}
</script>

<template>
  <BaseModal
    title="Settings"
    @close="$emit('close')"
  >
    <div class="settings">
      <section class="settings__section">
        <h3 class="settings__section-title">
          UI and theme
        </h3>

        <div class="settings__row">
          <span class="settings__label">Theme</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Theme"
          >
            <button
              v-for="t in themes"
              :key="t.value"
              :class="['settings__btn', { 'settings__btn--active': store.settings.theme === t.value }]"
              @click="store.setTheme(t.value)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Font size</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Font size"
          >
            <button
              v-for="size in FONT_SIZES"
              :key="size"
              :class="['settings__btn', { 'settings__btn--active': store.settings.fontSize === size }]"
              @click="store.setFontSize(size)"
            >
              {{ fontSizeLabels[size] }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Font</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Font"
          >
            <button
              v-for="f in fonts"
              :key="f.value"
              :class="['settings__btn', { 'settings__btn--active': store.settings.font === f.value }]"
              :style="{ fontFamily: fontFamilyFor(f.value) }"
              @click="store.setFont(f.value)"
            >
              {{ f.label }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Width</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Content width"
          >
            <button
              v-for="w in CONTENT_WIDTHS"
              :key="w"
              :class="['settings__btn', { 'settings__btn--active': store.settings.contentWidth === w }]"
              @click="store.setContentWidth(w)"
            >
              {{ widthLabels[w] }}
            </button>
          </div>
        </div>
      </section>

      <section class="settings__section">
        <h3 class="settings__section-title">
          Spellcheck and grammar
        </h3>

        <div class="settings__row">
          <span class="settings__label">Proofreading</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Proofreading mode"
          >
            <button
              v-for="mode in proofreadingModes"
              :key="mode.value"
              :class="[
                'settings__btn',
                { 'settings__btn--active': store.settings.proofreadingMode === mode.value },
                { 'settings__btn--disabled': isProofreadingModeDisabled(mode.value) },
              ]"
              :disabled="isProofreadingModeDisabled(mode.value)"
              @click="store.setProofreadingMode(mode.value)"
            >
              {{ mode.label }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Spellcheck</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Spellcheck"
          >
            <button
              v-for="option in onOffOptions"
              :key="`spell-${option.label}`"
              :class="['settings__btn', { 'settings__btn--active': store.settings.spellcheck === option.value }]"
              @click="store.setSpellcheck(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Autocorrect</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Autocorrect"
          >
            <button
              v-for="option in autocorrectOptions"
              :key="`auto-${option.value}`"
              :class="['settings__btn', { 'settings__btn--active': store.settings.autocorrect === option.value }]"
              @click="store.setAutocorrect(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Suggestions</span>
          <div
            class="settings__choices"
            role="group"
            aria-label="Writing suggestions"
          >
            <button
              v-for="option in onOffOptions"
              :key="`suggest-${option.label}`"
              :class="['settings__btn', { 'settings__btn--active': store.settings.writingSuggestions === option.value }]"
              @click="store.setWritingSuggestions(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="settings__row">
          <span class="settings__label">Language</span>
          <label class="settings__select-wrap">
            <span class="visually-hidden">Editor language</span>
            <select
              class="settings__select"
              :value="store.settings.editorLanguage"
              @change="store.setEditorLanguage(($event.target as HTMLSelectElement).value)"
            >
              <option
                v-for="language in editorLanguages"
                :key="language.value"
                :value="language.value"
              >
                {{ language.label }}
              </option>
            </select>
          </label>
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.visually-hidden {
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  width: 1px;
}

.settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.settings__section-title {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ctp-subtext0);
  text-align: left;
}

.settings__row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.settings__label {
  flex-shrink: 0;
  width: 6.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ctp-subtext0);
  text-align: left;
}

.settings__choices {
  display: flex;
  flex: 1;
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  overflow: hidden;
}

.settings__btn {
  flex: 1;
  padding: 0.3rem 0.75rem;
  border: none;
  border-right: 1px solid var(--ctp-surface1);
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.82rem;
  white-space: nowrap;
  text-align: center;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.settings__btn:last-child {
  border-right: none;
}

.settings__btn:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
}

.settings__btn--active {
  background: var(--ctp-mauve);
  color: var(--ctp-base);
  font-weight: 600;
}

.settings__btn--active:hover {
  background: var(--ctp-mauve);
  color: var(--ctp-base);
}

.settings__btn--disabled,
.settings__btn--disabled:hover,
.settings__btn--disabled.settings__btn--active,
.settings__btn--disabled.settings__btn--active:hover {
  background: color-mix(in srgb, var(--ctp-surface0) 65%, transparent);
  color: var(--ctp-overlay0);
  cursor: not-allowed;
  font-weight: 500;
}

.settings__select-wrap {
  display: flex;
  flex: 1;
}

.settings__select {
  width: 100%;
  min-width: 0;
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  background: transparent;
  color: var(--ctp-text);
  font-size: 0.82rem;
  padding: 0.38rem 0.55rem;
}
</style>
