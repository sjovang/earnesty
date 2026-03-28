<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { BubbleMenu } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'

const props = defineProps<{ editor: Editor }>()

const editing = ref(false)
const urlInput = ref<HTMLInputElement | null>(null)
const draftUrl = ref('')

const currentUrl = computed(() => props.editor.getAttributes('link').href ?? '')

function shouldShow() {
  return props.editor.isActive('link')
}

function truncate(url: string, max = 42) {
  return url.length > max ? url.slice(0, max) + '…' : url
}

async function startEdit() {
  draftUrl.value = currentUrl.value
  editing.value = true
  await nextTick()
  urlInput.value?.focus()
  urlInput.value?.select()
}

function applyUrl() {
  const url = draftUrl.value.trim()
  if (url) {
    props.editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }
  editing.value = false
}

function cancelEdit() {
  editing.value = false
  props.editor.commands.focus()
}

function unlink() {
  props.editor.chain().focus().extendMarkRange('link').unsetLink().run()
  editing.value = false
}

function openInTab() {
  window.open(currentUrl.value, '_blank', 'noopener,noreferrer')
}

function onBubbleHide() {
  editing.value = false
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :should-show="shouldShow"
    :tippy-options="{ placement: 'bottom-start', offset: [0, 8], onHide: onBubbleHide }"
    class="link-bubble"
  >
    <!-- View mode: show URL + actions -->
    <template v-if="!editing">
      <span class="link-bubble__url" :title="currentUrl">{{ truncate(currentUrl) }}</span>
      <div class="link-bubble__sep" />
      <button class="link-bubble__btn" title="Edit link" @click="startEdit">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 2l2 2-5.5 5.5H2.5V8L8 2z"/>
        </svg>
      </button>
      <button class="link-bubble__btn" title="Remove link" @click="unlink">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4.5 7.5l3-3M2 10l1.5-1.5M8.5 3.5L10 2M5 4.5l-1.5 1A2.12 2.12 0 006.5 8.5l1-1.5M7 7.5l1.5-1A2.12 2.12 0 005.5 3.5L4.5 5"/>
        </svg>
      </button>
      <button class="link-bubble__btn" title="Open in new tab" @click="openInTab">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 2H2v8h8V7M7 2h3v3M10 2L6 6"/>
        </svg>
      </button>
    </template>

    <!-- Edit mode: URL input -->
    <template v-else>
      <input
        ref="urlInput"
        v-model="draftUrl"
        class="link-bubble__input"
        type="url"
        placeholder="https://…"
        spellcheck="false"
        @keydown.enter.prevent="applyUrl"
        @keydown.escape.prevent="cancelEdit"
      />
      <button class="link-bubble__btn link-bubble__btn--confirm" title="Apply" @click="applyUrl">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 6l3 3 5-5"/>
        </svg>
      </button>
      <button class="link-bubble__btn" title="Cancel" @click="cancelEdit">
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 2l8 8M10 2L2 10"/>
        </svg>
      </button>
    </template>
  </BubbleMenu>
</template>

<style scoped>
.link-bubble {
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

.link-bubble__url {
  color: var(--ctp-blue);
  max-width: 280px;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 4px;
  cursor: default;
}

.link-bubble__sep {
  width: 1px;
  height: 14px;
  background: var(--ctp-surface1);
  margin: 0 2px;
  flex-shrink: 0;
}

.link-bubble__btn {
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

.link-bubble__btn:hover {
  background: var(--ctp-surface1);
  color: var(--ctp-text);
}

.link-bubble__btn--confirm:hover {
  color: var(--ctp-green);
}

.link-bubble__input {
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

.link-bubble__input:focus {
  border-color: var(--ctp-blue);
}

.link-bubble__input::placeholder {
  color: var(--ctp-overlay0);
}
</style>
