<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { runtimeConfig } from '../config/runtime'

defineEmits<{ close: [] }>()

type MarkdownHelpItem = {
  type: 'paragraph' | 'code'
  content: string
}

type MarkdownHelpSection = {
  heading: string
  items: MarkdownHelpItem[]
}

type MarkdownHelpContent = {
  title: string
  intro: string[]
  sections: MarkdownHelpSection[]
}

const markdownHelp = ref('')
const markdownHelpError = ref('')
const showMarkdownHelp = ref(false)
const markdownHelpContent = computed(() => parseMarkdownHelp(markdownHelp.value))

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

function parseMarkdownHelp(markdown: string): MarkdownHelpContent {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const sections: MarkdownHelpSection[] = []
  const intro: string[] = []
  let title = 'Markdown syntax'
  let currentSection: MarkdownHelpSection | undefined
  let paragraphBuffer: string[] = []
  let codeBuffer: string[] = []
  let inCodeBlock = false

  const pushParagraph = () => {
    const paragraph = paragraphBuffer.join('\n').trim()
    paragraphBuffer = []
    if (!paragraph) return
    if (currentSection) {
      currentSection.items.push({ type: 'paragraph', content: paragraph })
      return
    }
    intro.push(paragraph)
  }

  const pushCode = () => {
    const snippet = codeBuffer.join('\n').trim()
    codeBuffer = []
    if (!snippet) return
    if (currentSection) {
      currentSection.items.push({ type: 'code', content: snippet })
      return
    }
    intro.push(snippet)
  }

  lines.forEach((line, index) => {
    const trimmed = line.trim()
    if (!index && trimmed.startsWith('# ')) {
      title = trimmed.slice(2).trim()
      return
    }

    if (inCodeBlock) {
      if (trimmed.startsWith('```')) {
        inCodeBlock = false
        pushCode()
        return
      }
      codeBuffer.push(line)
      return
    }

    if (trimmed.startsWith('```')) {
      pushParagraph()
      inCodeBlock = true
      return
    }

    if (/^-{3,}$/.test(trimmed)) {
      pushParagraph()
      return
    }

    const sectionHeading = trimmed.match(/^##\s+(.+)$/)
    if (sectionHeading) {
      const heading = sectionHeading[1]?.trim()
      if (!heading) return
      pushParagraph()
      currentSection = {
        heading,
        items: [],
      }
      sections.push(currentSection)
      return
    }

    if (!trimmed) {
      pushParagraph()
      return
    }

    paragraphBuffer.push(line)
  })

  if (inCodeBlock) {
    pushCode()
  }
  pushParagraph()

  return {
    title,
    intro,
    sections,
  }
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
    <div
      v-else-if="showMarkdownHelp"
      class="markdown-help-panel"
    >
      <h3 class="markdown-help-title">
        {{ markdownHelpContent.title }}
      </h3>
      <p
        v-for="(paragraph, index) in markdownHelpContent.intro"
        :key="`intro-${index}`"
        class="markdown-help-intro"
      >
        {{ paragraph }}
      </p>
      <section
        v-for="(section, sectionIndex) in markdownHelpContent.sections"
        :key="`section-${sectionIndex}`"
        class="markdown-help-section"
      >
        <h4 class="markdown-help-section-title">
          {{ section.heading }}
        </h4>
        <template
          v-for="(item, itemIndex) in section.items"
          :key="`item-${sectionIndex}-${itemIndex}`"
        >
          <p
            v-if="item.type === 'paragraph'"
            class="markdown-help-text"
          >
            {{ item.content }}
          </p>
          <pre
            v-else
            class="markdown-help-example"
          ><code>{{ item.content }}</code></pre>
        </template>
      </section>
    </div>
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

.markdown-help-panel {
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 0.5rem;
  margin: 0 0 1.25rem;
  max-height: min(50vh, 32rem);
  overflow: auto;
  padding: 1rem;
}

.markdown-help-title {
  color: var(--ctp-text);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.75rem;
}

.markdown-help-intro {
  color: var(--ctp-subtext0);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 0.75rem;
}

.markdown-help-section {
  background: var(--ctp-base);
  border: 1px solid var(--ctp-surface1);
  border-radius: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
}

.markdown-help-section-title {
  color: var(--ctp-text);
  font-size: 0.9rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
}

.markdown-help-text {
  color: var(--ctp-subtext1);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0 0 0.5rem;
  white-space: pre-wrap;
}

.markdown-help-example {
  background: var(--ctp-mantle);
  border-radius: 0.375rem;
  color: var(--ctp-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.8rem;
  line-height: 1.45;
  margin: 0.25rem 0 0.5rem;
  overflow: auto;
  padding: 0.625rem 0.75rem;
  white-space: pre;
}

.markdown-help-error {
  color: var(--ctp-red);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.25rem;
}

</style>
