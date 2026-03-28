<script setup lang="ts">
const isMac = navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl+'

defineEmits<{
  new: []
  open: []
  help: []
}>()
</script>

<template>
  <nav class="menubar" aria-label="Application menu">
    <div class="menubar__inner">
      <span class="menubar__brand">Ernesty</span>
      <div class="menubar__items" role="menubar">
        <button role="menuitem" class="menubar__item" @click="$emit('new')">
          New
          <kbd>{{ mod }}N</kbd>
        </button>
        <button role="menuitem" class="menubar__item" @click="$emit('open')">
          Open
          <kbd>{{ mod }}O</kbd>
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
  top: 0;
  left: 0;
  right: 0;
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
  border-bottom: 1px solid var(--ctp-surface0);
  backdrop-filter: blur(8px);
}

.menubar__brand {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ctp-subtext1);
  margin-right: 0.5rem;
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

kbd {
  font-family: inherit;
  font-size: 0.7rem;
  padding: 0.1em 0.35em;
  border: 1px solid var(--ctp-surface1);
  border-radius: 3px;
  background: var(--ctp-surface0);
  color: var(--ctp-subtext0);
  line-height: 1;
}
</style>
