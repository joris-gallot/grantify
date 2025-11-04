# Grantify

Grantify is a lightweight, framework-agnostic access-control toolkit, it provides a simple and fully typed API for managing permissions.

## Usage

```typescript
import { createGrantify } from '@grantify/core'

const { defineRule } = createGrantify({
  permissions: ['post:create', 'post:edit', 'post:delete'] as const,
  user: { id: 1, isAdmin: false },
})

const grantify = defineRule('post:create', user => user.id === 1)
  .defineRule('post:edit', (user, ctx: { isOwner: boolean } | undefined) =>
    Boolean(user.isAdmin || ctx?.isOwner)
  )
  .defineRule('post:delete', async () => await Promise.resolve(true))
  .build()

const canEdit = grantify.can('post:edit', { id: 2, isAdmin: false }, { isOwner: true })
// Returns: true

const canDelete = await grantify.can('post:delete')
// Returns: true (async rule)
```

## API

### `can(permission, user?, context?)`

Check if a user has permission to perform an action.

**Parameters:**
- `permission` (required): The permission string to check (must be one of the defined permissions)
- `user` (optional): The user object to check permissions for, if omitted, uses the default user provided in `createGrantify()`
- `context` (optional): Additional context data required by the rule, the type is inferred based on the rule definition

**Returns:**
- `boolean` for synchronous rules
- `Promise<boolean>` for asynchronous rules

**Examples:**

```typescript
// Check with default user (no additional parameters)
grantify.can('post:create')

// Check with custom user
grantify.can('post:create', { id: 2, isAdmin: true })

// Check with custom user and context
grantify.can('post:edit', { id: 3, isAdmin: false }, { isOwner: true })

// Async rules return a Promise
await grantify.can('post:delete')
```

## License
MIT
