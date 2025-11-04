import { assertType, describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('getRules', () => {
  it('should return empty array when no rules defined', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    }).build()

    expect(grantify.getRules()).toEqual([])
  })

  it('should return all defined rules', () => {
    const grantify = createGrantify({
      permissions: ['read', 'write', 'delete'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .defineRule('write', () => false)
      .defineRule('delete', async () => await Promise.resolve(true))
      .build()

    const rules = grantify.getRules()
    expect(rules).toHaveLength(3)
    expect(rules[0]!.perm).toBe('read')
    expect(rules[1]!.perm).toBe('write')
    expect(rules[2]!.perm).toBe('delete')

    assertType<Array<{
      perm: 'read' | 'write' | 'delete'
      cb: (user: { id: number }, ctx?: any) => boolean | Promise<boolean>
    }>>(rules)

    assertType<boolean>(grantify.can('read'))
    assertType<boolean>(grantify.can('write'))
    assertType<Promise<boolean>>(grantify.can('delete'))
  })

  it('should return a copy of rules array', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    const rules1 = grantify.getRules()
    const rules2 = grantify.getRules()

    expect(rules1).not.toBe(rules2)
    expect(rules1).toEqual(rules2)
  })

  it('should return rules with correct callback', () => {
    const callback = (user: { id: number }) => user.id === 1
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', callback)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]!.cb).toBe(callback)

    assertType<(user: { id: number }, ctx?: any) => boolean>(callback)
  })

  it('should return rules in order they were defined', () => {
    const grantify = createGrantify({
      permissions: ['first', 'second', 'third'] as const,
      user: { id: 1 },
    })
      .defineRule('first', () => true)
      .defineRule('second', () => true)
      .defineRule('third', () => true)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]!.perm).toBe('first')
    expect(rules[1]!.perm).toBe('second')
    expect(rules[2]!.perm).toBe('third')
  })

  it('should not allow mutation of internal rules array', () => {
    const grantify = createGrantify({
      permissions: ['read', 'write'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .defineRule('write', () => false)
      .build()

    const rules = grantify.getRules()
    rules.pop()

    expect(grantify.getRules()).toHaveLength(2)
  })

  it('should return rules with permission property', () => {
    const grantify = createGrantify({
      permissions: ['test:permission'] as const,
      user: { id: 1 },
    })
      .defineRule('test:permission', () => true)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]).toHaveProperty('perm')
    expect(rules[0]!.perm).toBe('test:permission')
  })

  it('should return rules with callback property', () => {
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule('test', () => true)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]).toHaveProperty('cb')
    expect(typeof rules[0]!.cb).toBe('function')
  })

  it('should return both sync and async rules', () => {
    const syncRule = (user: { id: number }) => user.id === 1
    const asyncRule = async (user: { id: number }) => await Promise.resolve(user.id === 2)

    const grantify = createGrantify({
      permissions: ['sync', 'async'] as const,
      user: { id: 1 },
    })
      .defineRule('sync', syncRule)
      .defineRule('async', asyncRule)
      .build()

    const rules = grantify.getRules()
    expect(rules).toHaveLength(2)
    expect(rules[0]!.cb).toBe(syncRule)
    expect(rules[1]!.cb).toBe(asyncRule)

    assertType<boolean>(grantify.can('sync'))
    assertType<Promise<boolean>>(grantify.can('async'))
  })

  it('should handle rules with context in getRules', () => {
    const grantify = createGrantify({
      permissions: ['edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule(
        'edit',
        (user, ctx: { isOwner: boolean } | undefined) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    const rules = grantify.getRules()
    expect(rules).toHaveLength(1)
    expect(rules[0]!.perm).toBe('edit')
    expect(typeof rules[0]!.cb).toBe('function')

    const result = grantify.can('edit', { id: 1, isAdmin: false }, { isOwner: true })
    assertType<boolean>(result)
  })

  it('should return correct rule structure', () => {
    const callback = () => true
    const grantify = createGrantify({
      permissions: ['test'] as const,
      user: { id: 1 },
    })
      .defineRule('test', callback)
      .build()

    const rules = grantify.getRules()
    expect(rules[0]).toEqual({
      perm: 'test',
      cb: callback,
      async: false,
    })

    assertType<{
      perm: 'test'
      cb: (user: { id: number }, ctx?: any) => boolean | Promise<boolean>
      async: boolean
    }>(rules[0]!)
  })

  it('should not share references between multiple getRules calls', () => {
    const grantify = createGrantify({
      permissions: ['read'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    const rules1 = grantify.getRules()
    const rules2 = grantify.getRules()

    rules1.push({ perm: 'fake' as any, cb: () => false, async: false })

    expect(rules1).toHaveLength(2)
    expect(rules2).toHaveLength(1)
  })

  it('should type check getRules return with mixed sync and async', () => {
    const grantify = createGrantify({
      permissions: ['a', 'b', 'c'] as const,
      user: { id: 1, name: 'test' },
    })
      .defineRule('a', () => true)
      .defineRule('b', (user, ctx: { flag: boolean } | undefined) => ctx?.flag ?? false)
      .defineRule('c', async () => await Promise.resolve(true))
      .build()

    const rules = grantify.getRules()

    assertType<Array<{
      perm: 'a' | 'b' | 'c'
      cb: (user: { id: number, name: string }, ctx?: any) => boolean | Promise<boolean>
    }>>(rules)

    assertType<boolean>(grantify.can('a'))
    assertType<boolean>(grantify.can('b', { id: 1, name: 'test' }, { flag: true }))
    assertType<Promise<boolean>>(grantify.can('c'))
  })

  it('should handle error cases with type safety', () => {
    const grantify = createGrantify({
      permissions: ['read', 'write'] as const,
      user: { id: 1 },
    })
      .defineRule('read', () => true)
      .build()

    assertType<boolean>(grantify.can('read'))

    expect(() => grantify.can('write')).toThrow('No rule defined for permission "write".')

    expect(() => grantify.can('delete' as any)).toThrow('Permission "delete" is not defined.')
  })
})
