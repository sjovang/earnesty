<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppMenuBar from './components/AppMenuBar.vue'
import NewDocumentModal from './components/NewDocumentModal.vue'
import OpenDocumentModal from './components/OpenDocumentModal.vue'
import DocumentInfoModal from './components/DocumentInfoModal.vue'
import HelpModal from './components/HelpModal.vue'
import LoginScreen from './components/LoginScreen.vue'
import { useEditorStore } from './stores/editor'
import { useAuthStore } from './stores/auth'
import { fetchBlogDocument, portableTextToHtml, type BlogDocument } from './services/sanity'

const showNew  = ref(false)
const showOpen = ref(false)
const showInfo = ref(false)
const showHelp = ref(false)
const editorStore = useEditorStore()
const auth = useAuthStore()

async function onDocumentSelected(doc: BlogDocument) {
  const full = await fetchBlogDocument(doc._id)
  const html = portableTextToHtml(full.body)
  editorStore.openDocument(full, html)
  showOpen.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (!auth.isAuthenticated) return
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key === 'n') { e.preventDefault(); showNew.value = true }
  if (mod && e.key === 'o') { e.preventDefault(); showOpen.value = true }
  if (mod && e.key === 'i') { e.preventDefault(); showInfo.value = true }
  if (mod && e.shiftKey && e.key === 'P') { e.preventDefault(); /* TODO: publish */ }
  if (e.key === 'F1')       { e.preventDefault(); showHelp.value = true }
}

onMounted(async () => {
  await auth.initialize()
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <template v-if="auth.isAuthenticated">
    <AppMenuBar
      :document-title="editorStore.activeDocument?.title"
      :save-status="editorStore.saveStatus"
      :user="auth.user ?? undefined"
      @new="showNew = true"
      @open="showOpen = true"
      @info="showInfo = true"
      @publish="() => {}"
      @help="showHelp = true"
      @logout="auth.logout"
    />
    <RouterView />
    <NewDocumentModal
      v-if="showNew"
      @close="showNew = false"
      @created="showNew = false"
    />
    <OpenDocumentModal
      v-if="showOpen"
      @close="showOpen = false"
      @select="onDocumentSelected"
    />
    <DocumentInfoModal
      v-if="showInfo"
      @close="showInfo = false"
    />
    <HelpModal
      v-if="showHelp"
      @close="showHelp = false"
    />
  </template>
  <LoginScreen v-else />
</template>

<style scoped></style>

