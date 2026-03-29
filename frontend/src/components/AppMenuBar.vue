<script setup lang="ts">
import { ref } from 'vue'
import AppLogo from './AppLogo.vue'
import type { SaveStatus } from '../stores/editor'
import type { SanityUser } from '../stores/auth'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl+'

defineProps<{
  documentTitle?: string
  saveStatus?: SaveStatus
  user?: SanityUser
  isAuthenticated?: boolean
  hasDocument?: boolean
}>()
const emit = defineEmits<{ new: []; open: []; info: []; publish: []; help: []; signin: []; logout: [] }>()

const mobileMenuOpen = ref(false)

function mobileEmit(event: 'new' | 'open' | 'info' | 'publish' | 'help' | 'signin' | 'logout') {
  mobileMenuOpen.value = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event as any)
}

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
  const label = shortcuts[key] ?? key
  tooltip.value = { label, x: e.clientX, y: e.clientY }
}
function onMove(key: string, e: MouseEvent) {
  if (tooltip.value) {
    const label = shortcuts[key] ?? key
    tooltip.value = { label, x: e.clientX, y: e.clientY }
  }
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

      <!-- Desktop menu items -->
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
          :class="{ 'menubar__item--disabled': !isAuthenticated }"
          :disabled="!isAuthenticated"
          @click="isAuthenticated && $emit('open')"
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
          :class="{ 'menubar__item--disabled': !isAuthenticated || !hasDocument }"
          :disabled="!isAuthenticated || !hasDocument"
          @click="isAuthenticated && hasDocument && $emit('info')"
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
          :class="{ 'menubar__item--disabled': !isAuthenticated || !hasDocument }"
          :disabled="!isAuthenticated || !hasDocument"
          @click="isAuthenticated && hasDocument && $emit('publish')"
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
        <span
          class="menubar__sep"
          aria-hidden="true"
        />
        <!-- User avatar / sign-in -->
        <button
          v-if="isAuthenticated"
          role="menuitem"
          class="menubar__item menubar__item--user"
          title="Sign out"
          @click="$emit('logout')"
          @mouseleave="onLeave"
        >
          <img
            v-if="user?.profileImage"
            :src="user.profileImage"
            :alt="user.name"
            class="menubar__avatar"
          >
          <span
            v-else
            class="menubar__avatar menubar__avatar--initials"
          >{{ user?.name?.charAt(0) ?? '?' }}</span>
        </button>
        <button
          v-else
          role="menuitem"
          class="menubar__item menubar__item--signin"
          @click="$emit('signin')"
          @mouseenter="onEnter('signin', $event)"
          @mousemove="onMove('signin', $event)"
          @mouseleave="onLeave"
        >
          Sign in
        </button>
      </div>

      <!-- Mobile hamburger (hidden on desktop) -->
      <button
        class="menubar__hamburger"
        :aria-expanded="mobileMenuOpen"
        aria-label="Toggle menu"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <svg
          v-if="!mobileMenuOpen"
          viewBox="0 0 20 20"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="3" y1="5" x2="17" y2="5" />
          <line x1="3" y1="10" x2="17" y2="10" />
          <line x1="3" y1="15" x2="17" y2="15" />
        </svg>
        <svg
          v-else
          viewBox="0 0 20 20"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="4" y1="4" x2="16" y2="16" />
          <line x1="16" y1="4" x2="4" y2="16" />
        </svg>
      </button>
    </div>

    <!-- Mobile dropdown panel -->
    <Transition name="mobile-panel">
      <div
        v-if="mobileMenuOpen"
        class="menubar__mobile-panel"
        role="menu"
      >
        <button
          role="menuitem"
          class="menubar__mobile-item"
          @click="mobileEmit('new')"
        >New</button>
        <button
          role="menuitem"
          class="menubar__mobile-item"
          :class="{ 'menubar__item--disabled': !isAuthenticated }"
          :disabled="!isAuthenticated"
          @click="isAuthenticated && mobileEmit('open')"
        >Open</button>
        <button
          role="menuitem"
          class="menubar__mobile-item"
          :class="{ 'menubar__item--disabled': !isAuthenticated || !hasDocument }"
          :disabled="!isAuthenticated || !hasDocument"
          @click="isAuthenticated && hasDocument && mobileEmit('info')"
        >Info</button>
        <button
          role="menuitem"
          class="menubar__mobile-item menubar__mobile-item--publish"
          :class="{ 'menubar__item--disabled': !isAuthenticated || !hasDocument }"
          :disabled="!isAuthenticated || !hasDocument"
          @click="isAuthenticated && hasDocument && mobileEmit('publish')"
        >Publish</button>
        <button
          role="menuitem"
          class="menubar__mobile-item"
          @click="mobileEmit('help')"
        >Help</button>
        <div class="menubar__mobile-sep" />
        <button
          v-if="isAuthenticated"
          role="menuitem"
          class="menubar__mobile-item menubar__mobile-item--user"
          @click="mobileEmit('logout')"
        >
          <img
            v-if="user?.profileImage"
            :src="user.profileImage"
            :alt="user.name"
            class="menubar__avatar"
          >
          <span
            v-else
            class="menubar__avatar menubar__avatar--initials"
          >{{ user?.name?.charAt(0) ?? '?' }}</span>
          Sign out
        </button>
        <button
          v-else
          role="menuitem"
          class="menubar__mobile-item menubar__mobile-item--signin"
          @click="mobileEmit('signin')"
        >Sign in</button>
      </div>
    </Transition>
  </nav>

  <!-- Transparent backdrop to close mobile menu on outside click -->
  <Teleport to="body">
    <div
      v-if="mobileMenuOpen"
      class="menubar__backdrop"
      aria-hidden="true"
      @click="mobileMenuOpen = false"
    />
  </Teleport>

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
  top: var(--space-s);
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.menubar:hover,
.menubar:focus-within {
  opacity: 1;
}

.menubar__inner {
  display: flex;
  align-items: center;
  gap: var(--space-m);
  padding: var(--space-xs) var(--space-m);
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface0);
  border-radius: 10px;
  backdrop-filter: blur(8px);
  white-space: nowrap;
}

