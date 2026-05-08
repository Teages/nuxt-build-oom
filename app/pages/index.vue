<script setup lang="ts">
const fileSizeBytes = ref<number | null>(null)
const fileLoadError = ref<string | null>(null)

const fileSizeLabel = computed(() => {
  if (fileSizeBytes.value === null) {
    return 'Loading...'
  }

  const mib = fileSizeBytes.value / 1024 / 1024
  return `${fileSizeBytes.value} bytes (${mib.toFixed(2)} MiB)`
})

onMounted(async () => {
  try {
    const rawModule = await import('~/assets/generated/random-100m.txt?raw')
    fileSizeBytes.value = new Blob([rawModule.default]).size
  }
  catch (error) {
    fileLoadError.value = error instanceof Error ? error.message : 'Unknown error'
  }
})

const { data } = await useFetch('/api')
</script>

<template>
  <div>
    <p>{{ data?.message }}</p>
    <p v-if="fileLoadError">
      Failed to load file: {{ fileLoadError }}
    </p>
    <p v-else>
      Random file size: {{ fileSizeLabel }}
    </p>
  </div>
</template>
