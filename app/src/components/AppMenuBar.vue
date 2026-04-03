<script setup lang="ts">
import { ref } from 'vue'
import AppLogo from './AppLogo.vue'
import UserModal from './UserModal.vue'
import type { SaveStatus } from '../stores/editor'
import type { SwaUser } from '../stores/auth'

const isMac = navigator.platform.toUpperCase().includes('MAC')
const mod = isMac ? '⌘' : 'Ctrl+'

defineProps<{
  documentTitle?: string
  saveStatus?: SaveStatus
  user?: SwaUser
  isAuthenticated?: boolean
  hasDocument?: boolean
}>()
const emit = defineEmits<{ new: []; open: []; publish: []; help: []; settings: []; signin: []; logout: [] }>()

const mobileMenuOpen = ref(false)
const showUserModal = ref(false)

function openUserModal() {
  mobileMenuOpen.value = false
  showUserModal.value = true
}

function mobileEmit(event: 'new' | 'open' | 'publish' | 'help' | 'settings' | 'signin' | 'logout') {
  mobileMenuOpen.value = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  emit(event as any)
}

// ── Cursor-following shortcut tooltip ─────────────────────────────────────────
const tooltip = ref<{ label: string; x: number; y: number } | null>(null)

const tooltipLabels: Record<string, string> = {
  new:     `Create new document (${mod}N)`,
  open:    `Open document (${mod}O)`,
  publish: `Publish document (${mod}⇧P)`,
  help:    `Help (F1)`,
}

