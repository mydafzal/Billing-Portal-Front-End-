import axios from 'axios'
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@/lib/auth/token'

const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api/proxy';
    }
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL!;
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
          const refreshBaseURL = typeof window !== 'undefined' && 
            (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? '/api/proxy'
            : process.env.NEXT_PUBLIC_API_BASE_URL!;
          
          const refreshUrl = `${refreshBaseURL}/auth/refresh`;
          const res = await axios.post(refreshUrl, {
            refresh_token: refreshToken
          })
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

