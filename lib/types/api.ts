export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: {
    code: string
    message: string
  }
  pagination?: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
}

export interface User {
  id: string
  email: string
  full_name: string
  client_id: string
  client_name: string
  role: string
  is_active: boolean
  email_verified: boolean
  last_login: string
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: 'bearer'
}

export interface AuthResponse extends AuthTokens {
  user: User
}
