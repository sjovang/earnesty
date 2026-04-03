<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppMenuBar from './components/AppMenuBar.vue'
import OpenDocumentModal from './components/OpenDocumentModal.vue'
import HelpModal from './components/HelpModal.vue'
import { useEditorStore } from './stores/editor'
import { fetchBlogDocument, portableTextToHtml, type BlogDocument } from './services/sanity'

const showOpen = ref(false)
const showHelp = ref(false)
const editorStore = useEditorStore()

async function onDocumentSelected(doc: BlogDocument) {
  const full = await fetchBlogDocument(doc._id)
  const html = portableTextToHtml(full.body)
  editorStore.openDocument(full, html)
  showOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key === 'n') { e.preventDefault(); editorStore.resetToPlaceholder() }
  if (mod && e.key === 'o') { e.preventDefault(); showOpen.value = true }
  if (mod && e.shiftKey && e.key === 'P') { e.preventDefault(); /* TODO: publish */ }
  if (e.key === 'F1') { e.preventDefault(); showHelp.value = true }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppMenuBar
    :document-title="editorStore.activeDocument?.title"
    :save-status="editorStore.saveStatus"
    :has-document="!!editorStore.activeDocument"
    @new="editorStore.resetToPlaceholder()"
    @open="showOpen = true"
    @publish="() => {}"
    @help="showHelp = true"
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
</template>

<style scoped></style>