.menubar__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  font-size: var(--step--2);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ctp-subtext1);
  margin-right: var(--space-3xs);
}

.menubar__doc-title {
  font-size: var(--step--1);
  color: var(--ctp-subtext0);
  padding: 0 var(--space-xs);
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
  margin: 0 var(--space-2xs);
}

.menubar__item {
  padding: var(--space-2xs) var(--space-s);
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: var(--step--1);
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

.menubar__item--disabled {
  opacity: 0.35;
  cursor: default;
}

.menubar__item--disabled:hover {
  background: transparent;
  color: var(--ctp-subtext1);
}

.menubar__item--signin {
  color: var(--ctp-blue);
}

.menubar__item--signin:hover {
  background: color-mix(in srgb, var(--ctp-blue) 12%, transparent);
  color: var(--ctp-blue);
}

.menubar__avatar {
  display: block;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.menubar__avatar--initials {
  background: var(--ctp-surface1);
  color: var(--ctp-subtext1);
  font-size: var(--step--2);
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Save status ──────────────────────────────────────────────────────────── */
.menubar__save {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3xs);
  font-size: var(--step--2);
  padding: 0 var(--space-2xs);
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

/* ── Hamburger button (mobile only) ──────────────────────────────────────── */
.menubar__hamburger {
  display: none;
  align-items: center;
  justify-content: center;
  padding: var(--space-2xs);
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ctp-subtext1);
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
  margin-left: auto;
}

.menubar__hamburger:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
}

/* ── Mobile dropdown panel ────────────────────────────────────────────────── */
.menubar__mobile-panel {
  display: none;
  flex-direction: column;
  padding: var(--space-2xs) var(--space-2xs);
  border-top: 1px solid var(--ctp-surface0);
  margin-top: var(--space-2xs);
  gap: var(--space-3xs);
}

.menubar__mobile-item {
  display: flex;
  align-items: center;
  gap: var(--space-xs);
  width: 100%;
  padding: var(--space-xs) var(--space-s);
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ctp-subtext1);
  font-size: var(--step-0);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.menubar__mobile-item:hover {
  background: var(--ctp-surface0);
  color: var(--ctp-text);
}

.menubar__mobile-item--publish {
  color: var(--ctp-green);
}

.menubar__mobile-item--publish:hover {
  background: color-mix(in srgb, var(--ctp-green) 15%, transparent);
}

.menubar__mobile-item--signin {
  color: var(--ctp-blue);
}

.menubar__mobile-item--signin:hover {
  background: color-mix(in srgb, var(--ctp-blue) 12%, transparent);
}

.menubar__mobile-item--user {
  gap: var(--space-xs);
}

.menubar__mobile-sep {
  height: 1px;
  background: var(--ctp-surface0);
  margin: var(--space-3xs) var(--space-2xs);
}

/* ── Backdrop (mobile, outside click to close) ────────────────────────────── */
.menubar__backdrop {
  position: fixed;
  inset: 0;
  z-index: 99;
}

/* ── Mobile breakpoint ────────────────────────────────────────────────────── */
@media (max-width: 640px) {
  .menubar {
    left: var(--space-xs);
    right: var(--space-xs);
    transform: none;
    /* Ensure always slightly visible so users can find it */
    opacity: 0.85;
  }

  .menubar__inner {
    flex-wrap: wrap;
    gap: var(--space-xs);
    justify-content: space-between;
  }

  .menubar__doc-title,
  .menubar__items {
    display: none;
  }

  .menubar__hamburger {
    display: flex;
  }

  .menubar__mobile-panel {
    display: flex;
    width: 100%;
  }
}

/* ── Mobile panel transition ─────────────────────────────────────────────── */
.mobile-panel-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.mobile-panel-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.mobile-panel-enter-from, .mobile-panel-leave-to { opacity: 0; transform: translateY(-4px); }

/* ── Shortcut tooltip ─────────────────────────────────────────────────────── */
.shortcut-tip {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  transform: translateX(-50%);
  background: var(--ctp-surface2);
  color: var(--ctp-text);
  font-size: var(--step--2);
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
