import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import type { ContentDocument } from '../services/sanity'
import { INTRO_HTML } from '../constants'
import { runtimeConfig, getContentTypeConfig } from '../config/runtime'

export interface DocumentMeta {
  documentType: string
  title: string
  slug: string
  publishedAt: string
  tags: string[]
  custom: Record<string, unknown>
}

const ns = runtimeConfig.app.storageNamespace
const SESSION_KEY = `${ns}-session`
export const CONTENT_KEY = `${ns}-content`

interface PersistedSession {
  activeDocument: ContentDocument | null
  meta: DocumentMeta
}

function defaultMeta(): DocumentMeta {
  return {
    documentType: runtimeConfig.content.defaultType,
    title: '',
    slug: '',
    publishedAt: '',
    tags: [],
    custom: {},
  }
}

function normalizeMeta(meta: DocumentMeta | null | undefined): DocumentMeta {
  if (!meta) return defaultMeta()
  return {
    documentType: meta.documentType || runtimeConfig.content.defaultType,
    title: meta.title ?? '',
    slug: meta.slug ?? '',
    publishedAt: meta.publishedAt ?? '',
    tags: Array.isArray(meta.tags) ? meta.tags.filter((item): item is string => typeof item === 'string') : [],
    custom: meta.custom && typeof meta.custom === 'object' && !Array.isArray(meta.custom) ? meta.custom : {},
  }
}

function mapDocumentMeta(doc: ContentDocument): DocumentMeta {
  const typeConfig = getContentTypeConfig(doc._type || runtimeConfig.content.defaultType)
  const metadata = doc.metadata ?? {}
  const title = typeof metadata['title'] === 'string'
    ? metadata['title']
    : (doc.title ?? '')
  const slug = typeof metadata['slug'] === 'string'
    ? metadata['slug']
    : slugify(title)
  const publishedAt = typeof metadata['publishedAt'] === 'string'
    ? metadata['publishedAt']
    : (doc.publishedAt ?? doc._updatedAt ?? '')
  const tags = Array.isArray(metadata['tags']) && metadata['tags'].every((item) => typeof item === 'string')
    ? [...metadata['tags']] as string[]
    : []

  const custom: Record<string, unknown> = {}
  for (const field of typeConfig.metadataFields) {
    if (field.key === 'title' || field.key === 'slug' || field.key === 'publishedAt' || field.key === 'tags') {
      continue
    }
    custom[field.key] = metadata[field.key] ?? ''
  }

  return {
    documentType: doc._type || runtimeConfig.content.defaultType,
    title,
    slug,
    publishedAt,
    tags,
    custom,
  }
}

function loadSession(): PersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as PersistedSession) : null
  } catch {
    return null
  }
}

function saveSession(doc: ContentDocument | null, m: DocumentMeta) {
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
export type PublishStatus = 'idle' | 'publishing' | 'published' | 'error'

export const useEditorStore = defineStore('editor', () => {
  const saved = loadSession()

  const activeDocument = ref<ContentDocument | null>(saved?.activeDocument ?? null)
  const currentContent = ref<string>('')
  const pendingHtml = ref<string | null>(null)
  const saveStatus = ref<SaveStatus>('idle')
  const publishStatus = ref<PublishStatus>('idle')
  const meta = ref<DocumentMeta>(normalizeMeta(saved?.meta))

  /** Registered by HomeView to flush pending autosave before publish. */
  const flushSave = shallowRef<(() => Promise<void>) | null>(null)

  function openDocument(doc: ContentDocument, html?: string) {
    activeDocument.value = doc
    meta.value = mapDocumentMeta(doc)
    saveSession(activeDocument.value, meta.value)
    if (html !== undefined) pendingHtml.value = html
  }

  function clearDocument() {
    activeDocument.value = null
    currentContent.value = ''
    pendingHtml.value = null
    meta.value = defaultMeta()
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
    meta.value = {
      ...meta.value,
      ...patch,
      custom: patch.custom ? { ...meta.value.custom, ...patch.custom } : meta.value.custom,
    }
    if (patch.title !== undefined && !meta.value.slug) {
      meta.value.slug = slugify(patch.title)
    }
    saveSession(activeDocument.value, meta.value)
  }

  function updateMetaField(key: string, value: unknown) {
    if (key === 'title' && typeof value === 'string') {
      updateMeta({ title: value })
      return
    }
    if (key === 'slug' && typeof value === 'string') {
      updateMeta({ slug: value })
      return
    }
    if (key === 'publishedAt' && typeof value === 'string') {
      updateMeta({ publishedAt: value })
      return
    }
    if (key === 'tags' && Array.isArray(value)) {
      updateMeta({ tags: value.filter((item): item is string => typeof item === 'string') })
      return
    }
    updateMeta({ custom: { [key]: value } })
  }

  function getMetaFieldValue(key: string): unknown {
    if (key === 'title') return meta.value.title
    if (key === 'slug') return meta.value.slug
    if (key === 'publishedAt') return meta.value.publishedAt
    if (key === 'tags') return meta.value.tags
    return meta.value.custom[key]
  }

  function metadataPayload(): Record<string, unknown> {
    const typeConfig = getContentTypeConfig(meta.value.documentType)
    const payload: Record<string, unknown> = {}
    for (const field of typeConfig.metadataFields) {
      if (field.key === 'title') payload[field.key] = meta.value.title
      else if (field.key === 'slug') payload[field.key] = meta.value.slug
      else if (field.key === 'publishedAt') payload[field.key] = meta.value.publishedAt
      else if (field.key === 'tags') payload[field.key] = meta.value.tags
      else payload[field.key] = meta.value.custom[field.key] ?? ''
    }
    return payload
  }

  function setSaveStatus(status: SaveStatus) {
    saveStatus.value = status
    if (status === 'saved') {
      setTimeout(() => { if (saveStatus.value === 'saved') saveStatus.value = 'idle' }, 2500)
    }
  }

  function setPublishStatus(status: PublishStatus) {
    publishStatus.value = status
    if (status === 'published') {
      setTimeout(() => { if (publishStatus.value === 'published') publishStatus.value = 'idle' }, 2500)
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
    publishStatus,
    meta,
    flushSave,
    openDocument,
    clearDocument,
    resetToPlaceholder,
    setContent,
    updateMeta,
    updateMetaField,
    getMetaFieldValue,
    metadataPayload,
    setSaveStatus,
    setPublishStatus,
    slugify,
    consumePendingHtml,
  }
})
