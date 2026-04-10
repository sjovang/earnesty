<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount, onMounted } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { createLowlight, common } from 'lowlight'
import { useSettingsStore, fontFamilyFor } from '../stores/settings'
import { useEditorStore, CONTENT_KEY } from '../stores/editor'
import { useAuthStore } from '../stores/auth'
import { tiptapJsonToPortableText, type TiptapNode } from '../services/sanity'
import { apiSaveDocument, apiCreateDraft, apiUploadImage, type ImageAsset } from '../services/api'
import { trackException, trackEvent } from '../services/appInsights'
import { INTRO_HTML } from '../constants'
import { TitleNode } from '../extensions/TitleNode'
import { TitleDocument } from '../extensions/TitleDocument'
import { BlockInserter, BLOCK_INSERTER_EVENT } from '../extensions/BlockInserter'
import { BlockSettings, BLOCK_SETTINGS_EVENT } from '../extensions/BlockSettings'
import AppLogo from '../components/AppLogo.vue'
import ImagePickerModal from '../components/ImagePickerModal.vue'
import ImageBubbleMenu from '../components/ImageBubbleMenu.vue'
import BlockPickerPopover from '../components/BlockPickerPopover.vue'
import BlockSettingsPopover from '../components/BlockSettingsPopover.vue'

const lowlight = createLowlight(common)

const { settings } = useSettingsStore()
const editorStore = useEditorStore()
const auth = useAuthStore()

const fontFamily = computed(() => fontFamilyFor(settings.font))

const savedContent = localStorage.getItem(CONTENT_KEY)
const isIntro = ref(!savedContent)
const isLongContent = ref(false)
const keyboardVisible = ref(false)

function getViewportHeight(): number {
  return window.visualViewport?.height ?? window.innerHeight
}

function updateKeyboardVisibility() {
  if (!window.visualViewport) return
  keyboardVisible.value = window.innerHeight - window.visualViewport.height > 150
}

function checkContentLength() {
  const proseMirror = document.querySelector('.ProseMirror')
  if (!proseMirror) return
  // Switch to long-content mode once text would require scrolling
  isLongContent.value = proseMirror.scrollHeight > getViewportHeight() * 0.65
}

// ── Autosave ──────────────────────────────────────────────────────────────────
const AUTOSAVE_DELAY = 1500
let saveTimer: ReturnType<typeof setTimeout> | null = null
let latestJson: TiptapNode | null = null
let creatingDraft = false
let currentSavePromise: Promise<void> | null = null

const INTRO_TITLE = 'Earnesty is your space for focused writing'

// Register flushSave so App.vue can drain pending saves before publish
editorStore.flushSave = async () => {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null }
  if (latestJson) await doAutosave()
  if (currentSavePromise) await currentSavePromise
}

// ── Image picker ───────────────────────────────────────────────────────────────
const showImagePicker = ref(false)
const imageBubbleMenu = ref<InstanceType<typeof ImageBubbleMenu> | null>(null)
/** When set, inserting an image replaces the current one rather than inserting */
const replacingImage = ref(false)

function openImagePicker(replacing = false) {
  replacingImage.value = replacing
  showImagePicker.value = true
}

function onImageInserted(asset: ImageAsset) {
  if (!tiptap.value) return
  if (replacingImage.value) {
    imageBubbleMenu.value?.applyReplacement(asset)
  } else {
    tiptap.value.chain().focus().setImage({ src: asset.url }).run()
  }
}

// ── Block picker popover ───────────────────────────────────────────────────────
const showBlockPicker = ref(false)
const blockPickerPos = ref({ x: 0, y: 0 })

function onBlockInserterOpen(e: Event) {
  const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail
  blockPickerPos.value = { x, y }
  showBlockPicker.value = true
}

// ── Block settings popover ─────────────────────────────────────────────────────
const blockSettings = ref<{ nodeType: 'image' | 'codeBlock'; pos: number; x: number; y: number } | null>(null)

