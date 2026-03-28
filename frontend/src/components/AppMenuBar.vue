<script setup lang="ts">
import AppLogo from './AppLogo.vue'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl+'

defineProps<{ documentTitle?: string }>()

defineEmits<{
  new: []
  open: []
  info: []
  publish: []
  help: []
}>()
</script>

<template>
  <nav class="menubar" aria-label="Application menu">
    <div class="menubar__inner">
      <span class="menubar__brand">
        <AppLogo :size="16" />
        Earnesty
      </span>
      <span v-if="documentTitle" class="menubar__doc-title">{{ documentTitle }}</span>
      <div class="menubar__items" role="menubar">
        <button role="menuitem" class="menubar__item" @click="$emit('new')">
          New
          <kbd>{{ mod }}N</kbd>
        </button>
        <button role="menuitem" class="menubar__item" @click="$emit('open')">
          Open
          <kbd>{{ mod }}O</kbd>
        </button>
        <button role="menuitem" class="menubar__item" @click="$emit('info')">
          Info
          <kbd>{{ mod }}I</kbd>
        </button>
        <button role="menuitem" class="menubar__item menubar__item--publish" @click="$emit('publish')">
          Publish
          <kbd>{{ mod }}⇧P</kbd>
        </button>
        <button role="menuitem" class="menubar__item" @click="$emit('help')">
          Help
          <kbd>F1</kbd>
        </button>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.menubar {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.menubar:hover {
  opacity: 1;
}

.menubar__inner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1.25rem;
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface0);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  white-space: nowrap;
}

.menubar__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ctp-subtext1);
  margin-right: 0.5rem;
}

.menubar__doc-title {
  font-size: 0.82rem;
  color: var(--ctp-subtext0);
  padding: 0 0.5rem;
  border-left: 1px solid var(--ctp-surface1);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menubar__items {
  display: flex;
  gap: 0.25rem;
}

.menubar__item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.6rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.menubar__item:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
}

.menubar__item--publish {
  color: var(--ctp-green);
}

.menubar__item--publish:hover {
  background: color-mix(in srgb, var(--ctp-green) 15%, transparent);
  color: var(--ctp-green);
}

kbd {
  font-family: inherit;
  font-size: 0.7rem;
  padding: 0.1em 0.35em;
  border: 1px solid var(--ctp-surface1);
  border-radius: 3px;
  background: var(--ctp-surface0);
  color: var(--ctp-subtext0);
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.menubar__item:hover kbd {
  opacity: 1;
}
</style>
