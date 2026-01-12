import { getAccessToken } from './auth/token';

export const isAuthenticated = () => {
  return typeof window !== 'undefined' ? Boolean(getAccessToken()) : false;
};
