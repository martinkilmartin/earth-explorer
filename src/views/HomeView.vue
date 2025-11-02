<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const title = ref('Welcome to Earth Explorer!')
</script>

<template>
  <div class="text-center">
    <h1 class="text-4xl font-bold text-white mb-8">{{ title }}</h1>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
      <RouterLink
        to="/explore"
        class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-6 transition-colors"
      >
        <div class="text-6xl mb-2">🌍</div>
        <div class="text-white font-semibold">Explore</div>
      </RouterLink>
      <RouterLink
        to="/learn"
        class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-6 transition-colors"
      >
        <div class="text-6xl mb-2">📚</div>
        <div class="text-white font-semibold">Learn</div>
      </RouterLink>
      <RouterLink
        to="/play"
        class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-6 transition-colors"
      >
        <div class="text-6xl mb-2">🎮</div>
        <div class="text-white font-semibold">Play</div>
      </RouterLink>
      <RouterLink
        to="/settings"
        class="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-6 transition-colors"
      >
        <div class="text-6xl mb-2">⚙️</div>
        <div class="text-white font-semibold">Settings</div>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
