import { ref, onMounted } from 'vue'
import type { BlogDocument } from '../services/sanity'
import { apiListDocuments } from '../services/api'

export function useBlogDocuments() {
  const documents = ref<BlogDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  onMounted(async () => {
    try {
      documents.value = await apiListDocuments()
    } catch (e) {
      console.error('[useBlogDocuments] fetch failed:', e)
      const msg = e instanceof Error ? e.message : String(e)
      error.value = `Could not load documents: ${msg}`
    } finally {
      loading.value = false
    }
  })

  return { documents, loading, error }
}
