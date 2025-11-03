import { describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('complex scenarios', () => {
  it('should handle multiple permissions with different return types', async () => {
    const grantify = createGrantify({
      permissions: ['read', 'write', 'delete'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule('read', () => true)
      .defineRule<'write', { isOwner: boolean }>('write', (user, ctx) => user.isAdmin || (ctx?.isOwner ?? false))
      .defineRule('delete', async user => await Promise.resolve(user.isAdmin))
      .build()

    expect(grantify.can('read')).toBe(true)
    expect(grantify.can('write', { id: 1, isAdmin: false }, { isOwner: true })).toBe(true)
    await expect(grantify.can('delete')).resolves.toBe(false)
  })

  it('should handle complex user objects', () => {
    const grantify = createGrantify({
      permissions: ['admin:access'] as const,
      user: {
        id: 1,
        roles: ['admin'],
        permissions: ['read', 'write'],
        metadata: { level: 5 },
      },
    })
      .defineRule('admin:access', user =>
        user.roles.includes('admin') && user.metadata.level >= 5)
      .build()

    expect(grantify.can('admin:access')).toBe(true)
  })

  it('should handle complex context objects', () => {
    const grantify = createGrantify({
      permissions: ['resource:access'] as const,
      user: { id: 1, teamId: 10 },
    })
      .defineRule<'resource:access', { resource: { ownerId: number, teamId: number, isPublic: boolean } }>(
        'resource:access',
        (user, ctx) => {
          if (!ctx)
            return false
          const { resource } = ctx
          return resource.isPublic || resource.ownerId === user.id || resource.teamId === user.teamId
        },
      )
      .build()

    expect(grantify.can('resource:access', { id: 1, teamId: 10 }, {
      resource: { ownerId: 2, teamId: 10, isPublic: false },
    })).toBe(true)

    expect(grantify.can('resource:access', { id: 1, teamId: 10 }, {
      resource: { ownerId: 2, teamId: 20, isPublic: false },
    })).toBe(false)

    expect(grantify.can('resource:access', { id: 1, teamId: 10 }, {
      resource: { ownerId: 2, teamId: 20, isPublic: true },
    })).toBe(true)
  })

  it('should support chaining with mixed sync and async rules', async () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c', 'd'] as const,
      user: { id: 1 },
    })
      .defineRule('a', () => true)
      .defineRule('b', async () => await Promise.resolve(true))
      .defineRule('c', () => false)
      .defineRule('d', async () => await Promise.resolve(false))
      .build()

    expect(grantify.can('a')).toBe(true)
    await expect(grantify.can('b')).resolves.toBe(true)
    expect(grantify.can('c')).toBe(false)
    await expect(grantify.can('d')).resolves.toBe(false)
  })

  it('should handle deeply nested context objects', () => {
    interface DeepContext {
      level1: {
        level2: {
          level3: {
            value: string
            allowed: boolean
          }
        }
      }
    }

    const grantify = createGrantify({
      permissions: ['deep:access'] as const,
      user: { id: 1 },
    })
      .defineRule<'deep:access', DeepContext>(
        'deep:access',
        (user, ctx) => {
          if (!ctx)
            return false
          return ctx.level1.level2.level3.allowed && ctx.level1.level2.level3.value === 'secret'
        },
      )
      .build()

    expect(grantify.can('deep:access', { id: 1 }, {
      level1: {
        level2: {
          level3: {
            value: 'secret',
            allowed: true,
          },
        },
      },
    })).toBe(true)

    expect(grantify.can('deep:access', { id: 1 }, {
      level1: {
        level2: {
          level3: {
            value: 'wrong',
            allowed: true,
          },
        },
      },
    })).toBe(false)
  })

  it('should handle role-based access with hierarchy', () => {
    const roleHierarchy = {
      admin: 3,
      moderator: 2,
      user: 1,
    }

    interface User {
      id: number
      role: keyof typeof roleHierarchy
    }

    const grantify = createGrantify({
      permissions: ['content:delete', 'content:edit', 'content:view'] as const,
      user: { id: 1, role: 'moderator' } as User,
    })
      .defineRule('content:delete', user => roleHierarchy[user.role] >= 3)
      .defineRule('content:edit', user => roleHierarchy[user.role] >= 2)
      .defineRule('content:view', user => roleHierarchy[user.role] >= 1)
      .build()

    expect(grantify.can('content:delete', { id: 1, role: 'admin' })).toBe(true)
    expect(grantify.can('content:delete', { id: 1, role: 'moderator' })).toBe(false)
    expect(grantify.can('content:edit', { id: 1, role: 'moderator' })).toBe(true)
    expect(grantify.can('content:view', { id: 1, role: 'user' })).toBe(true)
  })

  it('should handle time-based permissions', () => {
    interface Context {
      timestamp: number
      expiresAt: number
    }

    const grantify = createGrantify({
      permissions: ['time:sensitive'] as const,
      user: { id: 1 },
    })
      .defineRule<'time:sensitive', Context>(
        'time:sensitive',
        (user, ctx) => {
          if (!ctx)
            return false
          return ctx.timestamp < ctx.expiresAt
        },
      )
      .build()

    const now = Date.now()
    expect(grantify.can('time:sensitive', { id: 1 }, {
      timestamp: now,
      expiresAt: now + 1000,
    })).toBe(true)

    expect(grantify.can('time:sensitive', { id: 1 }, {
      timestamp: now,
      expiresAt: now - 1000,
    })).toBe(false)
  })

  it('should handle async API calls in rules', async () => {
    const mockApiCall = async (userId: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return userId === 42
    }

    const grantify = createGrantify({
      permissions: ['api:check'] as const,
      user: { id: 42 },
    })
      .defineRule('api:check', async user => await mockApiCall(user.id))
      .build()

    await expect(grantify.can('api:check')).resolves.toBe(true)
    await expect(grantify.can('api:check', { id: 1 })).resolves.toBe(false)
  })

  it('should handle multiple context types for different permissions', () => {
    const grantify = createGrantify({
      permissions: ['post:edit', 'user:ban', 'resource:access'] as const,
      user: { id: 1, isAdmin: false, teamId: 10 },
    })
      .defineRule<'post:edit', { postOwnerId: number }>(
        'post:edit',
        (user, ctx) => user.isAdmin || ctx?.postOwnerId === user.id,
      )
      .defineRule<'user:ban', { targetUserId: number, targetRole: string }>(
        'user:ban',
        (user, ctx) => user.isAdmin && ctx?.targetRole !== 'admin',
      )
      .defineRule<'resource:access', { resourceTeamId: number }>(
        'resource:access',
        (user, ctx) => ctx?.resourceTeamId === user.teamId,
      )
      .build()

    expect(grantify.can('post:edit', { id: 1, isAdmin: false, teamId: 10 }, { postOwnerId: 1 })).toBe(true)
    expect(grantify.can('user:ban', { id: 1, isAdmin: true, teamId: 10 }, { targetUserId: 2, targetRole: 'user' })).toBe(true)
    expect(grantify.can('resource:access', { id: 1, isAdmin: false, teamId: 10 }, { resourceTeamId: 10 })).toBe(true)
  })

  it('should handle array-based permissions in user object', () => {
    const grantify = createGrantify({
      permissions: ['feature:alpha', 'feature:beta'] as const,
      user: { id: 1, permissions: ['alpha', 'gamma'] },
    })
      .defineRule('feature:alpha', user => user.permissions.includes('alpha'))
      .defineRule('feature:beta', user => user.permissions.includes('beta'))
      .build()

    expect(grantify.can('feature:alpha')).toBe(true)
    expect(grantify.can('feature:beta')).toBe(false)
  })

  it('should handle conditional logic with multiple factors', () => {
    interface User {
      id: number
      role: string
      verified: boolean
      subscriptionTier: 'free' | 'pro' | 'enterprise'
    }

    interface Context {
      isPremiumFeature: boolean
      requiresVerification: boolean
    }

    const grantify = createGrantify({
      permissions: ['feature:access'] as const,
      user: { id: 1, role: 'user', verified: true, subscriptionTier: 'pro' } as User,
    })
      .defineRule<'feature:access', Context>(
        'feature:access',
        (user, ctx) => {
          if (!ctx)
            return false
          if (ctx.requiresVerification && !user.verified)
            return false
          if (ctx.isPremiumFeature && user.subscriptionTier === 'free')
            return false
          return true
        },
      )
      .build()

    expect(grantify.can('feature:access', { id: 1, role: 'user', verified: true, subscriptionTier: 'pro' }, { isPremiumFeature: true, requiresVerification: true })).toBe(true)

    expect(grantify.can('feature:access', { id: 1, role: 'user', verified: false, subscriptionTier: 'pro' }, { isPremiumFeature: true, requiresVerification: true })).toBe(false)

    expect(grantify.can('feature:access', { id: 1, role: 'user', verified: true, subscriptionTier: 'free' }, { isPremiumFeature: true, requiresVerification: false })).toBe(false)
  })

  it('should handle async rules with complex async operations', async () => {
    const checkDatabase = async (userId: number, resourceId: number) => {
      await new Promise(resolve => setTimeout(resolve, 10))
      return userId === resourceId
    }

    const checkCache = async (key: string) => {
      await new Promise(resolve => setTimeout(resolve, 5))
      return key === 'valid'
    }

    const grantify = createGrantify({
      permissions: ['complex:async'] as const,
      user: { id: 1 },
    })
      .defineRule<'complex:async', { resourceId: number, cacheKey: string }>(
        'complex:async',
        async (user, ctx) => {
          if (!ctx)
            return false
          const [dbCheck, cacheCheck] = await Promise.all([
            checkDatabase(user.id, ctx.resourceId),
            checkCache(ctx.cacheKey),
          ])
          return dbCheck && cacheCheck
        },
      )
      .build()

    await expect(grantify.can('complex:async', { id: 1 }, { resourceId: 1, cacheKey: 'valid' })).resolves.toBe(true)
    await expect(grantify.can('complex:async', { id: 1 }, { resourceId: 2, cacheKey: 'valid' })).resolves.toBe(false)
    await expect(grantify.can('complex:async', { id: 1 }, { resourceId: 1, cacheKey: 'invalid' })).resolves.toBe(false)
  })

  it('should handle edge case with all permissions defined but none executed', () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c', 'd', 'e'] as const,
      user: { id: 1 },
    })
      .defineRule('a', () => true)
      .defineRule('b', () => false)
      .defineRule('c', async () => await Promise.resolve(true))
      .defineRule('d', () => true)
      .defineRule('e', () => false)
      .build()

    expect(grantify.getRules()).toHaveLength(5)
  })

  it('should handle permission check with optional chaining in complex objects', () => {
    interface Context {
      data?: {
        nested?: {
          value?: string
        }
      }
    }

    const grantify = createGrantify({
      permissions: ['optional:check'] as const,
      user: { id: 1 },
    })
      .defineRule<'optional:check', Context>(
        'optional:check',
        (user, ctx) => ctx?.data?.nested?.value === 'valid',
      )
      .build()

    expect(grantify.can('optional:check', { id: 1 }, { data: { nested: { value: 'valid' } } })).toBe(true)
    expect(grantify.can('optional:check', { id: 1 }, { data: { nested: {} } })).toBe(false)
    expect(grantify.can('optional:check', { id: 1 }, { data: {} })).toBe(false)
    expect(grantify.can('optional:check', { id: 1 }, {})).toBe(false)
  })
})