function onBlockSettingsOpen(e: Event) {
  const { nodeType, pos, x, y } = (e as CustomEvent<{ nodeType: 'image' | 'codeBlock'; pos: number; x: number; y: number }>).detail
  blockSettings.value = { nodeType, pos, x, y }
}

function onVisualViewportResize() {
  updateKeyboardVisibility()
  checkContentLength()
  requestAnimationFrame(scrollToCaret)
}

onMounted(() => {
  document.addEventListener(BLOCK_INSERTER_EVENT, onBlockInserterOpen)
  document.addEventListener(BLOCK_SETTINGS_EVENT, onBlockSettingsOpen)
  window.visualViewport?.addEventListener('resize', onVisualViewportResize)
})

onBeforeUnmount(() => {
  document.removeEventListener(BLOCK_INSERTER_EVENT, onBlockInserterOpen)
  document.removeEventListener(BLOCK_SETTINGS_EVENT, onBlockSettingsOpen)
  window.visualViewport?.removeEventListener('resize', onVisualViewportResize)
})

async function doAutosave() {
  const json = latestJson
  if (!json || !auth.isAuthenticated) return
  latestJson = null

  const run = async () => {
    // Auto-create a draft document on the first save
    if (!editorStore.activeDocument) {
      if (creatingDraft) {
        // Re-queue so latest content isn't dropped
        latestJson = json
        return
      }
      creatingDraft = true
      editorStore.setSaveStatus('saving')
      try {
        let titleText = extractTitleText(json)
        if (!titleText || titleText === INTRO_TITLE) titleText = 'Untitled'
        const slug = editorStore.slugify(titleText) || 'untitled'
        const doc = await apiCreateDraft(titleText, slug)
        // Guard against stale completion: user may have opened another doc
        if (!editorStore.activeDocument) {
          editorStore.openDocument(doc)
          trackEvent('draft_created', { documentId: doc._id })
        }
      } catch (err) {
        console.error('[autosave] draft creation failed:', err)
        editorStore.setSaveStatus('error')
        trackException(err instanceof Error ? err : new Error(String(err)), { action: 'create_draft' })
        return
      } finally {
        creatingDraft = false
        // If edits arrived during creation, re-trigger save
        if (latestJson) setTimeout(() => doAutosave(), 0)
      }
    }

    const doc = editorStore.activeDocument
    if (!doc) return

    editorStore.setSaveStatus('saving')
    try {
      const titleText = extractTitleText(json)
      const bodyJson = { ...json, content: json.content?.slice(1) ?? [] }
      await apiSaveDocument(doc._id, tiptapJsonToPortableText(bodyJson), titleText || undefined)
      editorStore.setSaveStatus('saved')
      trackEvent('document_saved', { documentId: doc._id })
    } catch (err) {
      console.error('[autosave] failed:', err)
      editorStore.setSaveStatus('error')
      trackException(err instanceof Error ? err : new Error(String(err)), { action: 'autosave' })
    } finally {
      // If edits arrived during save, re-trigger
      if (latestJson) setTimeout(() => doAutosave(), 0)
    }
  }

  currentSavePromise = run()
  await currentSavePromise
  currentSavePromise = null
}

function extractTitleText(doc: TiptapNode): string {
  const titleNode = doc.content?.[0]
  if (titleNode?.type !== 'title') return ''
  return titleNode.content?.map((n) => n.text ?? '').join('') ?? ''
}

function scheduleAutosave(json: TiptapNode) {
  if (!auth.isAuthenticated) return
  latestJson = json
  if (saveTimer) clearTimeout(saveTimer)
  editorStore.setSaveStatus('saving') // immediate feedback
  saveTimer = setTimeout(() => doAutosave(), AUTOSAVE_DELAY)
}

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
  if (!isLongContent.value && !keyboardVisible.value) return
  const caretTop = getCaretTop()
  if (caretTop == null) return
  const targetTop = getViewportHeight() * CURSOR_RATIO
  const delta = caretTop - targetTop
  if (Math.abs(delta) > 4) {
    window.scrollBy({ top: delta, behavior: 'instant' })
  }
}

