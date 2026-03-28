import { ref, onMounted } from 'vue'
import { fetchBlogDocuments, type BlogDocument } from '../services/sanity'

export function useBlogDocuments() {
  const documents = ref<BlogDocument[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)

  onMounted(async () => {
    try {
      documents.value = await fetchBlogDocuments()
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
