<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import { useSettingsStore, fontFamilyFor, FONT_SIZES, CONTENT_WIDTHS, type Theme, type Font } from '../stores/settings'

defineEmits<{ close: [] }>()

const store = useSettingsStore()

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
</script>

<template>
  <BaseModal
    title="Settings"
    @close="$emit('close')"
  >
    <div class="settings">
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
    </div>
  </BaseModal>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings__row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.settings__label {
  flex-shrink: 0;
  width: 5.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--ctp-subtext0);
  text-align: right;
}

.settings__choices {
  display: flex;
  gap: 0.3rem;
}

.settings__btn {
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.82rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.settings__btn:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
  border-color: var(--ctp-surface2);
}

.settings__btn--active {
  background: var(--ctp-mauve);
  border-color: var(--ctp-mauve);
  color: var(--ctp-base);
  font-weight: 600;
}

.settings__btn--active:hover {
  background: var(--ctp-mauve);
  color: var(--ctp-base);
  border-color: var(--ctp-mauve);
}
</style>
