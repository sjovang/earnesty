<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import AppLogo from './AppLogo.vue'

const auth = useAuthStore()
</script>

<template>
  <div class="login">
    <div class="login__card">
      <AppLogo class="login__logo" />
      <h1 class="login__title">
        Earnesty
      </h1>
      <p class="login__tagline">
        A focused space for writing.
      </p>
      <button
        class="login__btn"
        @click="auth.login"
      >
        Sign in with Sanity
      </button>
      <p class="login__note">
        You'll be redirected to sanity.io to authenticate.<br>
        Only users with access to the Earnesty project can sign in.
      </p>
    </div>
  </div>
</template>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ctp-base);
}

.login__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem 2.5rem;
  background: var(--ctp-mantle);
  border: 1px solid var(--ctp-surface0);
  border-radius: 14px;
  max-width: 360px;
  width: 100%;
  text-align: center;
}

.login__logo {
  width: 48px;
  height: 48px;
  margin-bottom: 0.25rem;
}

.login__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--ctp-text);
  margin: 0;
}

.login__tagline {
  font-size: 0.9rem;
  color: var(--ctp-subtext0);
  margin: 0;
}

.login__btn {
  margin-top: 0.5rem;
  padding: 0.6rem 1.5rem;
  background: var(--ctp-blue);
  color: var(--ctp-base);
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.login__btn:hover {
  opacity: 0.85;
}

.login__note {
  font-size: 0.75rem;
  color: var(--ctp-overlay0);
  line-height: 1.6;
  margin: 0;
}
</style>
