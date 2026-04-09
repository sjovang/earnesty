<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import type { Editor } from '@tiptap/core'
import { LANGUAGES } from '../constants/languages'

const props = defineProps<{
  nodeType: 'image' | 'codeBlock'
  pos: number
  x: number
  y: number
  editor: Editor
}>()

const emit = defineEmits<{ close: [] }>()

const popover = ref<HTMLElement | null>(null)
const language = ref('')
const altText = ref('')

// Load current node attributes whenever the popover opens
watch(
  () => [props.pos, props.nodeType] as const,
  ([pos, nodeType]) => {
    if (pos < 0) return
    const node = props.editor.state.doc.nodeAt(pos)
    if (!node) return
    if (nodeType === 'codeBlock') {
      language.value = (node.attrs.language as string | null) ?? ''
    } else if (nodeType === 'image') {
      altText.value = (node.attrs.alt as string | null) ?? ''
    }
  },
  { immediate: true },
)

function apply() {
  if (props.nodeType === 'codeBlock') {
    props.editor
      .chain()
      .setNodeSelection(props.pos)
      .updateAttributes('codeBlock', { language: language.value || null })
      .focus()
      .run()
  } else if (props.nodeType === 'image') {
    props.editor
      .chain()
      .setNodeSelection(props.pos)
      .updateAttributes('image', { alt: altText.value.trim() || null })
      .focus()
      .run()
  }
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  if (e.key === 'Enter' && props.nodeType === 'image') {
    e.preventDefault()
    apply()
  }
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Element
  if (
    popover.value &&
    !popover.value.contains(target) &&
    !target.closest('.block-settings-cog')
  ) {
    emit('close')
  }
}

// Keep the popover inside the viewport horizontally
const adjustedX = ref(props.x)
onMounted(() => {
  if (popover.value) {
    const rect = popover.value.getBoundingClientRect()
    const overflow = rect.right - window.innerWidth + 12
    if (overflow > 0) adjustedX.value = props.x - overflow
  }
  document.addEventListener('keydown', onKeydown)
  setTimeout(() => document.addEventListener('mousedown', onClickOutside), 50)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div
      ref="popover"
      class="block-settings-popover"
      role="dialog"
      :aria-label="nodeType === 'image' ? 'Image settings' : 'Code block settings'"
      :style="{ left: adjustedX + 'px', top: y + 'px' }"
    >
      <!-- Code block: language selector -->
      <template v-if="nodeType === 'codeBlock'">
        <label class="bsp__label">Language</label>
        <select
          v-model="language"
          class="bsp__select"
          autofocus
          @change="apply"
        >
          <option
            v-for="lang in LANGUAGES"
            :key="lang.value"
            :value="lang.value"
          >
            {{ lang.label }}
          </option>
        </select>
      </template>

      <!-- Image: alt text input -->
      <template v-else-if="nodeType === 'image'">
        <label class="bsp__label">Alt text <span class="bsp__optional">(optional)</span></label>
        <div class="bsp__row">
          <input
            v-model="altText"
            type="text"
            class="bsp__input"
            placeholder="Describe the image…"
            autofocus
            spellcheck="false"
          >
          <button
            class="bsp__apply"
            title="Apply"
            @click="apply"
          >
            <svg
              viewBox="0 0 12 12"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
          </button>
        </div>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.block-settings-popover {
  position: fixed;
  z-index: 400;
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface1);
  border-radius: 8px;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ctp-crust) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 200px;
  padding: 0.65rem 0.75rem;
  animation: pop-in 0.12s ease;
}

.bsp__label {
  color: var(--ctp-subtext0);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.bsp__optional {
  color: var(--ctp-overlay0);
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.bsp__select {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface2);
  border-radius: 5px;
  color: var(--ctp-text);
  font-size: 0.85rem;
  outline: none;
  padding: 0.3rem 0.5rem;
  transition: border-color 0.12s ease;
  width: 100%;
}

.bsp__select:focus {
  border-color: var(--ctp-mauve);
}

.bsp__row {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.bsp__input {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface2);
  border-radius: 5px;
  color: var(--ctp-text);
  flex: 1;
  font-size: 0.85rem;
  outline: none;
  padding: 0.3rem 0.5rem;
  transition: border-color 0.12s ease;
}

.bsp__input:focus {
  border-color: var(--ctp-mauve);
}

.bsp__input::placeholder {
  color: var(--ctp-overlay0);
}

.bsp__apply {
  align-items: center;
  background: transparent;
  border: 1px solid var(--ctp-surface2);
  border-radius: 5px;
  color: var(--ctp-subtext1);
  cursor: pointer;
  display: flex;
  height: 28px;
  justify-content: center;
  transition: background 0.1s ease, color 0.1s ease;
  width: 28px;
}

.bsp__apply:hover {
  background: var(--ctp-surface1);
  color: var(--ctp-green);
}

@keyframes pop-in {
  from { transform: scale(0.95) translateY(-4px); opacity: 0 }
  to   { transform: scale(1) translateY(0);       opacity: 1 }
}
</style>
