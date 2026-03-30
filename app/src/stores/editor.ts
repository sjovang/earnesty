import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BlogDocument } from '../services/sanity'
import { INTRO_HTML } from '../constants'

export interface DocumentMeta {
  title: string
  slug: string
  publishedAt: string
  tags: string[]
}

const SESSION_KEY = 'earnesty-session'
export const CONTENT_KEY = 'earnesty-content'

interface PersistedSession {
  activeDocument: BlogDocument | null
  meta: DocumentMeta
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

function saveSession(doc: BlogDocument | null, m: DocumentMeta) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ activeDocument: doc, meta: m }))
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export const useEditorStore = defineStore('editor', () => {
  const saved = loadSession()

  const activeDocument = ref<BlogDocument | null>(saved?.activeDocument ?? null)
  const currentContent = ref<string>('')
  const pendingHtml = ref<string | null>(null)
  const saveStatus = ref<SaveStatus>('idle')
  const meta = ref<DocumentMeta>(
    saved?.meta ?? { title: '', slug: '', publishedAt: '', tags: [] },
  )

  function openDocument(doc: BlogDocument, html?: string) {
    activeDocument.value = doc
    meta.value = {
      title: doc.title ?? '',
      slug: slugify(doc.title ?? ''),
      publishedAt: doc._updatedAt ?? '',
      tags: [],
    }
    saveSession(activeDocument.value, meta.value)
    if (html !== undefined) pendingHtml.value = html
  }

  function clearDocument() {
    activeDocument.value = null
    currentContent.value = ''
    pendingHtml.value = null
    meta.value = { title: '', slug: '', publishedAt: '', tags: [] }
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem(CONTENT_KEY)
  }

  function resetToPlaceholder() {
    clearDocument()
    pendingHtml.value = INTRO_HTML
  }

  function setContent(text: string) {
    currentContent.value = text
  }

  function updateMeta(patch: Partial<DocumentMeta>) {
    meta.value = { ...meta.value, ...patch }
    if (patch.title !== undefined && !meta.value.slug) {
      meta.value.slug = slugify(patch.title)
    }
    saveSession(activeDocument.value, meta.value)
  }

  function setSaveStatus(status: SaveStatus) {
    saveStatus.value = status
    if (status === 'saved') {
      setTimeout(() => { if (saveStatus.value === 'saved') saveStatus.value = 'idle' }, 2500)
    }
  }

  function consumePendingHtml(): string | null {
    const html = pendingHtml.value
    pendingHtml.value = null
    return html
  }

  return {
    activeDocument,
    currentContent,
    pendingHtml,
    saveStatus,
    meta,
    openDocument,
    clearDocument,
    resetToPlaceholder,
    setContent,
    updateMeta,
    setSaveStatus,
    slugify,
    consumePendingHtml,
  }
})
