import { assertType, describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('scenarios - basic', () => {
  it('should create a grantify builder', () => {
    const { defineRule } = createGrantify({
      permissions: ['read', 'write'] as const,
      user: { id: 1 },
    })

    expect(defineRule).toBeDefined()
    expect(typeof defineRule).toBe('function')
  })

  it('should build a grantify instance', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(grantify).toBeDefined()
    expect(grantify.can).toBeDefined()
    expect(grantify.getRules).toBeDefined()
  })

  it('should handle empty permissions array', () => {
    const grantify = createGrantify({
      permissions: [] as const,
      user: { id: 1 },
    }).build()

    expect(grantify.getRules()).toEqual([])
  })

  it('should handle complex user objects', () => {
    interface User {
      id: number
      roles: string[]
      permissions: string[]
      metadata: { level: number }
    }

    const user: User = {
      id: 1,
      roles: ['admin'],
      permissions: ['read', 'write'],
      metadata: { level: 5 },
    }

    const { defineRule } = createGrantify({
      permissions: ['admin:access'] as const,
      user,
    })

    expect(defineRule).toBeDefined()
  })

  it('should preserve user data through builder chain', () => {
    const user = { id: 42, name: 'Alice' }
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user,
    })
      .defineRule('test', u => u.id === 42 && u.name === 'Alice')
      .build()

    const result = grantify.can('test')
    expect(result).toBe(true)

    assertType<boolean>(result)
  })
})

