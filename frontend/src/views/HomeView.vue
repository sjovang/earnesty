<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { useSettingsStore } from '../stores/settings'
import { useEditorStore } from '../stores/editor'
import AppLogo from '../components/AppLogo.vue'

const { settings } = useSettingsStore()
const editorStore = useEditorStore()

const INTRO_HTML = `<p>Earnesty is your space for focused writing.</p>
<p>No distractions. No formatting toolbars. Just you and the blank page.</p>
<p>Select any part of this text and start typing to replace it — or click anywhere to place your cursor and begin.</p>`

const isIntro = ref(true)

// ── Typewriter scroll ─────────────────────────────────────────────────────────
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

// ── Tiptap editor ─────────────────────────────────────────────────────────────
const tiptap = useEditor({
  extensions: [
    StarterKit,
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer' },
    }),
  ],
  content: INTRO_HTML,
  autofocus: 'end',
  onUpdate({ editor }) {
    if (isIntro.value) isIntro.value = false
    editorStore.setContent(editor.getText())
    requestAnimationFrame(scrollToCaret)
  },
  onSelectionUpdate() {
    requestAnimationFrame(scrollToCaret)
  },
  onCreate() {
    requestAnimationFrame(scrollToCaret)
  },
})

onBeforeUnmount(() => tiptap.value?.destroy())
</script>

<template>
  <!-- Fixed gradient overlay — fades out text above the cursor zone -->
  <div class="focus-fade" aria-hidden="true" />

  <main
    class="editor"
    :style="{ fontSize: settings.fontSize + 'px', lineHeight: settings.lineSpacing }"
  >
    <!-- Logo lockup shown only while intro is displayed -->
    <Transition name="logo-fade">
      <div v-if="isIntro" class="intro-lockup" aria-hidden="true">
        <AppLogo :size="48" class="intro-lockup__logo" />
        <span class="intro-lockup__name">Earnesty</span>
      </div>
    </Transition>

    <div :class="['editor__content', { 'editor__content--intro': isIntro }]">
      <EditorContent :editor="tiptap" />
    </div>
  </main>
</template>

<style scoped>
.editor {
  max-width: 680px;
  margin: 0 auto;
  padding: 40vh 1.5rem 50vh;
  min-height: 100vh;
}

/* ── Intro lockup ─────────────────────────────────────────────────────────── */
.intro-lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 2.5rem;
  color: var(--ctp-subtext0);
  opacity: 0.5;
}

.intro-lockup__logo {
  display: block;
}

.intro-lockup__name {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.logo-fade-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}

.logo-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ── Editor base ──────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror) {
  outline: none;
  caret-color: var(--ctp-mauve);
  color: var(--ctp-text);
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
  word-break: break-word;
}

.editor__content--intro :deep(.ProseMirror) {
  color: var(--ctp-subtext0);
}

.editor__content :deep(.ProseMirror ::selection) {
  background-color: var(--ctp-mauve);
  color: var(--ctp-base);
}

/* ── Paragraphs ───────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror p) {
  margin: 0 0 1em;
}

.editor__content :deep(.ProseMirror p:last-child) {
  margin-bottom: 0;
}

/* ── Headings ─────────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror h1),
.editor__content :deep(.ProseMirror h2),
.editor__content :deep(.ProseMirror h3) {
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
  font-weight: 700;
  line-height: 1.25;
  margin: 1.6em 0 0.4em;
  color: var(--ctp-text);
}

.editor__content :deep(.ProseMirror h1) { font-size: 1.65em; }
.editor__content :deep(.ProseMirror h2) { font-size: 1.35em; }
.editor__content :deep(.ProseMirror h3) { font-size: 1.15em; }

/* ── Blockquote ───────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror blockquote) {
  border-left: 3px solid var(--ctp-mauve);
  margin: 1.2em 0;
  padding: 0.15em 1em;
  color: var(--ctp-subtext1);
  font-style: italic;
}

.editor__content :deep(.ProseMirror blockquote p) {
  margin: 0;
}

/* ── Lists ────────────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror ul),
.editor__content :deep(.ProseMirror ol) {
  padding-left: 1.5em;
  margin: 0.4em 0 1em;
}

.editor__content :deep(.ProseMirror li) {
  margin: 0.25em 0;
}

.editor__content :deep(.ProseMirror li p) {
  margin: 0;
}

/* ── Inline styles ────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror strong) {
  font-weight: 700;
}

.editor__content :deep(.ProseMirror em) {
  font-style: italic;
}

/* ── Links ────────────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror a) {
  color: var(--ctp-blue);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: text;
}

/* ── Inline code ──────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror code) {
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 0.82em;
  background: var(--ctp-surface0);
  color: var(--ctp-pink);
  padding: 0.1em 0.35em;
  border-radius: 4px;
}

/* ── Code block ───────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror pre) {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  font-size: 0.82em;
  padding: 0.8em 1em;
  border-radius: 6px;
  margin: 1em 0;
  overflow-x: auto;
}

.editor__content :deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
  color: inherit;
  font-size: 1em;
}

/* ── Horizontal rule ──────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror hr) {
  border: none;
  border-top: 1px solid var(--ctp-surface2);
  margin: 2em 0;
}

/* ── Focus fade overlay ───────────────────────────────────────────────────── */
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
