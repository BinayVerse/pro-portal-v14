// composables/useSafeBlobFetch.ts

import { navigateTo, useNuxtApp } from '#app'

export async function useSafeBlobFetch(url: string, options: RequestInit = {}): Promise<Blob> {
  const { showError } = useNotification()
  const { handleAuthError } = useAuthErrorHandler({
    retryAttempts: 1,
    autoLogoutDelay: 3000,
    showNotification: true
  })

  const token = localStorage.getItem('authToken')

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: token ? `Bearer ${token}` : '',
    },
  })

  if (response.status === 401) {
    const shouldLogout = await handleAuthError(
      { statusCode: 401, message: 'Unauthorized blob fetch' },
      `blob-fetch-${url}`
    )

    if (!shouldLogout) {
      throw new Error('Authentication retry needed')
    }

    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Download failed: ${response.status} ${errorText}`)
  }

  const blob = await response.blob()

  if (!blob || blob.size === 0) {
    throw new Error('Received empty file.')
  }

  return blob
}
