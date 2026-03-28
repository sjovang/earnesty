<script setup lang="ts">
import { ref } from 'vue'
import { useSettingsStore } from '../stores/settings'

const { settings } = useSettingsStore()

const INTRO = `Ernesty is your space for focused writing.

No distractions. No formatting toolbars. Just you and the blank page.

Select any part of this text and start typing to replace it — or click anywhere to place your cursor and begin.`

const content = ref(INTRO)
const editor = ref<HTMLElement | null>(null)
const isIntro = ref(true)

function onInput() {
  if (isIntro.value) {
    isIntro.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '\t')
  }
}
</script>

<template>
  <main
    class="editor"
    :style="{ fontSize: settings.fontSize + 'px', lineHeight: settings.lineSpacing }"
  >
    <div
      ref="editor"
      class="editor__content"
      :class="{ 'editor__content--intro': isIntro }"
      contenteditable="true"
      spellcheck="true"
      @input="onInput"
      @keydown="onKeydown"
    >{{ content }}</div>
  </main>
</template>

<style scoped>
.editor {
  max-width: 680px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  min-height: 100vh;
}

.editor__content {
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: var(--ctp-mauve);
  color: var(--ctp-text);
}

.editor__content--intro {
  color: var(--ctp-subtext0);
}

.editor__content ::selection {
  background-color: var(--ctp-mauve);
  color: var(--ctp-base);
}
</style>
