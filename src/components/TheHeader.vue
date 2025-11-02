<script setup lang="ts">
// TODO: Add header functionality
</script>

<template>
  <header class="bg-white bg-opacity-10 backdrop-blur-sm border-b border-white border-opacity-20">
    <div class="container mx-auto px-4 py-4">
      <div class="flex items-center justify-between">
        <RouterLink to="/" class="flex items-center space-x-2">
          <div class="text-2xl">🌍</div>
          <span class="text-xl font-bold text-white">Earth Explorer</span>
        </RouterLink>
        <nav class="hidden md:flex space-x-6">
          <RouterLink to="/explore" class="text-white hover:text-blue-200 transition-colors">Explore</RouterLink>
          <RouterLink to="/learn" class="text-white hover:text-blue-200 transition-colors">Learn</RouterLink>
          <RouterLink to="/play" class="text-white hover:text-blue-200 transition-colors">Play</RouterLink>
          <RouterLink to="/settings" class="text-white hover:text-blue-200 transition-colors">Settings</RouterLink>
        </nav>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Add any component-specific styles here */
</style>
