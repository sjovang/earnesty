import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BlogDocument } from '../services/sanity'

export interface DocumentMeta {
  title: string
  slug: string
  publishedAt: string
  tags: string[]
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
  const activeDocument = ref<BlogDocument | null>(null)
  const currentContent = ref<string>('')
  const pendingHtml = ref<string | null>(null)
  const meta = ref<DocumentMeta>({
    title: '',
    slug: '',
    publishedAt: '',
    tags: [],
  })

  function openDocument(doc: BlogDocument, html?: string) {
    activeDocument.value = doc
    meta.value = {
      title: doc.title ?? '',
      slug: slugify(doc.title ?? ''),
      publishedAt: doc._updatedAt ?? '',
      tags: [],
    }
    if (html !== undefined) pendingHtml.value = html
  }

  function clearDocument() {
    activeDocument.value = null
    currentContent.value = ''
    pendingHtml.value = null
    meta.value = { title: '', slug: '', publishedAt: '', tags: [] }
  }

  function setContent(text: string) {
    currentContent.value = text
  }

  function updateMeta(patch: Partial<DocumentMeta>) {
    meta.value = { ...meta.value, ...patch }
    if (patch.title !== undefined && !meta.value.slug) {
      meta.value.slug = slugify(patch.title)
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
    meta,
    openDocument,
    clearDocument,
    setContent,
    updateMeta,
    slugify,
    consumePendingHtml,
  }
})
