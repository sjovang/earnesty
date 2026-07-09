<script setup lang="ts">
import { ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { runtimeConfig } from '../config/runtime'

defineEmits<{ close: [] }>()

const markdownHelp = ref('')
const markdownHelpError = ref('')
const showMarkdownHelp = ref(false)

async function toggleMarkdownHelp(): Promise<void> {
  if (showMarkdownHelp.value) {
    showMarkdownHelp.value = false
    return
  }

  markdownHelpError.value = ''

  if (!markdownHelp.value) {
    try {
      const response = await fetch('/docs/markdown.md')
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      markdownHelp.value = await response.text()
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error)
      markdownHelpError.value = `Markdown help could not be loaded (${details}).`
    }
  }

  showMarkdownHelp.value = true
}
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
      <button
        type="button"
        class="docs-link"
        @click="toggleMarkdownHelp"
      >
        {{ showMarkdownHelp ? 'Hide markdown syntax help' : 'See which syntax is available →' }}
      </button>
    </p>
    <p
      v-if="showMarkdownHelp && markdownHelpError"
      class="markdown-help-error"
    >
      {{ markdownHelpError }}
    </p>
    <pre
      v-else-if="showMarkdownHelp"
      class="markdown-help"
    >{{ markdownHelp }}</pre>
    <p class="intro">
      Project source code:
      <a
        href="https://github.com/sjovang/earnesty"
        target="_blank"
        rel="noopener noreferrer"
        class="docs-link"
      >https://github.com/sjovang/earnesty</a>
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
  background: none;
  border: none;
  color: var(--ctp-blue);
  cursor: pointer;
  font: inherit;
  padding: 0;
  text-decoration: none;
  white-space: nowrap;
}

.docs-link:hover {
  text-decoration: underline;
}

.markdown-help {
  background: var(--ctp-surface0);
  border-radius: 0.5rem;
  color: var(--ctp-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0 0 1.25rem;
  max-height: min(50vh, 32rem);
  overflow: auto;
  padding: 0.75rem;
  white-space: pre-wrap;
}

.markdown-help-error {
  color: var(--ctp-red);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.25rem;
}

</style>
