import { ref, onMounted } from 'vue'
import type { ContentDocument } from '../services/sanity'
import { apiListDocuments, AuthError } from '../services/api'

export function useDocuments() {
  const documents = ref<ContentDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  const isAuthError = ref(false)

  onMounted(async () => {
    try {
      documents.value = await apiListDocuments()
    } catch (e) {
      console.error('[useDocuments] fetch failed:', e)
      if (e instanceof AuthError) {
        isAuthError.value = true
        error.value = 'Your session has expired. Please sign in again.'
      } else {
        const msg = e instanceof Error ? e.message : String(e)
        error.value = `Could not load documents: ${msg}`
      }
    } finally {
      loading.value = false
    }
  })

  return { documents, loading, error, isAuthError }
}

/** @deprecated Use {@link useDocuments} instead. */
export const useBlogDocuments = useDocuments
