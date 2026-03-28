<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { useBlogDocuments } from '../composables/useBlogDocuments'
import { extractPreview, type BlogDocument } from '../services/sanity'

const emit = defineEmits<{
  close: []
  select: [doc: BlogDocument]
}>()

const { documents, loading, error } = useBlogDocuments()

// ── Search & sort ─────────────────────────────────────────────────────────────
type SortKey = 'date' | 'title'
const search = ref('')
const sortBy = ref<SortKey>('date')
const hoveredId = ref<string | null>(null)

const filtered = computed(() => {
  let list = [...documents.value]

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter((d) => d.title?.toLowerCase().includes(q))
  }

  if (sortBy.value === 'title') {
    list.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''))
  } else {
    list.sort((a, b) => (b._updatedAt > a._updatedAt ? 1 : -1))
  }

  return list
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function select(doc: BlogDocument) {
  emit('select', doc)
  emit('close')
}
</script>

<template>
  <BaseModal title="Open document" @close="$emit('close')">
    <!-- Controls -->
    <div class="controls">
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="Search by title…"
        autofocus
        spellcheck="false"
      />
      <div class="sort-toggle">
        <button :class="{ active: sortBy === 'date' }" @click="sortBy = 'date'">Recent</button>
        <button :class="{ active: sortBy === 'title' }" @click="sortBy = 'title'">Title</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="status">Loading documents…</div>

    <!-- Error -->
    <div v-else-if="error" class="status status--error">{{ error }}</div>

    <!-- Empty search result -->
    <div v-else-if="!filtered.length" class="status">
      {{ documents.length ? 'No documents match your search.' : 'No documents found in this dataset.' }}
    </div>

    <!-- Document list -->
    <ul v-else class="doc-list">
      <li
        v-for="doc in filtered"
        :key="doc._id"
        class="doc-list__item"
        @click="select(doc)"
        @mouseenter="hoveredId = doc._id"
        @mouseleave="hoveredId = null"
      >
        <div class="doc-list__main">
          <span class="doc-list__title">{{ doc.title ?? '(Untitled)' }}</span>
          <span class="doc-list__date">{{ formatDate(doc._updatedAt) }}</span>
        </div>
        <Transition name="preview-fade">
          <p v-if="hoveredId === doc._id" class="doc-list__preview">
            {{ extractPreview(doc.body) || 'No preview available.' }}
          </p>
        </Transition>
      </li>
    </ul>
  </BaseModal>
</template>

<style scoped>
/* ── Controls ──────────────────────────────────────────────────────────────── */
.controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.search {
  flex: 1;
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  color: var(--ctp-text);
  font-size: 0.875rem;
  padding: 0.45rem 0.7rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.search::placeholder { color: var(--ctp-subtext0); }
.search:focus { border-color: var(--ctp-mauve); }

.sort-toggle {
  display: flex;
  background: var(--ctp-surface0);
  border-radius: 6px;
  padding: 2px;
  gap: 2px;
  flex-shrink: 0;
}

.sort-toggle button {
  border: none;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.78rem;
  padding: 0.3rem 0.6rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.sort-toggle button.active {
  background: var(--ctp-surface2);
  color: var(--ctp-text);
}

/* ── Status messages ───────────────────────────────────────────────────────── */
.status {
  color: var(--ctp-subtext0);
  font-size: 0.875rem;
  text-align: center;
  padding: 2rem 0;
}

.status--error {
  color: var(--ctp-red);
}

/* ── Document list ─────────────────────────────────────────────────────────── */
.doc-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 420px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--ctp-surface2) transparent;
}

.doc-list__item {
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.12s ease;
}

.doc-list__item:hover {
  background: var(--ctp-surface0);
}

.doc-list__main {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.doc-list__title {
  color: var(--ctp-text);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.doc-list__date {
  color: var(--ctp-subtext0);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.doc-list__preview {
  margin: 0.4rem 0 0.1rem;
  color: var(--ctp-subtext1);
  font-size: 0.78rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Preview animation ─────────────────────────────────────────────────────── */
.preview-fade-enter-active {
  transition: opacity 0.15s ease, max-height 0.2s ease;
}

.preview-fade-leave-active {
  transition: opacity 0.1s ease, max-height 0.15s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  max-height: 0;
}

.preview-fade-enter-to,
.preview-fade-leave-from {
  opacity: 1;
  max-height: 5rem;
}
</style>
