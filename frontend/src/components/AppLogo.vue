<script setup lang="ts">
defineProps<{ size?: number }>()
</script>

<template>
  <!--
    Earnesty logomark — a vintage manual typewriter.
    Inspired by the machines used by Hemingway and classic novelists.
    Uses currentColor; scales via the size prop (default 24).
  -->
  <svg
    :width="size ?? 24"
    :height="size ?? 24"
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <!-- Paper sheet (sticking out of platen) -->
    <rect x="17" y="1" width="14" height="16" rx="1" stroke-width="2" fill="currentColor" fill-opacity="0.08" />
    <!-- Paper lines (text on page) -->
    <line x1="20" y1="6"  x2="28" y2="6"  stroke-width="1.2" opacity="0.45" />
    <line x1="20" y1="9"  x2="28" y2="9"  stroke-width="1.2" opacity="0.45" />
    <line x1="20" y1="12" x2="28" y2="12" stroke-width="1.2" opacity="0.45" />

    <!-- Platen roller housing -->
    <rect x="4" y="14" width="40" height="8" rx="4" stroke-width="2" fill="currentColor" fill-opacity="0.1" />

    <!-- Carriage return lever (right side of platen) -->
    <line x1="42" y1="15" x2="46" y2="11" stroke-width="1.8" />

    <!-- Body shell -->
    <rect x="2" y="21" width="44" height="25" rx="3" stroke-width="2" fill="currentColor" fill-opacity="0.08" />

    <!-- Keys — row 1 (4 keys) -->
    <rect x="7"  y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
    <rect x="16" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
    <rect x="25" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
    <rect x="34" y="25" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />

    <!-- Keys — row 2 (4 keys) -->
    <rect x="7"  y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
    <rect x="16" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
    <rect x="25" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
    <rect x="34" y="33" width="7" height="6" rx="1.5" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />

    <!-- Space bar -->
    <rect x="13" y="40" width="22" height="4" rx="2" stroke-width="1.6" fill="currentColor" fill-opacity="0.12" />
  </svg>
</template>
