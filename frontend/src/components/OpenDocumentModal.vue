<script setup lang="ts">
import BaseModal from './BaseModal.vue'

defineEmits<{ close: [] }>()

// Placeholder — document list will be populated from Sanity
const documents: { id: string; title: string; updatedAt: string }[] = []
</script>

<template>
  <BaseModal title="Open document" @close="$emit('close')">
    <template v-if="documents.length">
      <ul class="doc-list">
        <li v-for="doc in documents" :key="doc.id" class="doc-list__item">
          <span class="doc-list__title">{{ doc.title }}</span>
          <span class="doc-list__meta">{{ doc.updatedAt }}</span>
        </li>
      </ul>
    </template>
    <template v-else>
      <p class="empty">No saved documents yet. Start writing and save to see them here.</p>
    </template>
  </BaseModal>
</template>

<style scoped>
.doc-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.doc-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.doc-list__item:hover {
  background: var(--ctp-surface0);
}

.doc-list__title {
  color: var(--ctp-text);
  font-size: 0.9rem;
}

.doc-list__meta {
  color: var(--ctp-subtext0);
  font-size: 0.78rem;
}

.empty {
  color: var(--ctp-subtext0);
  font-size: 0.9rem;
  text-align: center;
  padding: 1rem 0;
}
</style>
