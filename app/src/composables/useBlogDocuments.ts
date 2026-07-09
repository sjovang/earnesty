import { ref, onMounted } from 'vue'
import type { ContentDocument } from '../services/sanity'
import { apiListDocuments, AuthError } from '../services/api'
import { runtimeConfig } from '../config/runtime'
import { useAuthStore } from '../stores/auth'

export function useDocuments() {
  const documents = ref<ContentDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const isAuthError = ref(false)
  const auth = useAuthStore()
  const draftPrefix = runtimeConfig.content.draftPrefix

  function baseDocumentId(id: string): string {
    return id.startsWith(draftPrefix) ? id.slice(draftPrefix.length) : id
  }

  async function refreshDocuments() {
    error.value = null
    isAuthError.value = false
    try {
      documents.value = await apiListDocuments()
    } catch (e) {
      console.error('[useDocuments] fetch failed:', e)
      if (e instanceof AuthError) {
        isAuthError.value = true
        error.value = 'Your session has expired. Please sign in again.'
        auth.invalidateSession()
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        error.value = `Could not load documents: ${msg}`
      }
    } finally {
      loading.value = false
    }
  }

  function removeDocument(id: string) {
    const deletedBaseId = baseDocumentId(id)
    documents.value = documents.value.filter((doc) => baseDocumentId(doc._id) !== deletedBaseId)
  }

  onMounted(() => {
    void refreshDocuments()
  })

  return { documents, loading, error, isAuthError, refreshDocuments, removeDocument }
}

/** @deprecated Use {@link useDocuments} instead. */
export const useBlogDocuments = useDocuments
