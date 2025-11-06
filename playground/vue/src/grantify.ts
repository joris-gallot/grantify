import { createGrantify } from '@grantify/core'
import { useAuthStore } from './auth-store'

const { user } = useAuthStore()

const { defineRule } = createGrantify({
  permissions: ['post:create', 'post:edit', 'post:delete'] as const,
  user: user.value,
})

export const grantify = defineRule('post:create', user => user.id === 1)
  .defineRule('post:edit', (user, ctx: { isOwner: boolean } | undefined) => Boolean(user.isAdmin || ctx?.isOwner))
  .defineRule('post:delete', async () => await Promise.resolve(true))
  .build()