function onEnter(key: string, e: MouseEvent) {
  const label = tooltipLabels[key] ?? key
  tooltip.value = { label, x: e.clientX, y: e.clientY }
}
function onMove(key: string, e: MouseEvent) {
  if (tooltip.value) {
    const label = tooltipLabels[key] ?? key
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
      <!-- Left: brand + doc title + save status -->
      <div class="menubar__left">
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
      </div>

      <!-- Center: actions with separators (desktop only) -->
      <div
        class="menubar__actions"
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
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z" />
            <polyline points="9 2 9 6 13 6" />
          </svg>
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
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M2 4a1 1 0 0 1 1-1h3.5l1.5 2H13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
          </svg>
          Open
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
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M8 10V3M5 6l3-3 3 3" />
            <path d="M3 13h10" />
          </svg>
          Publish
        </button>
      </div>

      <!-- Right: settings + help + user / sign-in (desktop only) -->
      <div class="menubar__right">
        <button
          role="menuitem"
          class="menubar__item menubar__item--icon"
          title="Settings"
          aria-label="Settings"
          @click="$emit('settings')"
        >
          <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="10"
              cy="10"
              r="2.5"
            />
            <path d="M10 2.5v1M10 16.5v1M2.5 10h1M16.5 10h1M4.4 4.4l.7.7M14.9 14.9l.7.7M4.4 15.6l.7-.7M14.9 5.1l.7-.7" />
          </svg>
        </button>
        <button
          role="menuitem"
          class="menubar__item"
          @click="$emit('help')"
          @mouseenter="onEnter('help', $event)"
          @mousemove="onMove('help', $event)"
          @mouseleave="onLeave"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
            />
            <path d="M6.5 6a1.5 1.5 0 1 1 2 1.4C8 8 8 8.5 8 9" />
            <circle
              cx="8"
              cy="11"
              r=".5"
              fill="currentColor"
            />
          </svg>
          Help
        </button>
        <button
          v-if="isAuthenticated"
          role="menuitem"
          class="menubar__item menubar__item--user"
          title="Account"
          @click="openUserModal"
          @mouseleave="onLeave"
        >
          <span class="menubar__avatar menubar__avatar--initials">{{ user?.userDetails?.charAt(0) ?? '?' }}</span>
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
          <line
            x1="3"
            y1="5"
            x2="17"
            y2="5"
          />
          <line
            x1="3"
            y1="10"
            x2="17"
            y2="10"
          />
          <line
            x1="3"
            y1="15"
            x2="17"
            y2="15"
          />
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
          <line
            x1="4"
            y1="4"
            x2="16"
            y2="16"
          />
          <line
            x1="16"
            y1="4"
            x2="4"
            y2="16"
          />
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
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6z" />
            <polyline points="9 2 9 6 13 6" />
          </svg>
          New
        </button>
        <button
          role="menuitem"
          class="menubar__mobile-item"
          :class="{ 'menubar__item--disabled': !isAuthenticated }"
          :disabled="!isAuthenticated"
          @click="isAuthenticated && mobileEmit('open')"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M2 4a1 1 0 0 1 1-1h3.5l1.5 2H13a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
          </svg>
          Open
        </button>
        <button
          role="menuitem"
          class="menubar__mobile-item menubar__mobile-item--publish"
          :class="{ 'menubar__item--disabled': !isAuthenticated || !hasDocument }"
          :disabled="!isAuthenticated || !hasDocument"
          @click="isAuthenticated && hasDocument && mobileEmit('publish')"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M8 10V3M5 6l3-3 3 3" />
            <path d="M3 13h10" />
          </svg>
          Publish
        </button>
        <button
          role="menuitem"
          class="menubar__mobile-item"
          @click="mobileEmit('help')"
        >
          <svg
            viewBox="0 0 16 16"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
            />
            <path d="M6.5 6a1.5 1.5 0 1 1 2 1.4C8 8 8 8.5 8 9" />
            <circle
              cx="8"
              cy="11"
              r=".5"
              fill="currentColor"
            />
          </svg>
          Help
        </button>
        <button
          role="menuitem"
          class="menubar__mobile-item"
          @click="mobileEmit('settings')"
        >
          Settings
        </button>
        <div class="menubar__mobile-sep" />
        <button
          v-if="isAuthenticated"
          role="menuitem"
          class="menubar__mobile-item menubar__mobile-item--user"
          @click="openUserModal"
        >
          <span class="menubar__avatar menubar__avatar--initials">{{ user?.userDetails?.charAt(0) ?? '?' }}</span>
          Account
        </button>
        <button
          v-else
          role="menuitem"
          class="menubar__mobile-item menubar__mobile-item--signin"
          @click="mobileEmit('signin')"
        >
          Sign in
        </button>
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
    <!-- User profile modal -->
    <UserModal
      v-if="showUserModal && user"
      :user="user"
      @close="showUserModal = false"
      @logout="emit('logout')"
    />
  </teleport>
</template>

<style scoped>
/* ── Desktop: full-width three-column bar ────────────────────────────────── */
.menubar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.35s ease;
}

.menubar:hover,
.menubar:focus-within {
  opacity: 1;
}

.menubar__inner {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: var(--space-xs) var(--space-l);
  background: var(--ctp-mantle);
  border-bottom: 1px solid var(--ctp-surface0);
  backdrop-filter: blur(8px);
  white-space: nowrap;
}

/* ── Three-column sections ────────────────────────────────────────────────── */
.menubar__left {
  display: flex;
  align-items: center;
  gap: var(--space-s);
}

.menubar__actions {
  display: flex;
  align-items: center;
}

.menubar__right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2xs);
}

/* ── Brand ────────────────────────────────────────────────────────────────── */
.menubar__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  font-size: var(--step--2);
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ctp-subtext1);
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

/* ── Separators (actions section only) ───────────────────────────────────── */
.menubar__sep {
  width: 1px;
  height: 1.1rem;
  background: var(--ctp-surface1);
  flex-shrink: 0;
  margin: 0 var(--space-2xs);
}

/* ── Menu items ───────────────────────────────────────────────────────────── */
.menubar__item {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
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

/* ── Icon-only menu item ─────────────────────────────────────────────────── */
.menubar__item--icon {
  padding: var(--space-2xs);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── User avatar ──────────────────────────────────────────────────────────── */
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
  padding: var(--space-2xs);
  gap: var(--space-3xs);
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface0);
  border-top: none;
  border-radius: 0 0 10px 10px;
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
    top: var(--space-xs);
    left: var(--space-xs);
    right: var(--space-xs);
    opacity: 0.85;
  }

  .menubar__inner {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    justify-content: space-between;
    border: 1px solid var(--ctp-surface0);
    border-radius: 10px;
  }

  /* Merge inner and panel into one rounded box when the panel is open */
  .menubar:has(.menubar__mobile-panel) .menubar__inner {
    border-radius: 10px 10px 0 0;
    border-bottom-color: transparent;
  }

  .menubar__actions,
  .menubar__right {
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
