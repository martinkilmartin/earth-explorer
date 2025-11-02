import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', () => {
  const score = ref(0)
  const level = ref(1)
  const unlockedPlaces = ref(['montreal'])

  const doubleScore = computed(() => score.value * 2)

  function incrementScore() {
    score.value++
  }

  function resetGame() {
    score.value = 0
    level.value = 1
  }

  return { score, level, unlockedPlaces, doubleScore, incrementScore, resetGame }
})
