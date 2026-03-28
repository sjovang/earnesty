<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useSettingsStore } from '../stores/settings'
import { useEditorStore } from '../stores/editor'

const { settings } = useSettingsStore()
const editorStore = useEditorStore()

const INTRO = `Ernesty is your space for focused writing.

No distractions. No formatting toolbars. Just you and the blank page.

Select any part of this text and start typing to replace it — or click anywhere to place your cursor and begin.`

const editor = ref<HTMLElement | null>(null)
const isIntro = ref(true)

// ── Typewriter scroll ─────────────────────────────────────────────────────────
// Target: cursor sits at 2/3 from the top (= 1/3 from the bottom).
const CURSOR_RATIO = 2 / 3

function getCaretTop(): number | null {
  const sel = window.getSelection()
  if (!sel?.rangeCount) return null

  const range = sel.getRangeAt(0)
  let rect = range.getBoundingClientRect()

  // Collapsed ranges sometimes return a zero rect — measure via a temp span.
  if (rect.height === 0) {
    const span = document.createElement('span')
    span.textContent = '\u200b'
    const clone = range.cloneRange()
    clone.insertNode(span)
    rect = span.getBoundingClientRect()
    span.parentNode?.removeChild(span)
    // Reselect original range
    sel.removeAllRanges()
    sel.addRange(range)
  }

  return rect.top
}

function scrollToCaret() {
  const caretTop = getCaretTop()
  if (caretTop == null) return
  const targetTop = window.innerHeight * CURSOR_RATIO
  const delta = caretTop - targetTop
  if (Math.abs(delta) > 4) {
    window.scrollBy({ top: delta, behavior: 'smooth' })
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────
function onInput() {
  if (isIntro.value) isIntro.value = false
  editorStore.setContent(editor.value?.innerText ?? '')
  scrollToCaret()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '\t')
  }
}

function onPointerUp() {
  // Re-anchor after a click repositions the cursor.
  requestAnimationFrame(scrollToCaret)
}

// Scroll to caret on initial load so the intro text starts at the right position.
onMounted(() => {
  requestAnimationFrame(() => {
    editor.value?.focus()
    scrollToCaret()
  })
})
</script>

<template>
  <!-- Fixed gradient overlay — fades out text above the cursor zone -->
  <div class="focus-fade" aria-hidden="true" />

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
      @pointerup="onPointerUp"
    >{{ INTRO }}</div>
  </main>
</template>

<style scoped>
.editor {
  max-width: 680px;
  margin: 0 auto;
  /* Top padding pushes initial content down; bottom lets the last line scroll up. */
  padding: 40vh 1.5rem 50vh;
  min-height: 100vh;
}

.editor__content {
  outline: none;
  white-space: pre-wrap;
  word-break: break-word;
  caret-color: var(--ctp-mauve);
  color: var(--ctp-text);
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
}

.editor__content--intro {
  color: var(--ctp-subtext0);
}

.editor__content ::selection {
  background-color: var(--ctp-mauve);
  color: var(--ctp-base);
}

/* ── Focus fade overlay ───────────────────────────────────────────────────── */
/*
 * Sits above the text (pointer-events: none so it never blocks clicks/selection).
 * Gradient from the page background colour → transparent, ending just above
 * the cursor zone (≈ 55 % of viewport).  Text near and below the cursor is
 * fully visible; text further away blends into the background.
 */
.focus-fade {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 5;
  background: linear-gradient(
    to bottom,
    var(--ctp-base)                                    0%,
    color-mix(in srgb, var(--ctp-base) 85%, transparent) 20%,
    color-mix(in srgb, var(--ctp-base) 55%, transparent) 38%,
    color-mix(in srgb, var(--ctp-base) 20%, transparent) 52%,
    transparent                                        62%
  );
}
</style>
