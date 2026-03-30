<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { useEditorStore } from '../stores/editor'

const emit = defineEmits<{ close: [] }>()

const store = useEditorStore()

// Local copy so changes only commit on Save
const form = reactive({
  title: store.meta.title,
  slug: store.meta.slug,
  publishedAt: store.meta.publishedAt
    ? store.meta.publishedAt.slice(0, 16) // trim to datetime-local format
    : '',
  tags: [...store.meta.tags],
})

const slugManuallyEdited = ref(!!store.meta.slug)
const tagInput = ref('')

// Auto-generate slug from title unless the user has manually edited it
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

function save() {
  store.updateMeta({
    title: form.title,
    slug: form.slug,
    publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : '',
    tags: form.tags,
  })
  emit('close')
}
</script>

<template>
  <BaseModal
    title="Document info"
    @close="emit('close')"
  >
    <form
      class="form"
      @submit.prevent="save"
    >
      <label class="field">
        <span class="field__label">Title</span>
        <input
          v-model="form.title"
          class="field__input"
          type="text"
          placeholder="Untitled"
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

      <div class="form__actions">
        <button
          type="button"
          class="btn btn--ghost"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn--primary"
        >
          Save
        </button>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

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

/* ── Tag input ────────────────────────────────────────────────────────────── */
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

/* ── Actions ─────────────────────────────────────────────────────────────── */
.form__actions {
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

.btn--primary:hover {
  filter: brightness(1.1);
}
</style>
