import { describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('can - synchronous rules', () => {
  it('should return true when rule passes without context', () => {
    const grantify = createGrantify({
      permissions: ['post:create'] as const,
      user: { id: 1 },
    })
      .defineRule('post:create', user => user.id === 1)
      .build()

    expect(grantify.can('post:create')).toBe(true)
  })

  it('should return false when rule fails without context', () => {
    const grantify = createGrantify({
      permissions: ['post:create'] as const,
      user: { id: 1 },
    })
      .defineRule('post:create', user => user.id === 2)
      .build()

    expect(grantify.can('post:create')).toBe(false)
  })

  it('should use default user when no user provided', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1, name: 'John' },
    })
      .defineRule('read', user => user.name === 'John')
      .build()

    expect(grantify.can('read')).toBe(true)
  })

  it('should use provided user instead of default user', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1, name: 'John' },
    })
      .defineRule('read', user => user.name === 'Jane')
      .build()

    expect(grantify.can('read', { id: 2, name: 'Jane' })).toBe(true)
  })

  it('should pass context to rule callback', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule<'post:edit', { isOwner: boolean }>(
        'post:edit',
        (user, ctx) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    expect(grantify.can('post:edit', { id: 1, isAdmin: false }, { isOwner: true })).toBe(true)
    expect(grantify.can('post:edit', { id: 1, isAdmin: false }, { isOwner: false })).toBe(false)
  })

  it('should handle undefined context', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule<'post:edit', { isOwner: boolean }>(
        'post:edit',
        (user, ctx) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    expect(grantify.can('post:edit')).toBe(false)
  })

  it('should handle admin user with context', () => {
    const grantify = createGrantify({
      permissions: ['post:edit'] as const,
      user: { id: 1, isAdmin: true },
    })
      .defineRule<'post:edit', { isOwner: boolean }>(
        'post:edit',
        (user, ctx) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    expect(grantify.can('post:edit', { id: 1, isAdmin: true }, { isOwner: false })).toBe(true)
  })

  it('should normalize permission names when checking', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(grantify.can(' read ' as any)).toBe(true)
  })

  it('should throw error for undefined permission', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(() => grantify.can('write' as any)).toThrow('Permission "write" is not defined.')
  })

  it('should throw error when no rule defined for permission', () => {
    const grantify = createGrantify({
      permissions: ['read', 'write'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    expect(() => grantify.can('write')).toThrow('No rule defined for permission "write".')
  })

  it('should return false when rule returns non-boolean value', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => undefined as any)
      .build()

    expect(grantify.can('read')).toBe(false)
  })

  it('should handle multiple context properties', () => {
    const grantify = createGrantify({
      permissions: ['action'] as const,
      user: { id: 1, role: 'user' },
    })
      .defineRule<'action', { flag1: boolean, flag2: boolean, value: number }>(
        'action',
        (user, ctx) => {
          if (!ctx)
            return false
          return ctx.flag1 && ctx.flag2 && ctx.value > 10
        },
      )
      .build()

    expect(grantify.can('action', { id: 1, role: 'user' }, { flag1: true, flag2: true, value: 15 })).toBe(true)
    expect(grantify.can('action', { id: 1, role: 'user' }, { flag1: true, flag2: false, value: 15 })).toBe(false)
    expect(grantify.can('action', { id: 1, role: 'user' }, { flag1: true, flag2: true, value: 5 })).toBe(false)
  })

  it('should handle null context', () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule<'test', { value?: string }>(
        'test',
        (user, ctx) => ctx?.value === 'expected',
      )
      .build()

    expect(grantify.can('test', { id: 1 }, null as any)).toBe(false)
  })

  it('should evaluate rules independently for each call', () => {
    let counter = 0
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule('test', () => {
        counter++
        return true
      })
      .build()

    grantify.can('test')
    grantify.can('test')
    grantify.can('test')

    expect(counter).toBe(3)
  })
})

