interface AuthErrorHandlerOptions {
  retryAttempts?: number
  retryDelay?: number
  autoLogoutDelay?: number
  showNotification?: boolean
}

export const useAuthErrorHandler = (options: AuthErrorHandlerOptions = {}) => {
  const {
    retryAttempts = 2,
    retryDelay = 1000,
    autoLogoutDelay = 5000,
    showNotification = true
  } = options

  const { showError, showWarning } = useNotification()
  const authStore = useAuthStore()
  
  // Track retry attempts per request
  const retryCount = new Map<string, number>()
  
  /**
   * Handle authentication errors with retry logic and graceful degradation
   */
  const handleAuthError = async (
    error: any, 
    context: string = 'API request',
    requestKey?: string
  ): Promise<boolean> => {
    const statusCode = error?.statusCode || error?.response?.status
    
    // Only handle 401 errors
    if (statusCode !== 401) {
      return false
    }

    const key = requestKey || `${context}_${Date.now()}`
    const currentRetries = retryCount.get(key) || 0

    console.warn(`Authentication error in ${context}:`, error.message)

    // If we haven't exceeded retry attempts, don't logout yet
    if (currentRetries < retryAttempts) {
      retryCount.set(key, currentRetries + 1)
      
      if (showNotification && currentRetries === 0) {
        showWarning('Connection issue detected. Retrying...')
      }
      
      // Wait before allowing retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * (currentRetries + 1)))
      
      return false // Don't logout, allow retry
    }

    // Exceeded retry attempts - check if session is truly invalid
    const isSessionValid = await validateCurrentSession()
    
    if (isSessionValid) {
      // Session is valid but API is having issues
      if (showNotification) {
        showWarning('Temporary server issues detected. Please try again in a moment.')
      }
      
      // Reset retry count for this request
      retryCount.delete(key)
      return false // Don't logout
    }

    // Session is truly invalid - proceed with logout
    if (showNotification) {
      showError('Your session has expired. You will be redirected to login.')
    }

    // Graceful logout with delay
    setTimeout(async () => {
      await performLogout(context)
    }, autoLogoutDelay)

    return true // Logout initiated
  }

  /**
   * Validate current session without triggering logout
   */
  const validateCurrentSession = async (): Promise<boolean> => {
    try {
      if (!process.client) return false
      
      const token = localStorage.getItem('authToken')
      if (!token) return false

      // Quick session validation call
      const response = await $fetch('/api/auth/validate-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000 // Short timeout
      })

      return response?.valid === true
    } catch (error) {
      console.warn('Session validation failed:', error)
      return false
    }
  }

  /**
   * Perform logout with cleanup
   */
  const performLogout = async (context: string = 'auth error') => {
    try {
      if (!process.client) return

      console.log(`Performing logout due to: ${context}`)

      // Clear local storage
      localStorage.removeItem('authToken')
      localStorage.removeItem('authUser')

      // Clear auth store
      if (authStore?.setAuthUser) {
        authStore.setAuthUser(null)
      }

      // Clear retry counters
      retryCount.clear()

      // Navigate to login
      await navigateTo('/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force page reload as fallback
      if (process.client) {
        window.location.href = '/login'
      }
    }
  }

  /**
   * Check if request should retry based on error
   */
  const shouldRetry = (error: any, requestKey?: string): boolean => {
    const statusCode = error?.statusCode || error?.response?.status
    
    if (statusCode !== 401) return false
    
    const key = requestKey || `default_${Date.now()}`
    const currentRetries = retryCount.get(key) || 0
    
    return currentRetries < retryAttempts
  }

  /**
   * Reset retry count for a specific request
   */
  const resetRetryCount = (requestKey: string) => {
    retryCount.delete(requestKey)
  }

  /**
   * Get current retry count for a request
   */
  const getRetryCount = (requestKey: string): number => {
    return retryCount.get(requestKey) || 0
  }

  return {
    handleAuthError,
    validateCurrentSession,
    performLogout,
    shouldRetry,
    resetRetryCount,
    getRetryCount
  }
}
