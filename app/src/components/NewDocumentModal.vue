<script setup lang="ts">
import { ref, computed } from 'vue'
import BaseModal from './BaseModal.vue'
import { apiCreateDraft } from '../services/api'
import { useEditorStore } from '../stores/editor'
import { runtimeConfig } from '../config/runtime'

const emit = defineEmits<{
  close: []
  created: []
}>()

const editorStore = useEditorStore()

const title = ref('')
const selectedType = ref(editorStore.meta.documentType || runtimeConfig.content.defaultType)
const creating = ref(false)
const error = ref<string | null>(null)
const NEW_DRAFT_START_PLACEHOLDER = 'Start writing here…'

// ── Slug derivation ───────────────────────────────────────────────────────────
const slug = computed(() => editorStore.slugify(title.value))

// ── Create ────────────────────────────────────────────────────────────────────
async function create() {
  const trimmedTitle = title.value.trim()
  if (!trimmedTitle) return

  creating.value = true
  error.value = null
  try {
    const doc = await apiCreateDraft(trimmedTitle, slug.value, selectedType.value)
    const initialHtml = `<h1 data-type="title">${escapeHtml(trimmedTitle)}</h1><p data-start-placeholder="${escapeHtml(NEW_DRAFT_START_PLACEHOLDER)}"></p>`
    editorStore.openDocument(doc, initialHtml)
    emit('created')
    emit('close')
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : 'Failed to create document.'
  } finally {
    creating.value = false
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.isComposing) {
    e.preventDefault()
    create()
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
</script>

<template>
  <BaseModal
    title="New document"
    @close="$emit('close')"
  >
    <div class="new-doc">
      <label class="field">
        <span class="field__label">Type</span>
        <select
          v-model="selectedType"
          class="field__input"
          :disabled="creating"
        >
          <option
            v-for="typeName in runtimeConfig.content.typeOrder"
            :key="typeName"
            :value="typeName"
          >
            {{ runtimeConfig.content.types[typeName]?.label ?? typeName }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="field__label">Title</span>
        <input
          v-model="title"
          class="field__input"
          type="text"
          placeholder="Untitled document"
          autofocus
          spellcheck="false"
          :disabled="creating"
          @keydown="onKeydown"
        >
      </label>

      <label class="field">
        <span class="field__label">Slug <span class="field__hint">(auto-generated)</span></span>
        <div class="field__slug">{{ slug || '—' }}</div>
      </label>

      <p
        v-if="error"
        class="error"
      >
        {{ error }}
      </p>

      <div class="actions">
        <button
          class="btn btn--ghost"
          :disabled="creating"
          @click="$emit('close')"
        >
          Cancel
        </button>
        <button
          class="btn btn--primary"
          :disabled="!title.trim() || creating"
          @click="create"
        >
          {{ creating ? 'Creating…' : 'Create draft' }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.new-doc {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Fields ──────────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--ui-label-color);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.field__hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--ui-hint-color);
}

.field__input {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  color: var(--ctp-text);
  font-size: 0.95rem;
  padding: 0.55rem 0.75rem;
  outline: none;
  transition: border-color 0.15s ease;
  width: 100%;
  box-sizing: border-box;
}

.field__input::placeholder { color: var(--ui-placeholder-color); }
.field__input:focus { border-color: var(--ctp-mauve); }
.field__input:disabled { opacity: 0.5; }

.field__slug {
  font-size: 0.85rem;
  font-family: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;
  color: var(--ctp-subtext1);
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface0);
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  min-height: 2.2rem;
}

/* ── Error ───────────────────────────────────────────────────────────────────── */
.error {
  font-size: 0.85rem;
  color: var(--ctp-red);
  margin: 0;
}

/* ── Actions ─────────────────────────────────────────────────────────────────── */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding-top: 0.25rem;
}

.btn {
  border: 1px solid transparent;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.btn--ghost {
  background: transparent;
  border-color: var(--ctp-surface1);
  color: var(--ctp-subtext1);
}

.btn--ghost:hover {
  background: var(--ctp-surface0);
}

.btn--primary {
  background: var(--ctp-mauve);
  color: var(--ctp-base);
}

.btn--primary:not(:disabled):hover {
  filter: brightness(1.1);
}
</style>
