import { getAccessToken } from './token'

export const isAuthenticated = () => {
  return Boolean(getAccessToken())
}
