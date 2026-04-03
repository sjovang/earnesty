<script setup lang="ts">
import BaseModal from './BaseModal.vue'
import type { SwaUser } from '../stores/auth'

defineProps<{ user: SwaUser }>()

const emit = defineEmits<{ close: []; logout: [] }>()

function providerLabel(identityProvider: string): string {
  if (identityProvider === 'aad') return 'Microsoft'
  return identityProvider.charAt(0).toUpperCase() + identityProvider.slice(1)
}
</script>

<template>
  <BaseModal
    title="Account"
    @close="emit('close')"
  >
    <div class="user-modal">
      <div class="user-modal__profile">
        <div class="user-modal__avatar">
          {{ user.userDetails.charAt(0).toUpperCase() }}
        </div>
        <div class="user-modal__info">
          <p class="user-modal__name">
            {{ user.userDetails }}
          </p>
          <p class="user-modal__provider">
            Signed in via {{ providerLabel(user.identityProvider) }}
          </p>
        </div>
      </div>
      <div class="user-modal__actions">
        <button
          class="user-modal__signout"
          @click="emit('logout')"
        >
          Sign out
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.user-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-m);
}

.user-modal__profile {
  display: flex;
  align-items: center;
  gap: var(--space-s);
}

.user-modal__avatar {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--ctp-surface1);
  color: var(--ctp-mauve);
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: system-ui, -apple-system, sans-serif;
}

.user-modal__info {
  display: flex;
  flex-direction: column;
  gap: 0.2em;
  min-width: 0;
}

.user-modal__name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--ctp-text);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-modal__provider {
  font-size: 0.8rem;
  color: var(--ctp-subtext0);
  margin: 0;
}

.user-modal__actions {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--space-xs);
  border-top: 1px solid var(--ctp-surface0);
}

.user-modal__signout {
  padding: 0.45em 1em;
  border: 1px solid var(--ctp-red);
  border-radius: 6px;
  background: transparent;
  color: var(--ctp-red);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.user-modal__signout:hover {
  background: var(--ctp-red);
  color: var(--ctp-base);
}
</style>
