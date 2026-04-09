<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseModal from './BaseModal.vue'
import { apiUploadImage, apiListImages, type ImageAsset } from '../services/api'

const emit = defineEmits<{
  close: []
  insert: [asset: ImageAsset]
}>()

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = 'upload' | 'library'
const activeTab = ref<Tab>('upload')

// ── Upload ────────────────────────────────────────────────────────────────────
const dragOver = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadError = ref<string | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file) uploadFile(file)
}

function onFileInputChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) uploadFile(file)
}

async function uploadFile(file: File) {
  if (!file.type.startsWith('image/')) {
    uploadError.value = 'Only image files are accepted.'
    return
  }
  if (file.size > 16 * 1024 * 1024) {
    uploadError.value = 'File exceeds the 16 MB limit.'
    return
  }

  uploadError.value = null
  uploading.value = true
  uploadProgress.value = 0

  // Simulate progress (actual upload has no progress events via fetch)
  const timer = setInterval(() => {
    if (uploadProgress.value < 85) uploadProgress.value += 10
  }, 150)

  try {
    const asset = await apiUploadImage(file)
    uploadProgress.value = 100
    emit('insert', asset)
    emit('close')
  } catch (err) {
    uploadError.value = err instanceof Error ? err.message : 'Upload failed.'
  } finally {
    clearInterval(timer)
    uploading.value = false
  }
}

// ── Library ───────────────────────────────────────────────────────────────────
const libraryImages = ref<ImageAsset[]>([])
const libraryLoading = ref(false)
const libraryError = ref<string | null>(null)

async function loadLibrary() {
  if (libraryImages.value.length > 0) return
  libraryLoading.value = true
  libraryError.value = null
  try {
    libraryImages.value = await apiListImages()
  } catch (err) {
    libraryError.value = err instanceof Error ? err.message : 'Failed to load images.'
  } finally {
    libraryLoading.value = false
  }
}

function switchToLibrary() {
  activeTab.value = 'library'
  loadLibrary()
}

onMounted(() => {
  // Pre-load the library in the background so it's ready when switched to
  loadLibrary()
})
</script>

<template>
  <BaseModal
    title="Insert image"
    @close="$emit('close')"
  >
    <div class="image-picker">
      <!-- Tabs -->
      <div
        class="tabs"
        role="tablist"
      >
        <button
          class="tab"
          :class="{ 'tab--active': activeTab === 'upload' }"
          role="tab"
          :aria-selected="activeTab === 'upload'"
          @click="activeTab = 'upload'"
        >
          Upload
        </button>
        <button
          class="tab"
          :class="{ 'tab--active': activeTab === 'library' }"
          role="tab"
          :aria-selected="activeTab === 'library'"
          @click="switchToLibrary"
        >
          Library
        </button>
      </div>

      <!-- Upload tab -->
      <div
        v-if="activeTab === 'upload'"
        class="tab-panel"
      >
        <div
          class="drop-zone"
          :class="{ 'drop-zone--over': dragOver, 'drop-zone--uploading': uploading }"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            class="drop-zone__input"
            :disabled="uploading"
            @change="onFileInputChange"
          >
          <template v-if="!uploading">
            <span class="drop-zone__icon">🖼️</span>
            <p class="drop-zone__text">
              Drop an image here, or <span class="drop-zone__browse">browse</span>
            </p>
            <p class="drop-zone__hint">
              PNG, JPG, GIF, WebP — up to 16 MB
            </p>
          </template>
          <template v-else>
            <div class="progress">
              <div
                class="progress__bar"
                :style="{ width: uploadProgress + '%' }"
              />
            </div>
            <p class="drop-zone__text">
              Uploading…
            </p>
          </template>
        </div>
        <p
          v-if="uploadError"
          class="error"
        >
          {{ uploadError }}
        </p>
      </div>

      <!-- Library tab -->
      <div
        v-else
        class="tab-panel"
      >
        <p
          v-if="libraryLoading"
          class="status"
        >
          Loading…
        </p>
        <p
          v-else-if="libraryError"
          class="error"
        >
          {{ libraryError }}
        </p>
        <p
          v-else-if="libraryImages.length === 0"
          class="status"
        >
          No images in library yet.
        </p>
        <div
          v-else
          class="grid"
        >
          <button
            v-for="img in libraryImages"
            :key="img.assetRef"
            class="grid__item"
            :title="img.assetRef"
            @click="$emit('insert', img); $emit('close')"
          >
            <img
              :src="img.url + '?w=200&h=200&fit=crop&auto=format'"
              :alt="img.assetRef"
              class="grid__thumb"
              loading="lazy"
            >
          </button>
        </div>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.image-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Tabs ── */
.tabs {
  display: flex;
  gap: 0.25rem;
  border-bottom: 1px solid var(--ctp-surface0);
  padding-bottom: 0.75rem;
}

.tab {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--ctp-subtext0);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.3rem 0.75rem;
  transition: background 0.15s ease, color 0.15s ease;
}

.tab:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
}

.tab--active {
  background: var(--ctp-surface0);
  border-color: var(--ctp-surface1);
  color: var(--ctp-text);
  font-weight: 500;
}

/* ── Upload / drop zone ── */
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.drop-zone {
  position: relative;
  border: 2px dashed var(--ctp-surface1);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 180px;
  padding: 2rem;
  text-align: center;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.drop-zone:hover,
.drop-zone--over {
  background: var(--ctp-surface0);
  border-color: var(--ctp-mauve);
}

.drop-zone--uploading {
  cursor: default;
  pointer-events: none;
}

.drop-zone__input {
  display: none;
}

.drop-zone__icon {
  font-size: 2rem;
  line-height: 1;
}

.drop-zone__text {
  color: var(--ctp-subtext1);
  font-size: 0.9rem;
  margin: 0;
}

.drop-zone__browse {
  color: var(--ctp-mauve);
  text-decoration: underline;
}

.drop-zone__hint {
  color: var(--ctp-subtext0);
  font-size: 0.78rem;
  margin: 0;
}

/* ── Progress bar ── */
.progress {
  width: 80%;
  height: 6px;
  background: var(--ctp-surface1);
  border-radius: 3px;
  overflow: hidden;
}

.progress__bar {
  height: 100%;
  background: var(--ctp-mauve);
  border-radius: 3px;
  transition: width 0.15s ease;
}

/* ── Library grid ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
}

.grid__item {
  aspect-ratio: 1;
  background: var(--ctp-surface0);
  border: 2px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  overflow: hidden;
  padding: 0;
  transition: border-color 0.15s ease;
}

.grid__item:hover {
  border-color: var(--ctp-mauve);
}

.grid__thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Status / error ── */
.status {
  color: var(--ctp-subtext0);
  font-size: 0.875rem;
  margin: 0;
  text-align: center;
  padding: 2rem 0;
}

.error {
  color: var(--ctp-red);
  font-size: 0.85rem;
  margin: 0;
}
</style>
