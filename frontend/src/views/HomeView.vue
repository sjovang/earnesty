<script setup lang="ts">
import { useSettingsStore } from '../stores/settings'

const { settings } = useSettingsStore()
</script>

<template>
  <main
    class="editor"
    :style="{ fontSize: settings.fontSize + 'px', lineHeight: settings.lineSpacing }"
  >
    <p class="placeholder">Start writing…</p>
  </main>
</template>

<style scoped>
.editor {
  max-width: 680px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
  min-height: 100vh;
}

.placeholder {
  color: var(--ctp-overlay1);
  font-style: italic;
}
</style>
