<script setup lang="ts">
import { useSettingsStore } from './stores/settings'
import { RouterView } from 'vue-router'

const settings = useSettingsStore()
</script>

<template>
  <RouterView />
</template>

<style scoped></style>
