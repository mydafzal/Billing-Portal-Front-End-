import api from './client';
import { ApiResponse } from '@/lib/types/api';
import {
    PlatformOverviewApiResponse,
    ClientListApiResponse,
    ClientApiResponse,
    UserListApiResponse,
    InvitationApiResponse,
    CreditAdjustmentApiResponse,
    CreateClientRequest,
    UpdateClientRequest,
    UpdateMappingsRequest,
    InviteUserRequest,
    UpdateUserRequest,
    CreditAdjustmentRequest,
    PlatformOverviewResponse,
    Client,
    InvitationResponse,
    CreditAdjustmentResponse
} from '@/lib/types/admin';

export const adminApi = {
    async getOverview(): Promise<PlatformOverviewApiResponse> {
        try {
            const response = await api.get('/admin/overview');
            console.log('[ADMIN] getOverview response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<PlatformOverviewResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'FETCH_OVERVIEW_FAILED', message: 'Invalid response' } };
                } else if ('total_clients' in response.data) {
                    return { success: true, data: response.data as PlatformOverviewResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'FETCH_OVERVIEW_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] getOverview error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to fetch overview';
            return { success: false, data: {} as any, error: { code: 'FETCH_OVERVIEW_FAILED', message: errorMessage } };
        }
    },

    async getClients(activeOnly: boolean = true, limit: number = 20, offset: number = 0): Promise<ClientListApiResponse> {
        try {
            const params = new URLSearchParams();
            if (activeOnly !== undefined) params.append('active_only', String(activeOnly));
            if (limit !== undefined) params.append('limit', String(limit));
            if (offset !== undefined) params.append('offset', String(offset));
            
            const queryString = params.toString();
            const url = `/admin/clients${queryString ? `?${queryString}` : ''}`;
            
            console.log('[ADMIN] getClients request:', { url, activeOnly, limit, offset });
            const response = await api.get(url);
            console.log('[ADMIN] getClients response status:', response.status);
            console.log('[ADMIN] getClients response data:', JSON.stringify(response.data, null, 2));
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<Client[] | { clients: Client[] }>;
                    console.log('[ADMIN] ApiResponse structure detected:', {
                        success: apiResponse.success,
                        hasData: !!apiResponse.data,
                        isArray: Array.isArray(apiResponse.data),
                        hasClients: !!(apiResponse.data && typeof apiResponse.data === 'object' && 'clients' in apiResponse.data),
                        clientsCount: Array.isArray(apiResponse.data) 
                            ? apiResponse.data.length 
                            : (apiResponse.data && typeof apiResponse.data === 'object' && 'clients' in apiResponse.data)
                                ? (apiResponse.data as { clients: Client[] }).clients?.length || 0
                                : 0
                    });
                    
                    if (apiResponse.success && apiResponse.data) {
                        if (Array.isArray(apiResponse.data)) {
                            console.log('[ADMIN] Data is array, wrapping in clients object');
                            return { success: true, data: { clients: apiResponse.data } };
                        }
                        if (typeof apiResponse.data === 'object' && 'clients' in apiResponse.data) {
                            return { success: true, data: apiResponse.data as { clients: Client[] } };
                        }
                    }
                    return { 
                        success: false, 
                        data: { clients: [] }, 
                        error: apiResponse.error || { code: 'FETCH_CLIENTS_FAILED', message: 'Invalid response' } 
                    };
                } else if ('clients' in response.data) {
                    console.log('[ADMIN] Direct clients structure detected:', response.data.clients);
                    return { success: true, data: { clients: response.data.clients || [] } };
                } else if (Array.isArray(response.data)) {
                    console.log('[ADMIN] Direct array structure detected:', response.data.length);
                    return { success: true, data: { clients: response.data } };
                }
            }
            
            console.warn('[ADMIN] Unexpected response structure:', response.data);
            return { success: false, data: { clients: [] }, error: { code: 'FETCH_CLIENTS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] getClients error:', error);
            console.error('[ADMIN] Error response:', error.response?.data);
            console.error('[ADMIN] Error status:', error.response?.status);
            
            let errorMessage = 'Failed to fetch clients';
            if (error.response?.data) {
                if (error.response.data.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, data: { clients: [] }, error: { code: 'FETCH_CLIENTS_FAILED', message: errorMessage } };
        }
    },

    async createClient(data: CreateClientRequest): Promise<ClientApiResponse> {
        try {
            console.log('[ADMIN] createClient request data:', JSON.stringify(data, null, 2));
            const response = await api.post('/admin/clients', data);
            console.log('[ADMIN] createClient response:', response.data);
            console.log('[ADMIN] Response status:', response.status);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<Client>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'CREATE_CLIENT_FAILED', message: 'Invalid response' } };
                } else if ('id' in response.data) {
                    return { success: true, data: response.data as Client };
                }
            }
            return { success: false, data: {} as any, error: { code: 'CREATE_CLIENT_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] createClient error:', error);
            console.error('[ADMIN] Error response data:', error.response?.data);
            console.error('[ADMIN] Error status:', error.response?.status);
            console.error('[ADMIN] Error config:', error.config);
            
            let errorMessage = 'Failed to create client';
            if (error.response?.data) {
                // Check for validation errors (FastAPI format)
                if (Array.isArray(error.response.data.detail)) {
                    console.log('[ADMIN] Validation errors array:', JSON.stringify(error.response.data.detail, null, 2));
                    const validationErrors = error.response.data.detail.map((err: any) => {
                        const field = err.loc ? err.loc.slice(1).join('.') : 'unknown';
                        return `${field}: ${err.msg || err.message || 'Invalid value'}`;
                    });
                    errorMessage = `Validation errors:\n${validationErrors.join('\n')}`;
                    console.log('[ADMIN] Formatted validation errors:', errorMessage);
                } else if (error.response.data.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.response.data.detail) {
                    if (typeof error.response.data.detail === 'string') {
                        errorMessage = error.response.data.detail;
                    } else {
                        errorMessage = JSON.stringify(error.response.data.detail);
                    }
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, data: {} as any, error: { code: 'CREATE_CLIENT_FAILED', message: errorMessage } };
        }
    },

    async getClient(clientId: string): Promise<ClientApiResponse> {
        try {
            const response = await api.get(`/admin/clients/${clientId}`);
            console.log('[ADMIN] getClient response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<Client>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'FETCH_CLIENT_FAILED', message: 'Invalid response' } };
                } else if ('id' in response.data) {
                    return { success: true, data: response.data as Client };
                }
            }
            return { success: false, data: {} as any, error: { code: 'FETCH_CLIENT_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] getClient error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to fetch client';
            return { success: false, data: {} as any, error: { code: 'FETCH_CLIENT_FAILED', message: errorMessage } };
        }
    },

    async updateClient(clientId: string, data: UpdateClientRequest): Promise<ClientApiResponse> {
        try {
            const response = await api.put(`/admin/clients/${clientId}`, data);
            console.log('[ADMIN] updateClient response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<Client>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'UPDATE_CLIENT_FAILED', message: 'Invalid response' } };
                } else if ('id' in response.data) {
                    return { success: true, data: response.data as Client };
                }
            }
            return { success: false, data: {} as any, error: { code: 'UPDATE_CLIENT_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] updateClient error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to update client';
            return { success: false, data: {} as any, error: { code: 'UPDATE_CLIENT_FAILED', message: errorMessage } };
        }
    },

    async deleteClient(clientId: string): Promise<any> {
        try {
            const response = await api.delete(`/admin/clients/${clientId}`);
            console.log('[ADMIN] deleteClient response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<any>;
                    if (apiResponse.success) {
                        return { success: true, data: apiResponse.data || {} };
                    }
                    return { success: false, error: apiResponse.error || { code: 'DELETE_CLIENT_FAILED', message: 'Invalid response' } };
                } else {
            return { success: true, data: response.data };
                }
            }
            return { success: true, data: {} };
        } catch (error: any) {
            console.error('[ADMIN] deleteClient error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to delete client';
            return { success: false, error: { code: 'DELETE_CLIENT_FAILED', message: errorMessage } };
        }
    },

    async updateClientMappings(clientId: string, mappings: UpdateMappingsRequest): Promise<ClientApiResponse> {
        try {
            const response = await api.put(`/admin/clients/${clientId}/mappings`, mappings);
            console.log('[ADMIN] updateClientMappings response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<Client>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'UPDATE_MAPPINGS_FAILED', message: 'Invalid response' } };
                } else if ('id' in response.data) {
                    return { success: true, data: response.data as Client };
                }
            }
            return { success: false, data: {} as any, error: { code: 'UPDATE_MAPPINGS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] updateClientMappings error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to update mappings';
            return { success: false, data: {} as any, error: { code: 'UPDATE_MAPPINGS_FAILED', message: errorMessage } };
        }
    },

    async pauseClient(clientId: string): Promise<any> {
        try {
            const response = await api.post(`/admin/clients/${clientId}/pause`);
            console.log('[ADMIN] pauseClient response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<any>;
                    if (apiResponse.success) {
                        return { success: true, data: apiResponse.data || {} };
                    }
                    return { success: false, error: apiResponse.error || { code: 'PAUSE_CLIENT_FAILED', message: 'Invalid response' } };
                } else {
            return { success: true, data: response.data };
                }
            }
            return { success: true, data: {} };
        } catch (error: any) {
            console.error('[ADMIN] pauseClient error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to pause client';
            return { success: false, error: { code: 'PAUSE_CLIENT_FAILED', message: errorMessage } };
        }
    },

    async resumeClient(clientId: string): Promise<any> {
        try {
            const response = await api.post(`/admin/clients/${clientId}/resume`);
            console.log('[ADMIN] resumeClient response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<any>;
                    if (apiResponse.success) {
                        return { success: true, data: apiResponse.data || {} };
                    }
                    return { success: false, error: apiResponse.error || { code: 'RESUME_CLIENT_FAILED', message: 'Invalid response' } };
                } else {
            return { success: true, data: response.data };
                }
            }
            return { success: true, data: {} };
        } catch (error: any) {
            console.error('[ADMIN] resumeClient error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to resume client';
            return { success: false, error: { code: 'RESUME_CLIENT_FAILED', message: errorMessage } };
        }
    },

    async getUsers(clientId?: string, limit: number = 20, offset: number = 0): Promise<UserListApiResponse> {
        try {
            const params: any = { limit, offset };
            if (clientId) params.client_id = clientId;

            const response = await api.get('/admin/users', { params });
            console.log('[ADMIN] getUsers response status:', response.status);
            console.log('[ADMIN] getUsers response data:', JSON.stringify(response.data, null, 2));
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<import('@/lib/types/api').User[] | { users: import('@/lib/types/api').User[] }>;
                    console.log('[ADMIN] ApiResponse structure detected:', {
                        success: apiResponse.success,
                        hasData: !!apiResponse.data,
                        isArray: Array.isArray(apiResponse.data),
                        hasUsers: !!(apiResponse.data && typeof apiResponse.data === 'object' && 'users' in apiResponse.data),
                        usersCount: Array.isArray(apiResponse.data) 
                            ? apiResponse.data.length 
                            : (apiResponse.data && typeof apiResponse.data === 'object' && 'users' in apiResponse.data)
                                ? (apiResponse.data as { users: import('@/lib/types/api').User[] }).users?.length || 0
                                : 0
                    });
                    
                    if (apiResponse.success && apiResponse.data) {
                        if (Array.isArray(apiResponse.data)) {
                            console.log('[ADMIN] Data is array, wrapping in users object');
                            return { success: true, data: { users: apiResponse.data } };
                        }
                        if (typeof apiResponse.data === 'object' && 'users' in apiResponse.data) {
                            return { success: true, data: apiResponse.data as { users: import('@/lib/types/api').User[] } };
                        }
                    }
                    return { success: false, data: { users: [] }, error: apiResponse.error || { code: 'FETCH_USERS_FAILED', message: 'Invalid response' } };
                } else if ('users' in response.data) {
                    console.log('[ADMIN] Direct users structure detected:', response.data.users);
                    return { success: true, data: { users: response.data.users || [] } };
                } else if (Array.isArray(response.data)) {
                    console.log('[ADMIN] Direct array structure detected:', response.data.length);
                    return { success: true, data: { users: response.data } };
                }
            }
            
            console.warn('[ADMIN] Unexpected response structure:', response.data);
            return { success: false, data: { users: [] }, error: { code: 'FETCH_USERS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] getUsers error:', error);
            console.error('[ADMIN] Error response:', error.response?.data);
            console.error('[ADMIN] Error status:', error.response?.status);
            
            let errorMessage = 'Failed to fetch users';
            if (error.response?.data) {
                if (error.response.data.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail;
                } else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, data: { users: [] }, error: { code: 'FETCH_USERS_FAILED', message: errorMessage } };
        }
    },

    async inviteUser(data: InviteUserRequest): Promise<InvitationApiResponse> {
        try {
            const requestData: any = {
                email: data.email,
                role: data.role
            };
            
            if (data.client_id && data.client_id.trim() !== '') {
                requestData.client_id = data.client_id;
            }
            
            console.log('[ADMIN] inviteUser request data:', JSON.stringify(requestData, null, 2));
            const response = await api.post('/admin/users/invite', requestData);
            console.log('[ADMIN] inviteUser response status:', response.status);
            console.log('[ADMIN] inviteUser response data:', JSON.stringify(response.data, null, 2));
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<InvitationResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'INVITE_USER_FAILED', message: 'Invalid response' } };
                } else if ('id' in response.data || 'email' in response.data) {
                    return { success: true, data: response.data as InvitationResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'INVITE_USER_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] inviteUser error:', error);
            console.error('[ADMIN] Error response data:', JSON.stringify(error.response?.data, null, 2));
            console.error('[ADMIN] Error status:', error.response?.status);
            console.error('[ADMIN] Error config:', error.config);
            
            let errorMessage = 'Failed to invite user';
            if (error.response?.data) {
                if (error.response.data.error && typeof error.response.data.error === 'object') {
                    if (error.response.data.error.message) {
                        errorMessage = error.response.data.error.message;
                    } else if (error.response.data.error.code) {
                        errorMessage = `${error.response.data.error.code}: ${error.response.data.error.message || 'Unknown error'}`;
                    }
                }
                // Check for validation errors (FastAPI format)
                else if (Array.isArray(error.response.data.detail)) {
                    const validationErrors = error.response.data.detail.map((err: any) => {
                        const field = err.loc ? err.loc.slice(1).join('.') : 'unknown';
                        return `${field}: ${err.msg || err.message || 'Invalid value'}`;
                    }).join('\n');
                    errorMessage = `Validation errors:\n${validationErrors}`;
                } 
                else if (error.response.data.detail) {
                    if (typeof error.response.data.detail === 'string') {
                        errorMessage = error.response.data.detail;
                    } else if (typeof error.response.data.detail === 'object' && error.response.data.detail.message) {
                        errorMessage = error.response.data.detail.message;
                    } else {
                        errorMessage = JSON.stringify(error.response.data.detail);
                    }
                } 
                else if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data;
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            return { success: false, data: {} as any, error: { code: 'INVITE_USER_FAILED', message: errorMessage } };
        }
    },

    async updateUser(userId: string, data: UpdateUserRequest): Promise<any> {
        try {
            console.log('[ADMIN] updateUser request:', { userId, data: JSON.stringify(data, null, 2) });
            const response = await api.put(`/admin/users/${userId}`, data);
            console.log('[ADMIN] updateUser response status:', response.status);
            console.log('[ADMIN] updateUser response data:', JSON.stringify(response.data, null, 2));
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<any>;
                    if (apiResponse.success && apiResponse.data) {
                        console.log('[ADMIN] updateUser success, returned data:', JSON.stringify(apiResponse.data, null, 2));
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, error: apiResponse.error || { code: 'UPDATE_USER_FAILED', message: 'Invalid response' } };
                } else if ('id' in response.data) {
                    console.log('[ADMIN] updateUser success (direct), returned data:', JSON.stringify(response.data, null, 2));
                    return { success: true, data: response.data };
                }
            }
            return { success: false, error: { code: 'UPDATE_USER_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] updateUser error:', error);
            console.error('[ADMIN] updateUser error response:', error.response?.data);
            console.error('[ADMIN] updateUser error status:', error.response?.status);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to update user';
            return { success: false, error: { code: 'UPDATE_USER_FAILED', message: errorMessage } };
        }
    },

    async giveCredits(data: CreditAdjustmentRequest): Promise<CreditAdjustmentApiResponse> {
        try {
            const response = await api.post('/admin/credits/give', data);
            console.log('[ADMIN] giveCredits response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<CreditAdjustmentResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'GIVE_CREDITS_FAILED', message: 'Invalid response' } };
                } else if ('operation' in response.data) {
                    return { success: true, data: response.data as CreditAdjustmentResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'GIVE_CREDITS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] giveCredits error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to give credits';
            return { success: false, data: {} as any, error: { code: 'GIVE_CREDITS_FAILED', message: errorMessage } };
        }
    },

    async assignUserToClient(userId: string, clientId: string | null): Promise<any> {
        try {
            console.log('[ADMIN] assignUserToClient request:', { userId, clientId });
            
            const endpoints = [
                `/admin/users/${userId}/client`,
                `/admin/users/${userId}/assign-client`,
                `/admin/users/${userId}/client-assignment`
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await api.put(endpoint, { client_id: clientId });
                    console.log('[ADMIN] assignUserToClient success via:', endpoint);
                    return { success: true, data: response.data };
                } catch (error: any) {
                    if (error.response?.status !== 404) {
                        throw error;
                    }
                    continue;
                }
            }
            
            return { 
                success: false, 
                error: { 
                    code: 'ENDPOINT_NOT_FOUND', 
                    message: 'No endpoint found for user-client assignment. Please check Swagger docs at https://billing.devixor.com/docs#/' 
                } 
            };
        } catch (error: any) {
            console.error('[ADMIN] assignUserToClient error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to assign user to client';
            return { success: false, error: { code: 'ASSIGN_USER_FAILED', message: errorMessage } };
        }
    },

    async revokeCredits(data: CreditAdjustmentRequest): Promise<CreditAdjustmentApiResponse> {
        try {
            const response = await api.post('/admin/credits/revoke', data);
            console.log('[ADMIN] revokeCredits response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<CreditAdjustmentResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'REVOKE_CREDITS_FAILED', message: 'Invalid response' } };
                } else if ('operation' in response.data) {
                    return { success: true, data: response.data as CreditAdjustmentResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'REVOKE_CREDITS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[ADMIN] revokeCredits error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to revoke credits';
            return { success: false, data: {} as any, error: { code: 'REVOKE_CREDITS_FAILED', message: errorMessage } };
        }
    }
};
