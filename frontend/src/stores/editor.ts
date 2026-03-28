import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BlogDocument } from '../services/sanity'

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

export const useEditorStore = defineStore('editor', () => {
  const saved = loadSession()

  const activeDocument = ref<BlogDocument | null>(saved?.activeDocument ?? null)
  const currentContent = ref<string>('')
  const pendingHtml = ref<string | null>(null)
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

  function consumePendingHtml(): string | null {
    const html = pendingHtml.value
    pendingHtml.value = null
    return html
  }

  return {
    activeDocument,
    currentContent,
    pendingHtml,
    meta,
    openDocument,
    clearDocument,
    setContent,
    updateMeta,
    slugify,
    consumePendingHtml,
  }
})
