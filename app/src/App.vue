<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RouterView } from 'vue-router'
import AppMenuBar from './components/AppMenuBar.vue'
import OpenDocumentModal from './components/OpenDocumentModal.vue'
import NewDocumentModal from './components/NewDocumentModal.vue'
import HelpModal from './components/HelpModal.vue'
import SettingsModal from './components/SettingsModal.vue'
import PublishModal from './components/PublishModal.vue'
import { useEditorStore, type DocumentMeta } from './stores/editor'
import { useAuthStore } from './stores/auth'
import { portableTextToHtml, type ContentDocument } from './services/sanity'
import { apiGetDocument, apiPublishDocument, apiSaveDocument } from './services/api'
import { trackException, trackEvent } from './services/appInsights'
import { runtimeConfig } from './config/runtime'

const showOpen = ref(false)
const showNew = ref(false)
const showHelp = ref(false)
const showSettings = ref(false)
const showMetadataModal = ref(false)
const showPublishModal = ref(false)
const metadataError = ref('')
const publishError = ref('')
const metadataSubmitting = ref(false)
const publishSubmitting = ref(false)
const editorStore = useEditorStore()
const auth = useAuthStore()
const draftPrefix = runtimeConfig.content.draftPrefix

async function onDocumentSelected(doc: ContentDocument) {
  try {
    const full = await apiGetDocument(doc._id)
    if (!full) {
      console.error('[open] could not fetch selected document', doc._id)
      trackEvent('document_open_failed_not_found', { documentId: doc._id })
      return
    }
    const bodyHtml = portableTextToHtml(full.body)
    const titleHtml = `<h1 data-type="title">${escapeHtml(full.title ?? '')}</h1>`
    editorStore.openDocument(full, titleHtml + bodyHtml)
    showOpen.value = false
  } catch (err) {
    console.error('[open] failed to fetch selected document', doc._id, err)
    trackException(err instanceof Error ? err : new Error(String(err)), {
      action: 'open_document',
      documentId: doc._id,
    })
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function baseDocumentId(id: string): string {
  return id.startsWith(draftPrefix) ? id.slice(draftPrefix.length) : id
}

function toDraftDocumentId(id: string): string {
  return `${draftPrefix}${baseDocumentId(id)}`
}

const canPublish = computed(() =>
  auth.isAuthenticated
  && !!editorStore.activeDocument
  && editorStore.activeDocument._id.startsWith(draftPrefix)
  && editorStore.publishStatus !== 'publishing',
)

const canEditMetadata = computed(() =>
  auth.isAuthenticated
  && !!editorStore.activeDocument
  && editorStore.publishStatus !== 'publishing',
)

const isDraft = computed(() =>
  !!editorStore.activeDocument
  && editorStore.activeDocument._id.startsWith(draftPrefix),
)

function onNewDocument() {
  if (!auth.isAuthenticated) {
    editorStore.resetToPlaceholder()
    return
  }
  showNew.value = true
}

async function publishDocument() {
  if (!canPublish.value) return
  publishError.value = ''
  showPublishModal.value = true
}

function openMetadataModal() {
  if (!canEditMetadata.value) return
  metadataError.value = ''
  showMetadataModal.value = true
}

function isPersistableDraft(id: string): boolean {
  return id.startsWith(draftPrefix)
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

async function persistMetadata(meta: DocumentMeta): Promise<void> {
  const doc = editorStore.activeDocument
  if (!doc || !auth.isAuthenticated || !isPersistableDraft(doc._id)) return
  await apiSaveDocument(doc._id, undefined, meta.title, editorStore.metadataPayload())
}

async function onMetadataSubmit(meta: DocumentMeta) {
  metadataError.value = ''
  metadataSubmitting.value = true
  editorStore.updateMeta(meta)
  try {
    await persistMetadata(meta)
    showMetadataModal.value = false
  } catch (err) {
    metadataError.value = toMessage(err, 'Failed to save metadata. Please retry.')
    trackException(err instanceof Error ? err : new Error(String(err)), { action: 'save_metadata' })
  } finally {
    metadataSubmitting.value = false
  }
}

async function onPublishConfirm(meta: DocumentMeta) {
  publishError.value = ''
  publishSubmitting.value = true
  const doc = editorStore.activeDocument
  if (!doc) {
    publishSubmitting.value = false
    return
  }

  editorStore.updateMeta(meta)

  try {
    // Save metadata updates to Sanity before publishing
    await persistMetadata(meta)
  } catch (err) {
    console.error('[publish] pre-publish save failed:', err)
    publishError.value = toMessage(err, 'Failed to save metadata before publish. Fix the fields and retry.')
    publishSubmitting.value = false
    trackException(err instanceof Error ? err : new Error(String(err)), { action: 'pre_publish_save' })
    return
  }

  showPublishModal.value = false
  publishSubmitting.value = false
  await doPublish()
}

async function doPublish() {
  const doc = editorStore.activeDocument
  if (!doc) return

  // Flush any pending autosave so we publish the latest content
  if (editorStore.flushSave) await editorStore.flushSave()

  editorStore.setPublishStatus('publishing')
  try {
    const { _id: publishedId } = await apiPublishDocument(doc._id)
    const published = await apiGetDocument(publishedId)
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

function onDocumentDeleted(doc: ContentDocument) {
  if (editorStore.activeDocument && baseDocumentId(editorStore.activeDocument._id) === baseDocumentId(doc._id)) {
    editorStore.discardPendingSave?.()
    editorStore.resetToPlaceholder()
    showPublishModal.value = false
    showMetadataModal.value = false
    publishError.value = ''
    metadataError.value = ''
  }
  trackEvent('document_deleted', { documentId: doc._id })
}

async function onDocumentUnpublished(doc: ContentDocument) {
  trackEvent('document_unpublished', { documentId: doc._id })
  if (!editorStore.activeDocument || baseDocumentId(editorStore.activeDocument._id) !== baseDocumentId(doc._id)) {
    return
  }

  try {
    const draft = await apiGetDocument(toDraftDocumentId(doc._id))
    if (!draft) {
      editorStore.discardPendingSave?.()
      editorStore.resetToPlaceholder()
      return
    }
    editorStore.openDocument(draft)
  } catch (err) {
    trackException(err instanceof Error ? err : new Error(String(err)), {
      action: 'open_unpublished_draft',
      documentId: doc._id,
    })
  }
}

onMounted(async () => {
  await auth.initialize()
})
</script>

<template>
  <AppMenuBar
    :document-title="editorStore.activeDocument?.title"
    :save-status="editorStore.saveStatus"
    :publish-status="editorStore.publishStatus"
    :user="auth.user ?? undefined"
    :is-authenticated="auth.isAuthenticated"
    :has-document="!!editorStore.activeDocument"
    :can-edit-metadata="canEditMetadata"
    :can-publish="canPublish"
    :is-draft="isDraft"
    @new="onNewDocument"
    @open="showOpen = true"
    @metadata="openMetadataModal"
    @publish="publishDocument"
    @help="showHelp = true"
    @settings="showSettings = true"
    @signin="auth.login()"
    @logout="auth.logout()"
  />
  <RouterView />
  <OpenDocumentModal
    v-if="showOpen"
    @delete="onDocumentDeleted"
    @close="showOpen = false"
    @select="onDocumentSelected"
    @unpublish="onDocumentUnpublished"
  />
  <NewDocumentModal
    v-if="showNew"
    @close="showNew = false"
    @created="showNew = false"
  />
  <HelpModal
    v-if="showHelp"
    @close="showHelp = false"
  />
  <SettingsModal
    v-if="showSettings"
    @close="showSettings = false"
  />
  <PublishModal
    v-if="showMetadataModal"
    mode="edit"
    :is-submitting="metadataSubmitting"
    :error-message="metadataError"
    @close="showMetadataModal = false"
    @submit="onMetadataSubmit"
  />
  <PublishModal
    v-if="showPublishModal"
    mode="publish"
    :is-submitting="publishSubmitting"
    :error-message="publishError"
    @close="showPublishModal = false"
    @submit="onPublishConfirm"
  />
</template>

<style scoped></style>
