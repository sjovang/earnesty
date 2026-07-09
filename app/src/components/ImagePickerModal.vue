<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import BaseModal from './BaseModal.vue'
import { apiUploadImage, apiListImages, type ImageAsset } from '../services/api'
import { clampPage, paginateImages, sortLibraryImages, type ImageSortKey } from './imageLibrary'

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
const sortBy = ref<ImageSortKey>('newest')
const currentPage = ref(1)
const PAGE_SIZE = 12

const sortOptions: { value: ImageSortKey; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
]

const sortedLibraryImages = computed(() => sortLibraryImages(libraryImages.value, sortBy.value))
const totalPages = computed(() => Math.max(1, Math.ceil(sortedLibraryImages.value.length / PAGE_SIZE)))
const pagedLibraryImages = computed(() => paginateImages(sortedLibraryImages.value, currentPage.value, PAGE_SIZE))

watch(sortBy, () => {
  currentPage.value = 1
})

watch(totalPages, (pages) => {
  currentPage.value = clampPage(currentPage.value, pages)
})

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
  currentPage.value = 1
  loadLibrary()
}

function goToPage(page: number) {
  currentPage.value = clampPage(page, totalPages.value)
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
        <div
          v-if="!libraryLoading && !libraryError && libraryImages.length > 0"
          class="library-controls"
          role="group"
          aria-label="Sort images"
        >
          <button
            v-for="opt in sortOptions"
            :key="opt.value"
            class="library-sort-tab"
            :class="{ 'library-sort-tab--active': sortBy === opt.value }"
            @click="sortBy = opt.value"
          >
            {{ opt.label }}
          </button>
        </div>

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
            v-for="img in pagedLibraryImages"
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

        <div
          v-if="!libraryLoading && !libraryError && libraryImages.length > PAGE_SIZE"
          class="pagination"
        >
          <button
            class="pagination__button"
            :disabled="currentPage <= 1"
            @click="goToPage(currentPage - 1)"
          >
            Previous
          </button>
          <span class="pagination__status">Page {{ currentPage }} of {{ totalPages }}</span>
          <button
            class="pagination__button"
            :disabled="currentPage >= totalPages"
            @click="goToPage(currentPage + 1)"
          >
            Next
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

.library-controls {
  display: flex;
  gap: 2px;
  background: var(--ctp-surface0);
  border-radius: 7px;
  padding: 3px;
}

.library-sort-tab {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.78rem;
  font-weight: 500;
  padding: 0.3rem 0.4rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.library-sort-tab:hover:not(.library-sort-tab--active) {
  color: var(--ctp-text);
  background: color-mix(in srgb, var(--ctp-surface1) 60%, transparent);
}

.library-sort-tab--active {
  background: var(--ctp-surface2);
  color: var(--ctp-text);
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  width: 100%;
  max-width: 28rem;
  margin: 0 auto;
}

.grid__item {
  display: block;
  width: 100%;
  aspect-ratio: 1 / 1;
  min-height: 0;
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
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
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

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.pagination__button {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  color: var(--ctp-text);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.35rem 0.6rem;
}

.pagination__button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.pagination__status {
  color: var(--ctp-subtext0);
  font-size: 0.8rem;
}
</style>
