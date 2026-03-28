<script setup lang="ts">
import { ref } from 'vue'
import AppLogo from './AppLogo.vue'
import type { SaveStatus } from '../stores/editor'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl+'

defineProps<{ documentTitle?: string; saveStatus?: SaveStatus }>()
defineEmits<{ new: []; open: []; info: []; publish: []; help: [] }>()

// ── Cursor-following shortcut tooltip ─────────────────────────────────────────
const tooltip = ref<{ label: string; x: number; y: number } | null>(null)

const shortcuts: Record<string, string> = {
  new:     `${mod}N`,
  open:    `${mod}O`,
  info:    `${mod}I`,
  publish: `${mod}⇧P`,
  help:    'F1',
}

function onEnter(key: string, e: MouseEvent) {
  tooltip.value = { label: shortcuts[key], x: e.clientX, y: e.clientY }
}
function onMove(key: string, e: MouseEvent) {
  if (tooltip.value) tooltip.value = { label: shortcuts[key], x: e.clientX, y: e.clientY }
}
function onLeave() {
  tooltip.value = null
}
</script>

<template>
  <nav
    class="menubar"
    aria-label="Application menu"
  >
    <div class="menubar__inner">
      <span class="menubar__brand">
        <AppLogo :size="16" />
        Earnesty
      </span>
      <span
        v-if="documentTitle"
        class="menubar__doc-title"
      >{{ documentTitle }}</span>
      <Transition name="save-fade">
        <span
          v-if="saveStatus && saveStatus !== 'idle'"
          :class="['menubar__save', `menubar__save--${saveStatus}`]"
        >
          <template v-if="saveStatus === 'saving'">
            <svg
              class="menubar__save-spinner"
              viewBox="0 0 12 12"
              width="10"
              height="10"
              fill="none"
            >
              <circle
                cx="6"
                cy="6"
                r="4.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-dasharray="14 8"
                stroke-linecap="round"
              />
            </svg>
            Saving
          </template>
          <template v-else-if="saveStatus === 'saved'">
            <svg
              viewBox="0 0 12 12"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 6l3 3 5-5" />
            </svg>
            Saved
          </template>
          <template v-else-if="saveStatus === 'error'">
            <svg
              viewBox="0 0 12 12"
              width="10"
              height="10"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            >
              <path d="M6 2v5M6 9v.5" />
            </svg>
            Save failed
          </template>
        </span>
      </Transition>

      <div
        class="menubar__items"
        role="menubar"
      >
        <button
          role="menuitem"
          class="menubar__item"
          @click="$emit('new')"
          @mouseenter="onEnter('new', $event)"
          @mousemove="onMove('new', $event)"
          @mouseleave="onLeave"
        >
          New
        </button>
        <span
          class="menubar__sep"
          aria-hidden="true"
        />
        <button
          role="menuitem"
          class="menubar__item"
          @click="$emit('open')"
          @mouseenter="onEnter('open', $event)"
          @mousemove="onMove('open', $event)"
          @mouseleave="onLeave"
        >
          Open
        </button>
        <span
          class="menubar__sep"
          aria-hidden="true"
        />
        <button
          role="menuitem"
          class="menubar__item"
          @click="$emit('info')"
          @mouseenter="onEnter('info', $event)"
          @mousemove="onMove('info', $event)"
          @mouseleave="onLeave"
        >
          Info
        </button>
        <span
          class="menubar__sep"
          aria-hidden="true"
        />
        <button
          role="menuitem"
          class="menubar__item menubar__item--publish"
          @click="$emit('publish')"
          @mouseenter="onEnter('publish', $event)"
          @mousemove="onMove('publish', $event)"
          @mouseleave="onLeave"
        >
          Publish
        </button>
        <span
          class="menubar__sep"
          aria-hidden="true"
        />
        <button
          role="menuitem"
          class="menubar__item"
          @click="$emit('help')"
          @mouseenter="onEnter('help', $event)"
          @mousemove="onMove('help', $event)"
          @mouseleave="onLeave"
        >
          Help
        </button>
      </div>
    </div>
  </nav>

  <!-- Floating shortcut tooltip, follows the cursor -->
  <Teleport to="body">
    <Transition name="tip">
      <div
        v-if="tooltip"
        class="shortcut-tip"
        :style="{ left: tooltip.x + 'px', top: (tooltip.y + 18) + 'px' }"
        aria-hidden="true"
      >
        {{ tooltip.label }}
      </div>
    </Transition>
  </Teleport>
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
  gap: 1.25rem;
  padding: 0.6rem 1.25rem;
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface0);
  border-radius: 10px;
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
  padding: 0 0.75rem;
  border-left: 1px solid var(--ctp-surface1);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.menubar__items {
  display: flex;
  align-items: center;
}

.menubar__sep {
  width: 1px;
  height: 1.1rem;
  background: var(--ctp-surface1);
  flex-shrink: 0;
  margin: 0 0.15rem;
}

.menubar__item {
  padding: 0.35rem 0.8rem;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
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

/* ── Save status ──────────────────────────────────────────────────────────── */
.menubar__save {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  padding: 0 0.5rem;
  border-left: 1px solid var(--ctp-surface1);
}

.menubar__save--saving { color: var(--ctp-subtext0); }
.menubar__save--saved  { color: var(--ctp-green); }
.menubar__save--error  { color: var(--ctp-red); }

@keyframes spin { to { transform: rotate(360deg); } }
.menubar__save-spinner { animation: spin 1s linear infinite; transform-origin: center; }

.save-fade-enter-active { transition: opacity 0.2s ease; }
.save-fade-leave-active { transition: opacity 0.3s ease; }
.save-fade-enter-from, .save-fade-leave-to { opacity: 0; }

/* ── Shortcut tooltip ─────────────────────────────────────────────────────── */
.shortcut-tip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  transform: translateX(-50%);
  background: var(--ctp-surface2);
  color: var(--ctp-text);
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  padding: 0.2em 0.55em;
  border-radius: 4px;
  border: 1px solid var(--ctp-surface1);
  white-space: nowrap;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--ctp-crust) 40%, transparent);
}

.tip-enter-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.tip-leave-active { transition: opacity 0.08s ease; }
.tip-enter-from  { opacity: 0; transform: translateX(-50%) translateY(-4px); }
.tip-leave-to    { opacity: 0; }
.tip-enter-to    { opacity: 1; transform: translateX(-50%) translateY(0); }
</style>
