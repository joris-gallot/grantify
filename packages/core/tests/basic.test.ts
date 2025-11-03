import { describe, expect, it } from 'vitest'
import { createGrantify } from '../src/index'

describe('createGrantify - basic initialization', () => {
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

    expect(grantify.can('test')).toBe(true)
  })
})
