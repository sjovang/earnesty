<script setup lang="ts">
import BaseModal from './BaseModal.vue'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl+'

defineEmits<{ close: [] }>()

const shortcuts = [
  { keys: `${mod}N`, description: 'New document' },
  { keys: `${mod}O`, description: 'Open document' },
  { keys: 'F1', description: 'Show this help' },
  { keys: 'Tab', description: 'Insert tab character' },
  { keys: 'Esc', description: 'Close modal' },
]
</script>

<template>
  <BaseModal title="Help" @close="$emit('close')">
    <p class="intro">
      Ernesty is a distraction-free writing environment. Click anywhere on the page and start
      typing. Your words are the only thing that matters.
    </p>

    <h3 class="section-title">Keyboard shortcuts</h3>
    <table class="shortcuts">
      <tbody>
        <tr v-for="s in shortcuts" :key="s.keys">
          <td><kbd>{{ s.keys }}</kbd></td>
          <td>{{ s.description }}</td>
        </tr>
      </tbody>
    </table>
  </BaseModal>
</template>

<style scoped>
.intro {
  color: var(--ctp-subtext1);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--ctp-subtext0);
  margin-bottom: 0.6rem;
}

.shortcuts {
  width: 100%;
  border-collapse: collapse;
}

.shortcuts td {
  padding: 0.35rem 0;
  font-size: 0.88rem;
  color: var(--ctp-subtext1);
  vertical-align: middle;
}

.shortcuts td:first-child {
  width: 6rem;
}

kbd {
  font-family: inherit;
  font-size: 0.75rem;
  padding: 0.15em 0.4em;
  border: 1px solid var(--ctp-surface1);
  border-radius: 3px;
  background: var(--ctp-surface0);
  color: var(--ctp-subtext0);
}
</style>
