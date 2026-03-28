<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import AppMenuBar from './components/AppMenuBar.vue'
import OpenDocumentModal from './components/OpenDocumentModal.vue'
import HelpModal from './components/HelpModal.vue'
import { useEditorStore } from './stores/editor'

const showOpen = ref(false)
const showHelp = ref(false)
const editorStore = useEditorStore()

function newDocument() {
  editorStore.clearDocument()
  window.location.reload()
}

function onKeydown(e: KeyboardEvent) {
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.key === 'n') { e.preventDefault(); newDocument() }
  if (mod && e.key === 'o') { e.preventDefault(); showOpen.value = true }
  if (e.key === 'F1')       { e.preventDefault(); showHelp.value = true }
}

onMounted(()  => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <AppMenuBar
    :document-title="editorStore.activeDocument?.title"
    @new="newDocument"
    @open="showOpen = true"
    @help="showHelp = true"
  />
  <RouterView />
  <OpenDocumentModal v-if="showOpen" @close="showOpen = false" />
  <HelpModal         v-if="showHelp" @close="showHelp = false" />
</template>

<style scoped></style>
