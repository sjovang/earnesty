<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { useEditorStore, type DocumentMeta } from '../stores/editor'
import { getContentTypeConfig } from '../config/runtime'

const emit = defineEmits<{
  close: []
  publish: [meta: DocumentMeta]
}>()

const store = useEditorStore()
const typeConfig = computed(() => getContentTypeConfig(store.meta.documentType))
const fields = computed(() => typeConfig.value.metadataFields)

const values = reactive<Record<string, unknown>>({})
for (const field of fields.value) {
  values[field.key] = store.getMetaFieldValue(field.key)
}

const slugManuallyEdited = ref(!!String(values['slug'] ?? '').trim())

watch(
  () => values['title'],
  (title) => {
    if (slugManuallyEdited.value || !fields.value.some((field) => field.key === 'slug')) return
    if (typeof title === 'string') {
      values['slug'] = store.slugify(title)
    }
  },
)

function onSlugInput() {
  slugManuallyEdited.value = true
}

function parseStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function readFieldValue(key: string, type: string): unknown {
  const value = values[key]
  switch (type) {
    case 'string':
    case 'slug':
    case 'datetime':
      return typeof value === 'string' ? value.trim() : ''
    case 'stringArray':
      return parseStringArray(value)
    case 'boolean':
      return value === true
    default:
      return value
  }
}

const canPublish = computed(() =>
  fields.value.every((field) => {
    if (!field.required) return true
    const value = readFieldValue(field.key, field.type)
    if (typeof value === 'string') return value.trim().length > 0
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'boolean') return value
    return value !== null && value !== undefined
  }))

function buildMeta(): DocumentMeta {
  const custom = { ...store.meta.custom }
  let title = store.meta.title
  let slug = store.meta.slug
  let publishedAt = store.meta.publishedAt
  let tags = [...store.meta.tags]

  for (const field of fields.value) {
    const value = readFieldValue(field.key, field.type)
    if (field.key === 'title' && typeof value === 'string') {
      title = value
      continue
    }
    if (field.key === 'slug' && typeof value === 'string') {
      slug = value
      continue
    }
    if (field.key === 'publishedAt' && typeof value === 'string') {
      publishedAt = value ? new Date(value).toISOString() : ''
      continue
    }
    if (field.key === 'tags' && Array.isArray(value)) {
      tags = value.filter((item): item is string => typeof item === 'string')
      continue
    }
    custom[field.key] = value
  }

  return {
    documentType: store.meta.documentType,
    title,
    slug,
    publishedAt,
    tags,
    custom,
  }
}

function formatDateTimeValue(value: unknown): string {
  if (typeof value !== 'string' || !value) return ''
  return value.slice(0, 16)
}

function saveAndPublish() {
  if (!canPublish.value) return
  emit('publish', buildMeta())
}
</script>

<template>
  <BaseModal
    :title="`Metadata — ${typeConfig.label}`"
    @close="emit('close')"
  >
    <div class="publish-modal">
      <div
        v-for="field in fields"
        :key="field.key"
        class="field"
      >
        <label
          class="field__label"
          :for="`meta-${field.key}`"
        >
          {{ field.label }}<span v-if="field.required"> *</span>
        </label>
        <input
          v-if="field.type === 'string' || field.type === 'slug'"
          :id="`meta-${field.key}`"
          v-model="values[field.key]"
          class="field__input"
          :class="{ 'field__input--mono': field.type === 'slug' }"
          type="text"
          :placeholder="field.type === 'slug' ? 'auto-generated-from-title' : ''"
          @input="field.type === 'slug' && onSlugInput()"
        >
        <input
          v-else-if="field.type === 'datetime'"
          :id="`meta-${field.key}`"
          :value="formatDateTimeValue(values[field.key])"
          class="field__input"
          type="datetime-local"
          @input="values[field.key] = ($event.target as HTMLInputElement).value"
        >
        <input
          v-else-if="field.type === 'stringArray'"
          :id="`meta-${field.key}`"
          :value="Array.isArray(values[field.key]) ? (values[field.key] as string[]).join(', ') : String(values[field.key] ?? '')"
          class="field__input"
          type="text"
          placeholder="comma,separated,values"
          @input="values[field.key] = ($event.target as HTMLInputElement).value"
        >
        <label
          v-else-if="field.type === 'boolean'"
          class="field__toggle"
        >
          <input
            :id="`meta-${field.key}`"
            v-model="values[field.key]"
            type="checkbox"
          >
          <span>Enabled</span>
        </label>
      </div>

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
          @click="saveAndPublish"
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
  gap: 0.9rem;
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
  box-sizing: border-box;
  color-scheme: dark;
}

.field__input:focus {
  border-color: var(--ctp-mauve);
}

.field__input--mono {
  font-family: ui-monospace, 'Cascadia Code', monospace;
  color: var(--ctp-sapphire);
}

.field__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ctp-text);
  font-size: 0.9rem;
}

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
