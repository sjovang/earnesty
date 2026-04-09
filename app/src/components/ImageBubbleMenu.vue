<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { BubbleMenu } from '@tiptap/extension-bubble-menu'
import type { Editor } from '@tiptap/core'
import type { ImageAsset } from '../services/api'

const props = defineProps<{ editor: Editor }>()
const emit = defineEmits<{ replace: [] }>()

const editingAlt = ref(false)
const altInput = ref<HTMLInputElement | null>(null)
const draftAlt = ref('')

const currentAlt = computed(() => (props.editor.getAttributes('image').alt as string | undefined) ?? '')

function shouldShow() {
  return props.editor.isActive('image')
}

async function startAltEdit() {
  draftAlt.value = currentAlt.value
  editingAlt.value = true
  await nextTick()
  altInput.value?.focus()
  altInput.value?.select()
}

function applyAlt() {
  props.editor
    .chain()
    .focus()
    .updateAttributes('image', { alt: draftAlt.value.trim() || null })
    .run()
  editingAlt.value = false
}

function cancelAltEdit() {
  editingAlt.value = false
  props.editor.commands.focus()
}

function removeImage() {
  props.editor.chain().focus().deleteSelection().run()
}

function onBubbleHide() {
  editingAlt.value = false
}

/** Called by the parent after the user picks a replacement image */
function applyReplacement(asset: ImageAsset) {
  props.editor.chain().focus().updateAttributes('image', { src: asset.url }).run()
}

defineExpose({ applyReplacement })
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :should-show="shouldShow"
    :tippy-options="{ placement: 'top-start', offset: [0, 8], onHide: onBubbleHide }"
    class="img-bubble"
  >
    <!-- Alt text display / edit -->
    <template v-if="!editingAlt">
      <span
        class="img-bubble__alt"
        :class="{ 'img-bubble__alt--empty': !currentAlt }"
        :title="currentAlt || 'No alt text'"
        @click="startAltEdit"
      >
        {{ currentAlt || 'Alt text' }}
      </span>
      <div class="img-bubble__sep" />
      <button
        class="img-bubble__btn"
        title="Edit alt text"
        @click="startAltEdit"
      >
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M8 2l2 2-5.5 5.5H2.5V8L8 2z" />
        </svg>
      </button>
      <button
        class="img-bubble__btn"
        title="Replace image"
        @click="emit('replace')"
      >
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 4a4 4 0 018 0M10 8a4 4 0 01-8 0M7.5 4.5l-1.5-2-1.5 2M4.5 7.5l1.5 2 1.5-2" />
        </svg>
      </button>
      <button
        class="img-bubble__btn img-bubble__btn--danger"
        title="Remove image"
        @click="removeImage"
      >
        <svg
          viewBox="0 0 12 12"
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 3h8M4 3V2h4v1M5 5v4M7 5v4M3 3l.5 7h5l.5-7" />
        </svg>
      </button>
    </template>

    <!-- Alt text input -->
    <template v-else>
      <input
        ref="altInput"
        v-model="draftAlt"
        class="img-bubble__input"
        type="text"
        placeholder="Describe the image…"
        spellcheck="false"
        @keydown.enter.prevent="applyAlt"
        @keydown.escape.prevent="cancelAltEdit"
      >
      <button
        class="img-bubble__btn img-bubble__btn--confirm"
        title="Apply"
        @click="applyAlt"
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
      <button
        class="img-bubble__btn"
        title="Cancel"
        @click="cancelAltEdit"
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
          <path d="M2 2l8 8M10 2L2 10" />
        </svg>
      </button>
    </template>
  </BubbleMenu>
</template>

<style scoped>
.img-bubble {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface1);
  border-radius: 7px;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ctp-crust) 40%, transparent);
  font-size: 0.78rem;
  white-space: nowrap;
  z-index: 200;
}

.img-bubble__alt {
  color: var(--ctp-subtext1);
  cursor: pointer;
  max-width: 200px;
  overflow: hidden;
  padding: 0 4px;
  text-overflow: ellipsis;
  transition: color 0.1s ease;
}

.img-bubble__alt--empty {
  color: var(--ctp-overlay0);
  font-style: italic;
}

.img-bubble__alt:hover {
  color: var(--ctp-text);
}

.img-bubble__sep {
  width: 1px;
  height: 14px;
  background: var(--ctp-surface1);
  margin: 0 2px;
  flex-shrink: 0;
}

.img-bubble__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ctp-subtext1);
  cursor: pointer;
  transition: background 0.1s ease, color 0.1s ease;
  flex-shrink: 0;
}

.img-bubble__btn:hover {
  background: var(--ctp-surface1);
  color: var(--ctp-text);
}

.img-bubble__btn--confirm:hover {
  color: var(--ctp-green);
}

.img-bubble__btn--danger:hover {
  color: var(--ctp-red);
}

.img-bubble__input {
  width: 220px;
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface2);
  border-radius: 4px;
  color: var(--ctp-text);
  font-size: 0.78rem;
  padding: 3px 7px;
  outline: none;
  transition: border-color 0.12s ease;
}

.img-bubble__input:focus {
  border-color: var(--ctp-mauve);
}

.img-bubble__input::placeholder {
  color: var(--ctp-overlay0);
}
</style>
