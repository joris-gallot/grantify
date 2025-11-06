import { ref } from 'vue'

export interface User {
  id: number
  isAdmin: boolean
}

export function useAuthStore() {
  const user = ref<User>({ id: 1, isAdmin: true })

  function setAdmin(isAdmin: boolean) {
    user.value.isAdmin = isAdmin
  }

  return {
    user,
    setAdmin,
  }
}