describe('can - asynchronous rules', () => {
  it('should return promise when rule is async', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => await Promise.resolve(true))
      .build()

    const result = grantify.can('post:delete')
    expect(result).toBeInstanceOf(Promise)
    expect(await result).toBe(true)
  })

  it('should resolve to true when async rule passes', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async user => await Promise.resolve(user.id === 1))
      .build()

    await expect(grantify.can('post:delete')).resolves.toBe(true)
  })

  it('should resolve to false when async rule fails', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async user => await Promise.resolve(user.id === 2))
      .build()

    await expect(grantify.can('post:delete')).resolves.toBe(false)
  })

  it('should pass user to async rule', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1, name: 'John' },
    })
      .defineRule('post:delete', async user => await Promise.resolve(user.name === 'Jane'))
      .build()

    await expect(grantify.can('post:delete', { id: 2, name: 'Jane' })).resolves.toBe(true)
  })

  it('should pass context to async rule', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule<'post:delete', { force: boolean }>(
        'post:delete',
        async (user, ctx) => await Promise.resolve(user.isAdmin || (ctx?.force ?? false)),
      )
      .build()

    await expect(grantify.can('post:delete', { id: 1, isAdmin: false }, { force: true })).resolves.toBe(true)
    await expect(grantify.can('post:delete', { id: 1, isAdmin: false }, { force: false })).resolves.toBe(false)
  })

  it('should handle async rule rejection', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => await Promise.reject(new Error('DB error')))
      .build()

    await expect(grantify.can('post:delete')).rejects.toThrow('DB error')
  })

  it('should handle delayed async resolution', async () => {
    const grantify = createGrantify({
      permissions: ['post:delete'] as const,
      user: { id: 1 },
    })
      .defineRule('post:delete', async () => {
        await new Promise(resolve => setTimeout(resolve, 50))
        return true
      })
      .build()

    await expect(grantify.can('post:delete')).resolves.toBe(true)
  })

  it('should use default user in async rules', async () => {
    const grantify = createGrantify({
      permissions: ['action'] as const,
      user: { id: 42, role: 'admin' },
    })
      .defineRule('action', async user => await Promise.resolve(user.id === 42 && user.role === 'admin'))
      .build()

    await expect(grantify.can('action')).resolves.toBe(true)
  })

  it('should handle async rules with complex context', async () => {
    interface Context {
      resource: { id: number, ownerId: number }
      action: 'read' | 'write'
    }

    const grantify = createGrantify({
      permissions: ['resource:access'] as const,
      user: { id: 1 },
    })
      .defineRule<'resource:access', Context>(
        'resource:access',
        async (user, ctx) => {
          await new Promise(resolve => setTimeout(resolve, 10))
          if (!ctx)
            return false
          return ctx.resource.ownerId === user.id && ctx.action === 'write'
        },
      )
      .build()

    await expect(
      grantify.can('resource:access', { id: 1 }, { resource: { id: 100, ownerId: 1 }, action: 'write' }),
    ).resolves.toBe(true)

    await expect(
      grantify.can('resource:access', { id: 1 }, { resource: { id: 100, ownerId: 2 }, action: 'write' }),
    ).resolves.toBe(false)
  })

  it('should handle async rules that return false', async () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule('test', async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return false
      })
      .build()

    await expect(grantify.can('test')).resolves.toBe(false)
  })

  it('should handle async rules with undefined context', async () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule<'test', { flag: boolean }>(
        'test',
        async (user, ctx) => await Promise.resolve(ctx?.flag ?? false),
      )
      .build()

    await expect(grantify.can('test')).resolves.toBe(false)
  })
})

describe('can - mixed sync and async', () => {
  it('should handle both sync and async rules in same instance', async () => {
    const grantify = createGrantify({
      permissions: ['sync', 'async'] as const,
      user: { id: 1 },
    })
      .defineRule('sync', () => true)
      .defineRule('async', async () => await Promise.resolve(true))
      .build()

    expect(grantify.can('sync')).toBe(true)
    await expect(grantify.can('async')).resolves.toBe(true)
  })

  it('should not affect sync rules when async rules are defined', () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1 },
    })
      .defineRule('a', () => true)
      .defineRule('b', async () => await Promise.resolve(false))
      .defineRule('c', () => false)
      .build()

    expect(grantify.can('a')).toBe(true)
    expect(grantify.can('c')).toBe(false)
  })

  it('should handle multiple async rules independently', async () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1 },
    })
      .defineRule('a', async () => await Promise.resolve(true))
      .defineRule('b', async () => await Promise.resolve(false))
      .defineRule('c', async () => await Promise.reject(new Error('error')))
      .build()

    await expect(grantify.can('a')).resolves.toBe(true)
    await expect(grantify.can('b')).resolves.toBe(false)
    await expect(grantify.can('c')).rejects.toThrow('error')
  })
})
