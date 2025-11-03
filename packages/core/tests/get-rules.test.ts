import { describe, expect, it } from 'vitest'
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
  })

  it('should handle rules with context in getRules', () => {
    const grantify = createGrantify({
      permissions: ['edit'] as const,
      user: { id: 1, isAdmin: false },
    })
      .defineRule<'edit', { isOwner: boolean }>(
        'edit',
        (user, ctx) => user.isAdmin || (ctx?.isOwner ?? false),
      )
      .build()

    const rules = grantify.getRules()
    expect(rules).toHaveLength(1)
    expect(rules[0]!.perm).toBe('edit')
    expect(typeof rules[0]!.cb).toBe('function')
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
    })
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

    rules1.push({ perm: 'fake' as any, cb: () => false })

    expect(rules1).toHaveLength(2)
    expect(rules2).toHaveLength(1)
  })
})
