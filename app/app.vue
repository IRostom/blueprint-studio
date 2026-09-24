<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en',
    class: 'dark'
  }
})

useSeoMeta({
  title: 'Blueprint Studio',
  description: 'Design a blueprint grid and export it for a desk mat, mouse pad or wallpaper.'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