// ── Tiptap editor ─────────────────────────────────────────────────────────────
const tiptap = useEditor({
  extensions: [
    TitleDocument,
    TitleNode,
    StarterKit.configure({ document: false, codeBlock: false }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      HTMLAttributes: { rel: 'noopener noreferrer' },
    }),
    Image.configure({ inline: false, allowBase64: false }),
    CodeBlockLowlight.configure({ lowlight }),
    BlockInserter,
    BlockSettings,
  ],
  content: savedContent ?? INTRO_HTML,
  autofocus: 'end',
  editorProps: {
    handleDrop(_view, event, _slice, moved) {
      if (moved) return false
      const file = event.dataTransfer?.files[0]
      if (!file?.type.startsWith('image/')) return false
      event.preventDefault()
      handleImageFile(file)
      return true
    },
    handlePaste(_view, event) {
      const text = event.clipboardData?.getData('text/plain') ?? ''
      const editor = tiptap.value
      if (!editor) return false

      // Select text + paste a URL → wrap selection as a link
      if (!editor.state.selection.empty && /^https?:\/\/\S+$/.test(text.trim())) {
        event.preventDefault()
        editor.chain().focus().setLink({ href: text.trim() }).run()
        return true
      }

      // Handle markdown link syntax: [text](url)
      const mdLinkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g
      if (mdLinkRe.test(text)) {
        event.preventDefault()
        mdLinkRe.lastIndex = 0

        const content: Array<Record<string, unknown>> = []
        let lastIndex = 0
        let match
        while ((match = mdLinkRe.exec(text)) !== null) {
          if (match.index > lastIndex) {
            content.push({ type: 'text', text: text.slice(lastIndex, match.index) })
          }
          content.push({
            type: 'text',
            text: match[1],
            marks: [{ type: 'link', attrs: { href: match[2] } }],
          })
          lastIndex = match.index + match[0].length
        }
        if (lastIndex < text.length) {
          content.push({ type: 'text', text: text.slice(lastIndex) })
        }

        editor.chain().focus().insertContent(content).run()
        return true
      }

      // Handle pasted images
      const file = Array.from(event.clipboardData?.files ?? []).find((f) =>
        f.type.startsWith('image/'),
      )
      if (!file) return false
      event.preventDefault()
      handleImageFile(file)
      return true
    },
  },
  onUpdate({ editor }) {
    if (isIntro.value) isIntro.value = false
    checkContentLength()
    editorStore.setContent(editor.getText())
    localStorage.setItem(CONTENT_KEY, editor.getHTML())

    const json = editor.getJSON() as TiptapNode
    const titleText = extractTitleText(json)
    if (titleText !== editorStore.meta.title) {
      editorStore.updateMeta({ title: titleText })
    }

    scheduleAutosave(json)
    requestAnimationFrame(scrollToCaret)
  },
  onSelectionUpdate() {
    requestAnimationFrame(scrollToCaret)
  },
  onCreate() {
    checkContentLength()
    requestAnimationFrame(scrollToCaret)
  },
})

// ── Drag & drop / paste upload ─────────────────────────────────────────────────
const uploadingImage = ref(false)

async function handleImageFile(file: File) {
  if (!tiptap.value) return
  uploadingImage.value = true
  try {
    const asset = await apiUploadImage(file)
    tiptap.value.chain().focus().setImage({ src: asset.url }).run()
  } catch (err) {
    console.error('[image upload] failed:', err)
  } finally {
    uploadingImage.value = false
  }
}

onBeforeUnmount(() => {
  tiptap.value?.destroy()
  if (saveTimer) clearTimeout(saveTimer)
  editorStore.flushSave = null
})

