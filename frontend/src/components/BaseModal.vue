<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{ title: string }>()
const emit = defineEmits<{ close: [] }>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div class="overlay" role="dialog" :aria-label="props.title" @click.self="emit('close')">
      <div class="modal">
        <header class="modal__header">
          <h2 class="modal__title">{{ props.title }}</h2>
          <button class="modal__close" aria-label="Close" @click="emit('close')">✕</button>
        </header>
        <div class="modal__body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: color-mix(in srgb, var(--ctp-crust) 70%, transparent);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fade-in 0.15s ease;
}

.modal {
  width: min(520px, calc(100vw - 2rem));
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface0);
  border-radius: 10px;
  overflow: hidden;
  animation: slide-up 0.18s ease;
}

.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--ctp-surface0);
}

.modal__title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--ctp-text);
}

.modal__close {
  border: none;
  background: transparent;
  color: var(--ctp-subtext0);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  transition: background 0.15s ease, color 0.15s ease;
}

.modal__close:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
}

.modal__body {
  padding: 1.25rem;
}

@keyframes fade-in {
  from { opacity: 0 }
  to   { opacity: 1 }
}

@keyframes slide-up {
  from { transform: translateY(8px); opacity: 0 }
  to   { transform: translateY(0);   opacity: 1 }
}
</style>
