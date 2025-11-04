<script setup lang="ts">
import { useGrantify } from '@grantify/vue'

const grantify = useGrantify()

const canEdit = grantify.can('post:edit', {
  id: 2,
  isAdmin: false,
}, { isOwner: true })

const canDelete = grantify.can('post:delete')
</script>

<template>
  <h2>Can edit</h2>
  <pre>{{ canEdit }}</pre>
  <h2>Can delete</h2>
  <pre>{{ canDelete }}</pre>
</template>

<style>
body {
  background-color: white;
  color: black;
}

@media (prefers-color-scheme: dark) {
  body {
    background-color: black;
    color: white;
  }
}
</style>