// ── Load document from store ──────────────────────────────────────────────────
watch(
  () => editorStore.pendingHtml,
  (html) => {
    if (html === null || !tiptap.value) return
    tiptap.value.commands.setContent(html, { emitUpdate: false })
    editorStore.consumePendingHtml()

    if (html === INTRO_HTML) {
      localStorage.removeItem(CONTENT_KEY)
      isIntro.value = true
    } else {
      localStorage.setItem(CONTENT_KEY, html)
      isIntro.value = false
    }

    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => {
      checkContentLength()
      scrollToCaret()
    })
  },
)
</script>

<template>
  <!-- Fixed gradient overlay — fades out text above the cursor zone -->
  <div
    class="focus-fade"
    :class="{ 'focus-fade--active': isLongContent }"
    aria-hidden="true"
  />

  <main
    class="editor"
    :class="{
      'editor--intro': isIntro,
      'editor--long-content': isLongContent,
    }"
    :style="{
      fontSize: settings.fontSize + 'px',
      lineHeight: settings.lineSpacing,
      fontFamily: fontFamily,
      maxWidth: settings.contentWidth + 'ch',
    }"
  >
    <!-- Logo lockup shown only while intro is displayed -->
    <Transition name="logo-fade">
      <div
        v-if="isIntro"
        class="intro-lockup"
        aria-hidden="true"
      >
        <AppLogo
          :size="120"
          class="intro-lockup__logo"
        />
        <span class="intro-lockup__name">Earnesty</span>
      </div>
    </Transition>

    <div :class="['editor__content', { 'editor__content--intro': isIntro }]">
      <EditorContent :editor="tiptap" />
    </div>

    <!-- Image bubble menu — shown when an image node is selected -->
    <ImageBubbleMenu
      v-if="tiptap"
      ref="imageBubbleMenu"
      :editor="tiptap"
      @replace="openImagePicker(true)"
    />
  </main>

  <!-- Block picker popover — shown when "+" inserter is clicked -->
  <BlockPickerPopover
    v-if="showBlockPicker"
    :x="blockPickerPos.x"
    :y="blockPickerPos.y"
    @close="showBlockPicker = false"
    @insert-image="openImagePicker(false)"
    @insert-code-block="tiptap?.chain().focus().toggleCodeBlock().run()"
  />

  <!-- Block settings popover — shown when cogwheel is clicked on a block -->
  <BlockSettingsPopover
    v-if="blockSettings && tiptap"
    :node-type="blockSettings.nodeType"
    :pos="blockSettings.pos"
    :x="blockSettings.x"
    :y="blockSettings.y"
    :editor="tiptap"
    @close="blockSettings = null"
  />

  <!-- Image picker modal -->
  <ImagePickerModal
    v-if="showImagePicker"
    @close="showImagePicker = false"
    @insert="onImageInserted"
  />

  <!-- Upload-in-progress indicator (drag & drop / paste) -->
  <Transition name="upload-toast">
    <div
      v-if="uploadingImage"
      class="upload-toast"
      aria-live="polite"
    >
      Uploading image…
    </div>
  </Transition>
</template>

<style scoped>
.editor {
  margin: 0 auto;
  padding: 0 var(--space-s);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  /* Default: anchor content near the bottom of the viewport */
  justify-content: flex-end;
  padding-bottom: 33vh;
}

/* Intro state: center the logo lockup and intro text */
.editor--intro {
  justify-content: center;
  padding-bottom: 0;
}

/* Long-form content: top-aligned with typewriter bottom padding */
.editor--long-content {
  justify-content: flex-start;
  padding-top: var(--space-2xl);
  padding-bottom: 50vh;
}

/* ── Intro lockup ─────────────────────────────────────────────────────────── */
.intro-lockup {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-xs);
  margin-bottom: var(--space-s);
  color: var(--ctp-mauve);
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
  font-family: inherit;
  overflow-wrap: break-word;
  hyphens: auto;
  text-wrap: pretty;
  position: relative;
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

