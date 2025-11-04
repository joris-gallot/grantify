import { createGrantify } from '@grantify/core'
import vueGrantify from '@grantify/vue'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const { defineRule } = createGrantify({
  permissions: ['post:create', 'post:edit', 'post:delete'] as const,
  user: { id: 1, isAdmin: false },
})

const grantify = defineRule('post:create', user => user.id === 1)
  .defineRule('post:edit', (user, ctx: { isOwner: boolean } | undefined) => Boolean(user.isAdmin || ctx?.isOwner))
  .defineRule('post:delete', async () => await Promise.resolve(true))
  .build()

const app = createApp(App)
app.use(router)

app.use(vueGrantify(grantify))

app.mount('#app')
