<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import TheHeader from '@/components/TheHeader.vue'
</script>

<template>
  <div id="app" class="min-h-screen bg-gradient-to-b from-blue-400 to-blue-600">
    <TheHeader />
    <main class="container mx-auto px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
