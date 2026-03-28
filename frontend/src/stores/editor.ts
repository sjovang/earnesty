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
  const meta = ref<DocumentMeta>({
    title: '',
    slug: '',
    publishedAt: '',
    tags: [],
  })

  function openDocument(doc: BlogDocument) {
    activeDocument.value = doc
    meta.value = {
      title: doc.title ?? '',
      slug: slugify(doc.title ?? ''),
      publishedAt: doc._updatedAt ?? '',
      tags: [],
    }
  }

  function clearDocument() {
    activeDocument.value = null
    currentContent.value = ''
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

  return { activeDocument, currentContent, meta, openDocument, clearDocument, setContent, updateMeta, slugify }
})