/* ── Title node ───────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror h1[data-type='title']) {
  font-size: 2em;
  margin: 0 0 0.6em;
  color: var(--ctp-text);
}

.editor__content :deep(.ProseMirror h1[data-type='title']:empty::before) {
  content: 'Untitled';
  color: var(--ctp-overlay0);
  pointer-events: none;
}

/* ── Headings ─────────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror h1),
.editor__content :deep(.ProseMirror h2),
.editor__content :deep(.ProseMirror h3) {
  font-family: inherit;
  font-weight: 700;
  line-height: 1.25;
  margin: 1.6em 0 0.4em;
  color: var(--ctp-text);
  text-wrap: balance;
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

/* ── Images ───────────────────────────────────────────────────────────────── */
.editor__content :deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1.5em 0;
  display: block;
}

/* ── Code block (lowlight) ────────────────────────────────────────────────── */
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

/* Catppuccin Mocha-style highlight tokens */
.editor__content :deep(.hljs-keyword),
.editor__content :deep(.hljs-operator),
.editor__content :deep(.hljs-punctuation) { color: var(--ctp-mauve); }

.editor__content :deep(.hljs-string),
.editor__content :deep(.hljs-template-string),
.editor__content :deep(.hljs-template-tag) { color: var(--ctp-green); }

.editor__content :deep(.hljs-number),
.editor__content :deep(.hljs-literal),
.editor__content :deep(.hljs-built_in) { color: var(--ctp-peach); }

.editor__content :deep(.hljs-comment),
.editor__content :deep(.hljs-meta) { color: var(--ctp-overlay1); font-style: italic; }

.editor__content :deep(.hljs-function),
.editor__content :deep(.hljs-title),
.editor__content :deep(.hljs-title.function_) { color: var(--ctp-blue); }

.editor__content :deep(.hljs-type),
.editor__content :deep(.hljs-class) { color: var(--ctp-yellow); }

.editor__content :deep(.hljs-variable),
.editor__content :deep(.hljs-params) { color: var(--ctp-text); }

.editor__content :deep(.hljs-attr),
.editor__content :deep(.hljs-attribute) { color: var(--ctp-sapphire); }

.editor__content :deep(.hljs-tag) { color: var(--ctp-red); }

.editor__content :deep(.hljs-regexp),
.editor__content :deep(.hljs-link) { color: var(--ctp-sky); }

.editor__content :deep(.hljs-section) { color: var(--ctp-sky); font-weight: bold; }

.editor__content :deep(.hljs-selector-class),
.editor__content :deep(.hljs-selector-id) { color: var(--ctp-flamingo); }

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
  opacity: 0;
  transition: opacity 0.5s ease;
  background: linear-gradient(
    to bottom,
    var(--ctp-base)                                    0%,
    color-mix(in srgb, var(--ctp-base) 85%, transparent) 20%,
    color-mix(in srgb, var(--ctp-base) 55%, transparent) 38%,
    color-mix(in srgb, var(--ctp-base) 20%, transparent) 52%,
    transparent                                        62%
  );
}

.focus-fade--active {
  opacity: 1;
}

/* ── Block inserter "+" button ────────────────────────────────────────────── */
.editor__content :deep(.block-inserter-btn) {
  position: absolute;
  left: -2rem;
  transform: translateX(-100%);
  background: transparent;
  border: 1px solid var(--ctp-surface1);
  border-radius: 4px;
  color: var(--ctp-overlay1);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 1px 5px;
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
  user-select: none;
}

.editor__content :deep(.block-inserter-btn:hover) {
  background: var(--ctp-surface0);
  border-color: var(--ctp-surface2);
  color: var(--ctp-text);
}

/* ── Upload toast ─────────────────────────────────────────────────────────── */
.upload-toast {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface1);
  border-radius: 8px;
  color: var(--ctp-subtext1);
  font-size: 0.85rem;
  padding: 0.5rem 1rem;
  z-index: 500;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ctp-crust) 30%, transparent);
}

.upload-toast-enter-active,
.upload-toast-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.upload-toast-enter-from,
.upload-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(6px);
}
</style>
