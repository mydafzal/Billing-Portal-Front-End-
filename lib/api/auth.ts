import api from './client'
import { ApiResponse, AuthResponse, User } from '@/lib/types/api'
import { setTokens, clearTokens, getRefreshToken } from '@/lib/auth/token'

export async function login(email: string, password: string): Promise<User> {
  console.log('[AUTH] Logging in...')
  
  try {
    const res = await api.post('/auth/login', { email, password })

    console.log('[AUTH] ===== FULL RESPONSE =====')
    console.log(res.data)
    console.log('[AUTH] =========================')

    const apiResponse = res.data
    
    if (!apiResponse.success) {
      throw new Error(apiResponse.error?.message || 'Login failed: API returned unsuccessful')
    }

    const authData = apiResponse.data
    const { access_token, refresh_token, user } = authData

    if (access_token && refresh_token) {
      setTokens(access_token, refresh_token)
      console.log('[AUTH] Tokens saved successfully')
    } else {
      throw new Error('No tokens received from server')
    }

    return user
    
  } catch (error: any) {
    console.error('[AUTH] Login error:', error)
    
    let errorMessage = 'Login failed. Please try again.'
    
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Cannot connect to server. Please check your internet connection.'
    } else if (error.response?.status === 401) {
      errorMessage = 'Invalid email or password.'
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message
    } else if (error.message) {
      errorMessage = error.message
    }
    
    throw new Error(errorMessage)
  }
}
export async function signup(token: string, password: string, full_name: string): Promise<User> {
  const res = await api.post<ApiResponse<AuthResponse>>('/auth/signup', {
    token,
    password,
    full_name,
  })

  const apiResponse = res.data
  
  if (!apiResponse.success) {
    throw new Error(apiResponse.error?.message || 'Signup failed: API returned unsuccessful')
  }

  const { access_token, refresh_token, user } = apiResponse.data
  setTokens(access_token, refresh_token)

  return user
}

export async function me(): Promise<User> {
  console.log('[AUTH] Fetching user data...');
  
  try {
    const res = await api.get<ApiResponse<User>>('/auth/me');
    
    console.log('[AUTH] Raw response:', res.data);
    const responseData = res.data;
    
    if (responseData.success && responseData.data) {
      console.log('[AUTH] User data retrieved:', responseData.data);
      return responseData.data;
    } else if (responseData.success === false) {
      console.error('[AUTH] API returned error:', responseData.error);
      throw new Error(responseData.error?.message || 'Failed to fetch user data');
    } else {
      console.warn('[AUTH] Unexpected response structure, trying to extract user...')
      throw new Error('Invalid response structure from /auth/me');
    }
    
  } catch (error: any) {
    console.error('[AUTH] Error in me() function:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      url: error.config?.url
    });
    if (error.response?.status === 401) {
      console.log('[AUTH] 401 Unauthorized - clearing tokens');
      clearTokens();
      window.location.href = '/login';
      throw new Error('Session expired. Please login again.');
    }
    
    if (error.response?.status === 400) {
      console.log('[AUTH] 400 Bad Request');
      throw new Error('Invalid request. Please try again.');
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error. Please check your connection.');
    }
    
    throw error;
  }
}

export async function forgotPassword(email: string): Promise<ApiResponse<void>> {
  try {
    await api.post('/auth/forgot-password', { email });
    return { success: true, data: undefined };
  } catch (error: any) {
    return { success: false, data: undefined as any, error: { code: 'FORGOT_PASSWORD_FAILED', message: error.response?.data?.detail || error.message } };
  }
}

export async function resetPassword(token: string, new_password: string): Promise<ApiResponse<void>> {
  try {
    await api.post('/auth/reset-password', { token, new_password });
    return { success: true, data: undefined };
  } catch (error: any) {
    return { success: false, data: undefined as any, error: { code: 'RESET_PASSWORD_FAILED', message: error.response?.data?.detail || error.message } };
  }
}

export async function changePassword(current_password: string, new_password: string): Promise<ApiResponse<void>> {
  try {
    await api.post('/auth/change-password', { current_password, new_password });
    return { success: true, data: undefined };
  } catch (error: any) {
    return { success: false, data: undefined as any, error: { code: 'CHANGE_PASSWORD_FAILED', message: error.response?.data?.detail || error.message } };
  }
}

export async function logout() {
  const refresh_token = getRefreshToken()
  if (refresh_token) {
    try {
      await api.post('/auth/logout', { refresh_token })
    } catch (e) {
      console.error('Logout failed on server', e)
    }
  }
  clearTokens()
}
export async function refreshTokens(refresh_token: string) {
  const res = await api.post('/auth/refresh', {
    refresh_token,
  })
  
  const apiResponse = res.data
  
  if (!apiResponse.success) {
    throw new Error(apiResponse.error?.message || 'Token refresh failed')
  }

  const authData = apiResponse.data
  const { access_token, refresh_token: new_refresh_token } = authData
  setTokens(access_token, new_refresh_token)
  return access_token
}