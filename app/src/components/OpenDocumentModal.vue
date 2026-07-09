<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { useDocuments } from '../composables/useBlogDocuments'
import { extractPreview, type ContentDocument } from '../services/sanity'
import { runtimeConfig } from '../config/runtime'
import { apiDeleteDocument, clearRedirectTimestamp } from '../services/api'
import { trackException } from '../services/appInsights'
import { useAuthStore } from '../stores/auth'

const emit = defineEmits<{
  close: []
  select: [doc: ContentDocument]
  delete: [doc: ContentDocument]
}>()

const auth = useAuthStore()
const { documents, loading, error, isAuthError, removeDocument } = useDocuments()
const draftPrefix = runtimeConfig.content.draftPrefix

// ── Search & sort ─────────────────────────────────────────────────────────────
type SortKey = 'newest' | 'oldest' | 'title-asc' | 'title-desc'
type DocStatus = 'draft' | 'published' | 'changed'

const search = ref('')
const sortBy = ref<SortKey>('newest')
const hoveredId = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteError = ref('')

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'newest',     label: 'Newest' },
  { value: 'oldest',     label: 'Oldest' },
  { value: 'title-asc',  label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
]

// Deduplicate draft/published pairs and compute status for each document.
// When both draft and published exist, prefer the draft (it has the latest edits).
const resolvedDocs = computed<{ doc: ContentDocument; status: DocStatus }[]>(() => {
  const map = new Map<string, { draft?: ContentDocument; published?: ContentDocument }>()

  for (const doc of documents.value) {
    const isDraft = doc._id.startsWith(draftPrefix)
    const baseId = isDraft ? doc._id.slice(draftPrefix.length) : doc._id
    const entry = map.get(baseId) ?? {}
    if (isDraft) entry.draft = doc
    else entry.published = doc
    map.set(baseId, entry)
  }

  return Array.from(map.values()).map(({ draft, published }) => {
    const doc = draft ?? published!
    const status: DocStatus = draft && published ? 'changed' : draft ? 'draft' : 'published'
    return { doc, status }
  })
})

const filtered = computed(() => {
  let list = [...resolvedDocs.value]

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(({ doc }) => doc.title?.toLowerCase().includes(q))
  }

  const sortKey = (doc: typeof list[0]['doc']) => doc.publishedAt ?? doc._createdAt

  switch (sortBy.value) {
    case 'oldest':
      list.sort((a, b) => (sortKey(a.doc) > sortKey(b.doc) ? 1 : -1))
      break
    case 'title-asc':
      list.sort((a, b) => (a.doc.title ?? '').localeCompare(b.doc.title ?? ''))
      break
    case 'title-desc':
      list.sort((a, b) => (b.doc.title ?? '').localeCompare(a.doc.title ?? ''))
      break
    default: // newest
      list.sort((a, b) => (sortKey(a.doc) > sortKey(b.doc) ? -1 : 1))
  }

  return list
})

const canDeleteDocuments = computed(() => auth.isAuthenticated)

const statusMeta: Record<DocStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft — not yet published',         color: 'var(--ctp-yellow)' },
  published: { label: 'Published',                         color: 'var(--ctp-green)'  },
  changed:   { label: 'Published with unpublished changes', color: 'var(--ctp-peach)'  },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message
  return fallback
}

function select(doc: ContentDocument) {
  if (deletingId.value) return
  emit('select', doc)
  emit('close')
}

async function remove(doc: ContentDocument) {
  if (!canDeleteDocuments.value || deletingId.value) return
  const title = doc.title?.trim() || 'Untitled'
  const confirmed = window.confirm(`Delete "${title}"? This removes the document from Sanity.`)
  if (!confirmed) return

  deleteError.value = ''
  deletingId.value = doc._id

  try {
    await apiDeleteDocument(doc._id)
    removeDocument(doc._id)
    emit('delete', doc)
  } catch (error) {
    deleteError.value = toMessage(error, 'Failed to delete document. Please retry.')
    trackException(error instanceof Error ? error : new Error(String(error)), {
      action: 'delete_document',
      documentId: doc._id,
    })
  } finally {
    deletingId.value = null
  }
}

function signIn() {
  clearRedirectTimestamp()
  auth.login()
}
</script>

