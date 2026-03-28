import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { BlogDocument } from '../services/sanity'

export const useEditorStore = defineStore('editor', () => {
  const activeDocument = ref<BlogDocument | null>(null)

  function openDocument(doc: BlogDocument) {
    activeDocument.value = doc
  }

  function clearDocument() {
    activeDocument.value = null
  }

  return { activeDocument, openDocument, clearDocument }
})
