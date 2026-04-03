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
      <!-- Theme -->
      <section class="settings__section">
        <h3 class="settings__label">
          Theme
        </h3>
        <div
          class="settings__pill-group"
          role="group"
          aria-label="Theme"
        >
          <button
            v-for="t in themes"
            :key="t.value"
            :class="['settings__pill', { 'settings__pill--active': store.settings.theme === t.value }]"
            @click="store.setTheme(t.value)"
          >
            {{ t.label }}
          </button>
        </div>
      </section>

      <!-- Font size -->
      <section class="settings__section">
        <h3 class="settings__label">
          Font size
        </h3>
        <div
          class="settings__pill-group"
          role="group"
          aria-label="Font size"
        >
          <button
            v-for="size in FONT_SIZES"
            :key="size"
            :class="['settings__pill', { 'settings__pill--active': store.settings.fontSize === size }]"
            @click="store.setFontSize(size)"
          >
            {{ fontSizeLabels[size] }}
          </button>
        </div>
      </section>

      <!-- Font -->
      <section class="settings__section">
        <h3 class="settings__label">
          Font
        </h3>
        <div
          class="settings__pill-group"
          role="group"
          aria-label="Font"
        >
          <button
            v-for="f in fonts"
            :key="f.value"
            :class="['settings__pill', { 'settings__pill--active': store.settings.font === f.value }]"
            :style="{ fontFamily: fontFamilyFor(f.value) }"
            @click="store.setFont(f.value)"
          >
            {{ f.label }}
          </button>
        </div>
      </section>

      <!-- Content width -->
      <section class="settings__section">
        <h3 class="settings__label">
          Content width
        </h3>
        <div
          class="settings__pill-group"
          role="group"
          aria-label="Content width"
        >
          <button
            v-for="w in CONTENT_WIDTHS"
            :key="w"
            :class="['settings__pill', { 'settings__pill--active': store.settings.contentWidth === w }]"
            @click="store.setContentWidth(w)"
          >
            {{ widthLabels[w] }}
          </button>
        </div>
      </section>
    </div>
  </BaseModal>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings__section {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.settings__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ctp-subtext0);
}

.settings__pill-group {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.settings__pill {
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--ctp-surface1);
  border-radius: 20px;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}

.settings__pill:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
  border-color: var(--ctp-surface2);
}

.settings__pill--active {
  background: var(--ctp-mauve);
  border-color: var(--ctp-mauve);
  color: var(--ctp-base);
  font-weight: 600;
}

.settings__pill--active:hover {
  background: var(--ctp-mauve);
  color: var(--ctp-base);
  border-color: var(--ctp-mauve);
}
</style>
