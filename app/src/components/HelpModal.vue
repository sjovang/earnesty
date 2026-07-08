<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import { runtimeConfig } from '../config/runtime'

defineEmits<{ close: [] }>()
</script>

<template>
  <BaseModal
    title="Help"
    @close="$emit('close')"
  >
    <p class="intro">
      {{ runtimeConfig.app.name }} is a distraction-free writing environment. Click anywhere on the page and start
      typing. Your words are the only thing that matters.
    </p>
    <p class="intro">
      Markdown is supported for formatting.
      <a
        href="https://github.com/sjovang/earnesty/blob/main/docs/markdown.md"
        target="_blank"
        rel="noopener noreferrer"
        class="docs-link"
      >See which syntax is available →</a>
    </p>
  </BaseModal>
</template>

<style scoped>
.intro {
  color: var(--ctp-subtext1);
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.docs-link {
  color: var(--ctp-blue);
  text-decoration: none;
  white-space: nowrap;
}

.docs-link:hover {
  text-decoration: underline;
}

</style>
