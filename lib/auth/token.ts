import Cookies from 'js-cookie'

const ACCESS = 'access_token'
const REFRESH = 'refresh_token'

export const setTokens = (access: string, refresh: string) => {
  console.log('[TOKENS] Setting tokens')
  Cookies.set(ACCESS, access, { path: '/', sameSite: 'lax', expires: 7 })
  Cookies.set(REFRESH, refresh, { path: '/', sameSite: 'lax', expires: 7 })
  console.log('[TOKENS] Tokens set with 7-day expiration')
  console.log('[TOKENS] Access token:', access.substring(0, 20) + '...')
  console.log('[TOKENS] Refresh token:', refresh.substring(0, 20) + '...')
}

export const clearTokens = () => {
  console.log('[TOKENS] Clearing tokens')
  Cookies.remove(ACCESS, { path: '/' })
  Cookies.remove(REFRESH, { path: '/' })
}

export const getAccessToken = () => Cookies.get(ACCESS)

export const getRefreshToken = () => Cookies.get(REFRESH)
