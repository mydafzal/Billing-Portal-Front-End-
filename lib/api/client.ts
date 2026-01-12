import axios from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/token'

// Use proxy in development to avoid CORS issues
// Check if we're in browser and on localhost
const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    // Client-side: check if localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api/proxy';
    }
  }
  // Server-side or production: use direct API
  return 'https://billing.devixor.com/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
})

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  console.log('[API] Making request to:', config.url, '| Token exists:', !!token)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('[API] Authorization header set')
  } else {
    console.log('[API] No token available, request will be unauthorized')
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true
      const refreshToken = getRefreshToken()

      if (refreshToken) {
        try {
          // Use proxy in development, direct API in production
          const refreshBaseURL = typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/api/proxy'
            : 'https://billing.devixor.com/api';
          
          const refreshUrl = `${refreshBaseURL}/auth/refresh`;
          
          // Use axios directly to avoid loop, and handle nested ApiResponse structure
          const res = await axios.post(refreshUrl, {
            refresh_token: refreshToken
          })

          // Handle nested ApiResponse structure
          const apiResponse = res.data
          if (!apiResponse.success) {
            throw new Error(apiResponse.error?.message || 'Token refresh failed')
          }

          const { access_token, refresh_token: new_refresh_token } = apiResponse.data
          setTokens(access_token, new_refresh_token)

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        clearTokens()
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

export default api

