<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { useEditorStore, type DocumentMeta } from '../stores/editor'

const emit = defineEmits<{
  close: []
  publish: [meta: DocumentMeta]
}>()

const store = useEditorStore()

const activeTab = ref<'required' | 'optional'>('required')

const form = reactive({
  title: store.meta.title,
  slug: store.meta.slug,
  publishedAt: store.meta.publishedAt
    ? store.meta.publishedAt.slice(0, 16)
    : '',
  tags: [...store.meta.tags],
})

const slugManuallyEdited = ref(!!store.meta.slug)
const tagInput = ref('')

// Auto-generate slug from title unless manually edited
watch(
  () => form.title,
  (val) => {
    if (!slugManuallyEdited.value) {
      form.slug = store.slugify(val)
    }
  },
)

function onSlugInput() {
  slugManuallyEdited.value = true
}

const canPublish = computed(() => !!form.title.trim() && !!form.slug.trim())

// ── Tags ──────────────────────────────────────────────────────────────────────
function addTag() {
  const tag = tagInput.value.trim().replace(/,+$/, '')
  if (tag && !form.tags.includes(tag)) {
    form.tags.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  form.tags = form.tags.filter((t) => t !== tag)
}

function onTagKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addTag()
  } else if (e.key === 'Backspace' && tagInput.value === '' && form.tags.length) {
    form.tags.pop()
  }
}

// ── Publish ───────────────────────────────────────────────────────────────────
function onPublish() {
  if (!canPublish.value) return
  emit('publish', {
    title: form.title.trim(),
    slug: form.slug.trim(),
    publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
    tags: form.tags,
  })
}
</script>

<template>
  <BaseModal
    title="Publish document"
    @close="emit('close')"
  >
    <div class="publish-modal">
      <!-- Tabs -->
      <div
        class="tabs"
        role="tablist"
      >
        <button
          role="tab"
          :class="['tabs__tab', { 'tabs__tab--active': activeTab === 'required' }]"
          :aria-selected="activeTab === 'required'"
          @click="activeTab = 'required'"
        >
          Required
        </button>
        <button
          role="tab"
          :class="['tabs__tab', { 'tabs__tab--active': activeTab === 'optional' }]"
          :aria-selected="activeTab === 'optional'"
          @click="activeTab = 'optional'"
        >
          Optional
        </button>
      </div>

      <!-- Required tab -->
      <div
        v-show="activeTab === 'required'"
        role="tabpanel"
        class="tab-panel"
      >
        <label class="field">
          <span class="field__label">Title</span>
          <input
            v-model="form.title"
            class="field__input"
            type="text"
            placeholder="Give your document a title"
            autofocus
          >
        </label>

        <label class="field">
          <span class="field__label">Slug</span>
          <input
            v-model="form.slug"
            class="field__input field__input--mono"
            type="text"
            placeholder="auto-generated-from-title"
            @input="onSlugInput"
          >
        </label>
      </div>

      <!-- Optional tab -->
      <div
        v-show="activeTab === 'optional'"
        role="tabpanel"
        class="tab-panel"
      >
        <label class="field">
          <span class="field__label">Published at</span>
          <input
            v-model="form.publishedAt"
            class="field__input"
            type="datetime-local"
          >
        </label>

        <div class="field">
          <span class="field__label">Tags</span>
          <div class="tag-input">
            <span
              v-for="tag in form.tags"
              :key="tag"
              class="tag"
            >
              {{ tag }}
              <button
                type="button"
                class="tag__remove"
                @click="removeTag(tag)"
              >✕</button>
            </span>
            <input
              v-model="tagInput"
              class="tag-input__field"
              type="text"
              placeholder="Add tag…"
              @keydown="onTagKeydown"
              @blur="addTag"
            >
          </div>
          <span class="field__hint">Press Enter or comma to add a tag</span>
        </div>
      </div>

      <!-- Actions -->
      <div class="actions">
        <button
          class="btn btn--ghost"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="btn btn--primary"
          :disabled="!canPublish"
          @click="onPublish"
        >
          Publish
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.publish-modal {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--ctp-surface0);
}

.tabs__tab {
  flex: 1;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--ctp-subtext0);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;
}

.tabs__tab:hover {
  color: var(--ctp-text);
}

.tabs__tab--active {
  color: var(--ctp-mauve);
  border-bottom-color: var(--ctp-mauve);
}

/* ── Tab panels ────────────────────────────────────────────────────────────── */
.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Fields ────────────────────────────────────────────────────────────────── */
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--ctp-subtext0);
}

.field__input {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  color: var(--ctp-text);
  font-size: 0.9rem;
  padding: 0.45rem 0.65rem;
  outline: none;
  transition: border-color 0.15s ease;
  width: 100%;
  box-sizing: border-box;
  color-scheme: dark;
}

.field__input:focus {
  border-color: var(--ctp-mauve);
}

.field__input--mono {
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-size: 0.82rem;
  color: var(--ctp-sapphire);
}

.field__hint {
  font-size: 0.72rem;
  color: var(--ctp-overlay1);
}

/* ── Tag input ─────────────────────────────────────────────────────────────── */
.tag-input {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.35rem 0.5rem;
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 6px;
  min-height: 2.4rem;
  align-items: center;
  transition: border-color 0.15s ease;
}

.tag-input:focus-within {
  border-color: var(--ctp-mauve);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.15rem 0.45rem;
  background: var(--ctp-surface1);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--ctp-lavender);
}

.tag__remove {
  background: none;
  border: none;
  color: var(--ctp-overlay1);
  font-size: 0.65rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.1s ease;
}

.tag__remove:hover {
  color: var(--ctp-red);
}

.tag-input__field {
  flex: 1;
  min-width: 6rem;
  background: none;
  border: none;
  outline: none;
  color: var(--ctp-text);
  font-size: 0.9rem;
}

/* ── Actions ───────────────────────────────────────────────────────────────── */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.btn {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  border: 1px solid transparent;
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
