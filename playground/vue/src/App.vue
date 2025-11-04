<script setup lang="ts">
import { createGrantify } from '@grantify/core'

const { defineRule } = createGrantify({
  permissions: ['post:create', 'post:edit', 'post:delete'] as const,
  user: { id: 1, isAdmin: false },
})

const grantify = defineRule('post:create', user => user.id === 1)
  .defineRule('post:edit', (user, ctx: { isOwner: boolean } | undefined) => Boolean(user.isAdmin || ctx?.isOwner))
  .defineRule('post:delete', async () => await Promise.resolve(true))
  .build()

const rules = grantify.getRules()

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
