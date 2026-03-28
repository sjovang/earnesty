<script setup lang="ts">
defineProps<{ size?: number }>()
</script>

<template>
  <!--
    Earnesty logomark — a fountain pen nib.
    Uses currentColor so it inherits from the parent element.
  -->
  <svg
    :width="size ?? 24"
    :height="size ?? 24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Nib body: subtle fill -->
    <path
      d="M7 3 Q3 7 3.5 11 L12 22 L20.5 11 Q21 7 17 3 Z"
      fill="currentColor"
      opacity="0.15"
    />
    <!-- Nib outline -->
    <path
      d="M7 3 Q3 7 3.5 11 L12 22 L20.5 11 Q21 7 17 3 Z"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linejoin="round"
    />
    <!-- Ink slit from tip up to vent hole -->
    <line
      x1="12" y1="22"
      x2="12" y2="13.5"
      stroke="currentColor"
      stroke-width="0.75"
      stroke-linecap="round"
      opacity="0.6"
    />
    <!-- Vent hole -->
    <circle
      cx="12" cy="12"
      r="1.75"
      stroke="currentColor"
      stroke-width="1.25"
    />
  </svg>
</template>
