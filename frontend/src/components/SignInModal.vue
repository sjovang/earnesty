<script setup lang="ts">
import { onMounted } from 'vue'
import BaseModal from './BaseModal.vue'
import { useAuthStore } from '../stores/auth'

defineEmits<{ close: [] }>()

const auth = useAuthStore()

const providerIcons: Record<string, string> = {
  github: '⌥',
  google: 'G',
  sanity: '✉',
}

onMounted(() => auth.fetchProviders())
</script>

<template>
  <BaseModal
    title="Sign in to Earnesty"
    @close="$emit('close')"
  >
    <div class="signin">
      <p class="signin__intro">
        Sign in with your Sanity account to open, save and publish documents.
      </p>

      <div
        v-if="auth.error"
        class="signin__error"
        role="alert"
      >
        <span class="signin__error-icon">⚠</span>
        {{ auth.error }}
        <button
          class="signin__error-dismiss"
          aria-label="Dismiss"
          @click="auth.clearError()"
        >
          ✕
        </button>
      </div>

      <div
        v-if="auth.providers.length"
        class="signin__providers"
      >
        <button
          v-for="p in auth.providers"
          :key="p.name"
          class="signin__provider"
          @click="auth.loginWith(p.url)"
        >
          <span class="signin__provider-icon">{{ providerIcons[p.name] ?? '→' }}</span>
          {{ p.title }}
        </button>
      </div>

      <p
        v-else-if="!auth.error"
        class="signin__loading"
      >
        Loading…
      </p>
    </div>
  </BaseModal>
</template>

<style scoped>
.signin {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.25rem 0 0.5rem;
}

.signin__intro {
  font-size: 0.85rem;
  color: var(--ctp-subtext0);
  margin: 0;
  line-height: 1.6;
}

.signin__error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.65rem 0.75rem;
  background: color-mix(in srgb, var(--ctp-red) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--ctp-red) 35%, transparent);
  border-radius: 7px;
  font-size: 0.83rem;
  color: var(--ctp-red);
  line-height: 1.5;
}

.signin__error-icon {
  flex-shrink: 0;
  margin-top: 0.05em;
}

.signin__error-dismiss {
  margin-left: auto;
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--ctp-red);
  cursor: pointer;
  font-size: 0.75rem;
  padding: 0;
  opacity: 0.7;
}

.signin__error-dismiss:hover {
  opacity: 1;
}

.signin__providers {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.signin__provider {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  background: var(--ctp-surface0);
  border: 1px solid var(--ctp-surface1);
  border-radius: 7px;
  color: var(--ctp-text);
  font-size: 0.88rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s ease, border-color 0.12s ease;
  text-align: left;
}

.signin__provider:hover {
  background: var(--ctp-surface1);
  border-color: var(--ctp-surface2);
}

.signin__provider-icon {
  width: 20px;
  text-align: center;
  font-size: 0.8rem;
  color: var(--ctp-subtext1);
}

.signin__loading {
  font-size: 0.85rem;
  color: var(--ctp-subtext0);
  margin: 0;
}
</style>