<template>
  <BaseModal
    title="Open document"
    @close="$emit('close')"
  >
    <!-- Controls -->
    <div class="controls">
      <input
        v-model="search"
        class="search"
        type="search"
        placeholder="Search by title…"
        autofocus
        spellcheck="false"
      >
      <div class="sort-tabs">
        <button
          v-for="opt in sortOptions"
          :key="opt.value"
          :class="['sort-tab', { 'sort-tab--active': sortBy === opt.value }]"
          @click="sortBy = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="status"
    >
      Loading documents…
    </div>

    <!-- Auth error -->
    <div
      v-else-if="isAuthError"
      class="status status--auth"
    >
      <p>Your session has expired.</p>
      <button
        class="signin-btn"
        @click="signIn"
      >
        Sign in
      </button>
    </div>

    <!-- Other error -->
    <div
      v-else-if="error"
      class="status status--error"
    >
      {{ error }}
    </div>
    <div
      v-if="deleteError && !loading && !isAuthError && !error"
      class="status status--error status--inline"
    >
      {{ deleteError }}
    </div>

    <!-- Empty search result -->
    <div
      v-if="!loading && !isAuthError && !error && !filtered.length"
      class="status"
    >
      {{ documents.length ? 'No documents match your search.' : 'No documents found in this dataset.' }}
    </div>

    <!-- Document list -->
    <ul
      v-else-if="!loading && !isAuthError && !error"
      class="doc-list"
    >
      <li
        v-for="{ doc, status } in filtered"
        :key="doc._id"
        class="doc-list__item"
        :class="{ 'doc-list__item--busy': deletingId === doc._id }"
        :aria-busy="deletingId === doc._id ? 'true' : undefined"
        @click="select(doc)"
        @mouseenter="hoveredId = doc._id"
        @mouseleave="hoveredId = null"
      >
        <div class="doc-list__main">
          <!-- Status icon -->
          <span
            class="doc-status"
            :title="statusMeta[status].label"
            :style="{ color: statusMeta[status].color }"
            :aria-label="statusMeta[status].label"
          >
            <!-- Draft: pencil -->
            <svg
              v-if="status === 'draft'"
              viewBox="0 0 12 12"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M8 2l2 2-5.5 5.5H2.5V8L8 2z" />
            </svg>
            <!-- Published: circle + check -->
            <svg
              v-else-if="status === 'published'"
              viewBox="0 0 12 12"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
              />
              <path d="M3.8 6l1.5 1.5 2.9-3" />
            </svg>
            <!-- Unpublished changes: circle + inner dot -->
            <svg
              v-else
              viewBox="0 0 12 12"
              width="11"
              height="11"
              fill="none"
              stroke="currentColor"
              stroke-width="1.3"
              stroke-linecap="round"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
              />
              <circle
                cx="6"
                cy="6"
                r="1.8"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </span>

          <span class="doc-list__title">{{ doc.title ?? '(Untitled)' }}</span>
          <span class="doc-list__date">{{ formatDate(doc._updatedAt) }}</span>
          <button
            v-if="canDeleteDocuments"
            class="doc-list__delete"
            :disabled="!!deletingId"
            :aria-label="`Delete ${doc.title ?? 'Untitled'}`"
            @click.stop="remove(doc)"
          >
            {{ deletingId === doc._id ? 'Deleting…' : 'Delete' }}
          </button>
        </div>
        <Transition name="preview-fade">
          <p
            v-if="hoveredId === doc._id"
            class="doc-list__preview"
          >
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
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.search {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  color: var(--ctp-text);
  font-size: 0.875rem;
  padding: 0.45rem 0.7rem;
  outline: none;
  transition: border-color 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.search::placeholder { color: var(--ui-placeholder-color); }
.search:focus { border-color: var(--ctp-mauve); }

.sort-tabs {
  display: flex;
  gap: 2px;
  background: var(--ctp-surface0);
  border-radius: 7px;
  padding: 3px;
}

.sort-tab {
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

.sort-tab:hover:not(.sort-tab--active) {
  color: var(--ctp-text);
  background: color-mix(in srgb, var(--ctp-surface1) 60%, transparent);
}

.sort-tab--active {
  background: var(--ctp-surface2);
  color: var(--ctp-text);
}

/* ── Status messages ───────────────────────────────────────────────────────── */
.status {
  color: var(--ui-hint-color);
  font-size: 0.875rem;
  text-align: center;
  padding: 2rem 0;
}

.status--inline {
  padding: 0 0 0.75rem;
}

.status--error { color: var(--ctp-red); }

.status--auth {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  color: var(--ui-hint-color);
}

.signin-btn {
  background: var(--ctp-mauve);
  color: var(--ctp-base);
  border: none;
  border-radius: 6px;
  padding: 0.45rem 1.1rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.signin-btn:hover { background: color-mix(in srgb, var(--ctp-mauve) 80%, var(--ctp-text)); }

/* ── Document list ─────────────────────────────────────────────────────────── */
.doc-list {
  list-style: none;
  padding: 0;
  margin: 0;
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

.doc-list__item:hover { background: var(--ctp-surface0); }
.doc-list__item--busy { cursor: progress; }

.doc-list__main {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.doc-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  line-height: 1;
  opacity: 0.85;
}

.doc-list__title {
  color: var(--ctp-text);
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.doc-list__date {
  color: var(--ctp-subtext1);
  font-size: 0.75rem;
  flex-shrink: 0;
}

.doc-list__delete {
  border: none;
  background: transparent;
  color: var(--ctp-red);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.45rem;
  border-radius: 5px;
  cursor: pointer;
  opacity: 0.72;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.doc-list__item:hover .doc-list__delete,
.doc-list__item:focus-within .doc-list__delete,
.doc-list__delete:disabled {
  opacity: 1;
}

.doc-list__delete:hover:not(:disabled) {
  background: color-mix(in srgb, var(--ctp-red) 14%, transparent);
}

.doc-list__delete:disabled {
  cursor: progress;
}

.doc-list__preview {
  margin: 0.4rem 0 0.1rem 1.5rem;
  color: var(--ctp-subtext1);
  font-size: 0.78rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Preview animation ─────────────────────────────────────────────────────── */
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}

.preview-fade-enter-to,
.preview-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
</style>
