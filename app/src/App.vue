<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppMenuBar from './components/AppMenuBar.vue'
import OpenDocumentModal from './components/OpenDocumentModal.vue'
import HelpModal from './components/HelpModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import { useEditorStore } from './stores/editor'
import { useAuthStore } from './stores/auth'
import { fetchBlogDocument, portableTextToHtml, type BlogDocument } from './services/sanity'
import { apiPublishDocument } from './services/api'
import { trackException, trackEvent } from './services/appInsights'

const showOpen = ref(false)
const showHelp = ref(false)
const showSettings = ref(false)
const editorStore = useEditorStore()
const auth = useAuthStore()

async function onDocumentSelected(doc: BlogDocument) {
  const full = await fetchBlogDocument(doc._id)
  const bodyHtml = portableTextToHtml(full.body)
  const titleHtml = `<h1 data-type="title">${escapeHtml(full.title ?? '')}</h1>`
  editorStore.openDocument(full, titleHtml + bodyHtml)
  showOpen.value = false
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const canPublish = computed(() =>
  auth.isAuthenticated
  && !!editorStore.activeDocument
  && editorStore.activeDocument._id.startsWith('drafts.')
  && editorStore.saveStatus !== 'saving'
  && editorStore.publishStatus !== 'publishing',
)

async function publishDocument() {
  if (!canPublish.value) return
  const doc = editorStore.activeDocument!

  editorStore.setPublishStatus('publishing')
  try {
    const { _id: publishedId } = await apiPublishDocument(doc._id)
    const published = await fetchBlogDocument(publishedId)
    if (!published) {
      console.error('[publish] could not fetch published document', publishedId)
      editorStore.setPublishStatus('error')
      return
    }
    editorStore.openDocument(published)
    editorStore.setPublishStatus('published')
    trackEvent('document_published', { documentId: publishedId })
  } catch (err) {
    console.error('[publish] failed:', err)
    editorStore.setPublishStatus('error')
    trackException(err instanceof Error ? err : new Error(String(err)), { action: 'publish', documentId: doc._id })
  }
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key === 'n') { e.preventDefault(); editorStore.resetToPlaceholder() }
  if (mod && e.key === 'o' && auth.isAuthenticated) { e.preventDefault(); showOpen.value = true }
  if (mod && e.shiftKey && e.key === 'P') { e.preventDefault(); publishDocument() }
  if (e.key === 'F1') { e.preventDefault(); showHelp.value = true }
}

onMounted(async () => {
  await auth.initialize()
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppMenuBar
    :document-title="editorStore.activeDocument?.title"
    :save-status="editorStore.saveStatus"
    :publish-status="editorStore.publishStatus"
    :user="auth.user ?? undefined"
    :is-authenticated="auth.isAuthenticated"
    :has-document="!!editorStore.activeDocument"
    :can-publish="canPublish"
    @new="editorStore.resetToPlaceholder()"
    @open="showOpen = true"
    @publish="publishDocument"
    @help="showHelp = true"
    @settings="showSettings = true"
    @signin="auth.login()"
    @logout="auth.logout()"
  />
  <RouterView />
  <OpenDocumentModal
    v-if="showOpen"
    @close="showOpen = false"
    @select="onDocumentSelected"
  />
  <HelpModal
    v-if="showHelp"
    @close="showHelp = false"
  />
  <SettingsModal
    v-if="showSettings"
    @close="showSettings = false"
  />
</template>

<style scoped></style>

