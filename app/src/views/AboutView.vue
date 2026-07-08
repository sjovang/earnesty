<script setup lang="ts">
import { runtimeConfig } from '../config/runtime'
</script>

<template>
  <main class="about">
    <h1>{{ runtimeConfig.app.name }}</h1>
    <p>{{ runtimeConfig.app.aboutSummary }}</p>
  </main>
</template>

<style scoped>
.about {
  max-width: 680px;
  margin: 0 auto;
  padding: 4rem 1.5rem;
}
</style>