describe('scenarios - complex', () => {
  it('should handle multiple permissions with different return types', async () => {
    const grantify = createGrantify({
      permissions: ['read', 'write', 'delete'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule('read', () => true)
      .defineRule('write', (user, ctx: { isOwner: boolean } | undefined) => user.isAdmin || (ctx?.isOwner ?? false))
      .defineRule('delete', async user => await Promise.resolve(user.isAdmin))
      .build()

    const readResult = grantify.can('read')
    const writeResult = grantify.can('write', { id: 1, isAdmin: false }, { isOwner: true })
    const deleteResult = grantify.can('delete')

    expect(readResult).toBe(true)
    expect(writeResult).toBe(true)
    await expect(deleteResult).resolves.toBe(false)

    assertType<boolean>(readResult)
    assertType<boolean>(writeResult)
    assertType<Promise<boolean>>(deleteResult)
  })

  it('should handle complex user objects with rules', () => {
    interface User {
      id: number
      roles: string[]
      permissions: string[]
      metadata: { level: number }
    }

    const grantify = createGrantify({
      permissions: ['admin:access'] as const,
      user: <User>{
        id: 1,
        roles: ['admin'],
        permissions: ['read', 'write'],
        metadata: { level: 5 },
      },
    })
      .defineRule('admin:access', user =>
        user.roles.includes('admin') && user.metadata.level >= 5)
      .build()

    const result = grantify.can('admin:access')
    expect(result).toBe(true)

    assertType<boolean>(result)
  })

  it('should handle complex context objects', () => {
    const grantify = createGrantify({
      permissions: ['resource:access'] as const,
      user: { id: 1, teamId: 10 },
    })
      .defineRule(
        'resource:access',
        (user, ctx: { resource: { ownerId: number, teamId: number, isPublic: boolean } } | undefined) => {
          if (!ctx)
            return false
          const { resource } = ctx
          return resource.isPublic || resource.ownerId === user.id || resource.teamId === user.teamId
        },
      )
      .build()

    const result1 = grantify.can('resource:access', { id: 1, teamId: 10 }, {
      resource: { ownerId: 2, teamId: 10, isPublic: false },
    })
    const result2 = grantify.can('resource:access', { id: 1, teamId: 10 }, {
      resource: { ownerId: 2, teamId: 20, isPublic: false },
    })
    const result3 = grantify.can('resource:access', { id: 1, teamId: 10 }, {
      resource: { ownerId: 2, teamId: 20, isPublic: true },
    })

    expect(result1).toBe(true)
    expect(result2).toBe(false)
    expect(result3).toBe(true)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
    assertType<boolean>(result3)
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

    const resultA = grantify.can('a')
    const resultB = grantify.can('b')
    const resultC = grantify.can('c')
    const resultD = grantify.can('d')

    expect(resultA).toBe(true)
    await expect(resultB).resolves.toBe(true)
    expect(resultC).toBe(false)
    await expect(resultD).resolves.toBe(false)

    assertType<boolean>(resultA)
    assertType<Promise<boolean>>(resultB)
    assertType<boolean>(resultC)
    assertType<Promise<boolean>>(resultD)
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
      .defineRule(
        'deep:access',
        (user, ctx: DeepContext | undefined) => {
          if (!ctx)
            return false
          return ctx.level1.level2.level3.allowed && ctx.level1.level2.level3.value === 'secret'
        },
      )
      .build()

    const result1 = grantify.can('deep:access', { id: 1 }, {
      level1: {
        level2: {
          level3: {
            value: 'secret',
            allowed: true,
          },
        },
      },
    })
    const result2 = grantify.can('deep:access', { id: 1 }, {
      level1: {
        level2: {
          level3: {
            value: 'wrong',
            allowed: true,
          },
        },
      },
    })

    expect(result1).toBe(true)
    expect(result2).toBe(false)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
  })

  it('should handle role-based access with hierarchy', () => {
    interface User {
      id: number
      role: 'admin' | 'moderator' | 'user'
    }

    const roleHierarchy = {
      admin: 3,
      moderator: 2,
      user: 1,
    }

    const grantify = createGrantify({
      permissions: ['content:delete', 'content:edit', 'content:view'] as const,
      user: <User>{ id: 1, role: 'moderator' },
    })
      .defineRule('content:delete', user => roleHierarchy[user.role] >= 3)
      .defineRule('content:edit', user => roleHierarchy[user.role] >= 2)
      .defineRule('content:view', user => roleHierarchy[user.role] >= 1)
      .build()

    const deleteResult = grantify.can('content:delete', { id: 1, role: 'admin' })
    const deleteResult2 = grantify.can('content:delete', { id: 1, role: 'moderator' })
    const editResult = grantify.can('content:edit', { id: 1, role: 'moderator' })
    const viewResult = grantify.can('content:view', { id: 1, role: 'user' })

    expect(deleteResult).toBe(true)
    expect(deleteResult2).toBe(false)
    expect(editResult).toBe(true)
    expect(viewResult).toBe(true)

    assertType<boolean>(deleteResult)
    assertType<boolean>(deleteResult2)
    assertType<boolean>(editResult)
    assertType<boolean>(viewResult)
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
      .defineRule(
        'time:sensitive',
        (user, ctx: Context | undefined) => {
          if (!ctx)
            return false
          return ctx.timestamp < ctx.expiresAt
        },
      )
      .build()

    const now = Date.now()
    const result1 = grantify.can('time:sensitive', { id: 1 }, {
      timestamp: now,
      expiresAt: now + 1000,
    })
    const result2 = grantify.can('time:sensitive', { id: 1 }, {
      timestamp: now,
      expiresAt: now - 1000,
    })

    expect(result1).toBe(true)
    expect(result2).toBe(false)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
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

    const result1 = grantify.can('api:check')
    const result2 = grantify.can('api:check', { id: 1 })

    await expect(result1).resolves.toBe(true)
    await expect(result2).resolves.toBe(false)

    assertType<Promise<boolean>>(result1)
    assertType<Promise<boolean>>(result2)
  })

  it('should handle multiple context types for different permissions', () => {
    const grantify = createGrantify({
      permissions: ['post:edit', 'user:ban', 'resource:access'] as const,
      user: { id: 1, isAdmin: false, teamId: 10 },
    })
      .defineRule(
        'post:edit',
        (user, ctx: { postOwnerId: number } | undefined) => user.isAdmin || ctx?.postOwnerId === user.id,
      )
      .defineRule(
        'user:ban',
        (user, ctx: { targetUserId: number, targetRole: string } | undefined) => user.isAdmin && ctx?.targetRole !== 'admin',
      )
      .defineRule(
        'resource:access',
        (user, ctx: { resourceTeamId: number } | undefined) => ctx?.resourceTeamId === user.teamId,
      )
      .build()

    const editResult = grantify.can('post:edit', { id: 1, isAdmin: false, teamId: 10 }, { postOwnerId: 1 })
    const banResult = grantify.can('user:ban', { id: 1, isAdmin: true, teamId: 10 }, { targetUserId: 2, targetRole: 'user' })
    const accessResult = grantify.can('resource:access', { id: 1, isAdmin: false, teamId: 10 }, { resourceTeamId: 10 })

    expect(editResult).toBe(true)
    expect(banResult).toBe(true)
    expect(accessResult).toBe(true)

    assertType<boolean>(editResult)
    assertType<boolean>(banResult)
    assertType<boolean>(accessResult)
  })

  it('should handle array-based permissions in user object', () => {
    interface User {
      id: number
      permissions: string[]
    }

    const grantify = createGrantify({
      permissions: ['feature:alpha', 'feature:beta'] as const,
      user: <User>{ id: 1, permissions: ['alpha', 'gamma'] },
    })
      .defineRule('feature:alpha', user => user.permissions.includes('alpha'))
      .defineRule('feature:beta', user => user.permissions.includes('beta'))
      .build()

    const alphaResult = grantify.can('feature:alpha')
    const betaResult = grantify.can('feature:beta')

    expect(alphaResult).toBe(true)
    expect(betaResult).toBe(false)

    assertType<boolean>(alphaResult)
    assertType<boolean>(betaResult)
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
      user: <User>{ id: 1, role: 'user', verified: true, subscriptionTier: 'pro' },
    })
      .defineRule(
        'feature:access',
        (user, ctx: Context | undefined) => {
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

    const result1 = grantify.can('feature:access', { id: 1, role: 'user', verified: true, subscriptionTier: 'pro' }, { isPremiumFeature: true, requiresVerification: true })
    const result2 = grantify.can('feature:access', { id: 1, role: 'user', verified: false, subscriptionTier: 'pro' }, { isPremiumFeature: true, requiresVerification: true })
    const result3 = grantify.can('feature:access', { id: 1, role: 'user', verified: true, subscriptionTier: 'free' }, { isPremiumFeature: true, requiresVerification: false })

    expect(result1).toBe(true)
    expect(result2).toBe(false)
    expect(result3).toBe(false)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
    assertType<boolean>(result3)
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
      .defineRule(
        'complex:async',
        async (user, ctx: { resourceId: number, cacheKey: string } | undefined) => {
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

    const result1 = grantify.can('complex:async', { id: 1 }, { resourceId: 1, cacheKey: 'valid' })
    const result2 = grantify.can('complex:async', { id: 1 }, { resourceId: 2, cacheKey: 'valid' })
    const result3 = grantify.can('complex:async', { id: 1 }, { resourceId: 1, cacheKey: 'invalid' })

    await expect(result1).resolves.toBe(true)
    await expect(result2).resolves.toBe(false)
    await expect(result3).resolves.toBe(false)

    assertType<Promise<boolean>>(result1)
    assertType<Promise<boolean>>(result2)
    assertType<Promise<boolean>>(result3)
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
      .defineRule(
        'optional:check',
        (user, ctx: Context | undefined) => ctx?.data?.nested?.value === 'valid',
      )
      .build()

    const result1 = grantify.can('optional:check', { id: 1 }, { data: { nested: { value: 'valid' } } })
    const result2 = grantify.can('optional:check', { id: 1 }, { data: { nested: {} } })
    const result3 = grantify.can('optional:check', { id: 1 }, { data: {} })
    const result4 = grantify.can('optional:check', { id: 1 }, {})

    expect(result1).toBe(true)
    expect(result2).toBe(false)
    expect(result3).toBe(false)
    expect(result4).toBe(false)

    assertType<boolean>(result1)
    assertType<boolean>(result2)
    assertType<boolean>(result3)
    assertType<boolean>(result4)
  })
})
