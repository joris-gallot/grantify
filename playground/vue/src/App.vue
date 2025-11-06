<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from './auth-store'
import { grantify } from './grantify'

const { user, setAdmin } = useAuthStore()

const canEdit = computed(() => grantify.can('post:edit'))

const canDelete = grantify.can('post:delete')
</script>

<template>
  <div class="container">
    <div>
      <h2>Can edit</h2>
      <pre>{{ canEdit }}</pre>
      <h2>Can delete</h2>
      <pre>{{ canDelete }}</pre>
      <p v-if="canEdit">
        This sentence is important!
      </p>
    </div>
    <div>
      <h2>User</h2>
      <button @click="setAdmin(!user.isAdmin)">
        Toggle admin
      </button>
      <pre>{{ user }}</pre>
    </div>
  </div>
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

.container {
  gap: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
</style>
