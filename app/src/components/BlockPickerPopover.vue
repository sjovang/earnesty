<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
  insertImage: []
  insertCodeBlock: []
}>()

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.block-picker')) emit('close')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  // Slight delay so the opening click doesn't immediately close the popover
  setTimeout(() => document.addEventListener('mousedown', onClickOutside), 50)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('mousedown', onClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div
      class="block-picker"
      role="menu"
      :style="{ left: props.x + 'px', top: props.y + 'px' }"
    >
      <button
        class="block-picker__item"
        role="menuitem"
        @click="emit('insertImage'); emit('close')"
      >
        <span class="block-picker__icon">🖼️</span>
        <span>Image</span>
      </button>
      <button
        class="block-picker__item"
        role="menuitem"
        @click="emit('insertCodeBlock'); emit('close')"
      >
        <span class="block-picker__icon">
          <svg
            viewBox="0 0 14 14"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 4L1 7l3 3M10 4l3 3-3 3M6 11l2-8" />
          </svg>
        </span>
        <span>Code block</span>
      </button>
    </div>
  </Teleport>
</template>

<style scoped>
.block-picker {
  position: fixed;
  z-index: 300;
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface1);
  border-radius: 8px;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--ctp-crust) 40%, transparent);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 160px;
  animation: pop-in 0.12s ease;
}

.block-picker__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: transparent;
  border: none;
  color: var(--ctp-text);
  cursor: pointer;
  font-size: 0.875rem;
  padding: 0.6rem 0.9rem;
  text-align: left;
  transition: background 0.1s ease;
  width: 100%;
}

.block-picker__item:hover {
  background: var(--ctp-surface0);
}

.block-picker__icon {
  display: flex;
  align-items: center;
  font-size: 1rem;
  line-height: 1;
  color: var(--ctp-subtext0);
}

@keyframes pop-in {
  from { transform: scale(0.95) translateY(-4px); opacity: 0 }
  to   { transform: scale(1) translateY(0);       opacity: 1 }
}
</style>
