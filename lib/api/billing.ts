import api from './client';
import { ApiResponse } from '@/lib/types/api';
import {
    BillingCurrentApiResponse,
    BillingHistoryApiResponse,
    TransactionsApiResponse,
    TopupApiResponse,
    StripePortalApiResponse,
    ClientSettingsApiResponse,
    BillingCurrentResponse,
    BillingHistoryItem,
    TransactionsData,
    TopupResponse,
    StripePortalResponse,
    ClientSettingsResponse
} from '@/lib/types/billing';

export const billingApi = {
    async getCurrentBilling(clientId?: string): Promise<BillingCurrentApiResponse> {
        try {
            const url = clientId ? `/billing/current?client_id=${clientId}` : '/billing/current';
            const response = await api.get(url);
            console.log('[BILLING] getCurrentBilling response:', response.data);
            console.log('[BILLING] Response status:', response.status);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<BillingCurrentResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'FETCH_BILLING_FAILED', message: 'Invalid response' } };
                } else if ('client_name' in response.data || 'wallet_balance' in response.data) {
                    return { success: true, data: response.data as BillingCurrentResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'FETCH_BILLING_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[BILLING] getCurrentBilling error:', error);
            console.error('[BILLING] Error response data:', error.response?.data);
            console.error('[BILLING] Error status:', error.response?.status);
            
            let errorMessage = 'Failed to fetch billing data';
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
            
            return { success: false, data: {} as any, error: { code: 'FETCH_BILLING_FAILED', message: errorMessage } };
        }
    },

    async getBillingHistory(clientId?: string, limit: number = 12, offset: number = 0): Promise<BillingHistoryApiResponse> {
        try {
            const params: any = { limit, offset };
            if (clientId) params.client_id = clientId;
            const response = await api.get('/billing/history', { params });
            console.log('[BILLING] getBillingHistory response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<BillingHistoryItem[] | { periods: BillingHistoryItem[] }>;
                    if (apiResponse.success && apiResponse.data) {
                        // Handle both array response and periods object response
                        if (Array.isArray(apiResponse.data)) {
                            return { success: true, data: { periods: apiResponse.data } };
                        } else if ('periods' in apiResponse.data) {
                            return { success: true, data: apiResponse.data };
                        }
                    }
                    return { success: false, data: { periods: [] }, error: apiResponse.error || { code: 'FETCH_HISTORY_FAILED', message: 'Invalid response' } };
                } else if ('periods' in response.data || Array.isArray(response.data)) {
                    const periods = Array.isArray(response.data) ? response.data : response.data.periods || [];
                    return { success: true, data: { periods } };
                }
            }
            return { success: false, data: { periods: [] }, error: { code: 'FETCH_HISTORY_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            // Suppress console errors for expected 400 errors when superadmin has no client_id
            if (error.response?.status === 400 && !clientId) {
                // This is expected for superadmin - backend may not support platform-wide queries yet
                return { success: false, data: { periods: [] }, error: { code: 'FETCH_HISTORY_FAILED', message: 'Billing history not available' } };
            }
            console.error('[BILLING] getBillingHistory error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to fetch billing history';
            return { success: false, data: { periods: [] }, error: { code: 'FETCH_HISTORY_FAILED', message: errorMessage } };
        }
    },

    async getTransactions(clientId?: string, limit: number = 20, offset: number = 0): Promise<TransactionsApiResponse> {
        try {
            const params: any = { limit, offset };
            if (clientId) params.client_id = clientId;
            const response = await api.get('/billing/transactions', { params });
            console.log('[BILLING] getTransactions response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<TransactionsData>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: { transactions: [], current_balance: 0, total: 0 }, error: apiResponse.error || { code: 'FETCH_TRANSACTIONS_FAILED', message: 'Invalid response' } };
                } else if ('transactions' in response.data) {
                    return { success: true, data: response.data as TransactionsData };
                }
            }
            return { success: false, data: { transactions: [], current_balance: 0, total: 0 }, error: { code: 'FETCH_TRANSACTIONS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            // Suppress console errors for expected 400 errors when superadmin has no client_id
            if (error.response?.status === 400 && !clientId) {
                // This is expected for superadmin - backend may not support platform-wide queries yet
                return { success: false, data: { transactions: [], current_balance: 0, total: 0 }, error: { code: 'FETCH_TRANSACTIONS_FAILED', message: 'Transactions not available' } };
            }
            console.error('[BILLING] getTransactions error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to fetch transactions';
            return { success: false, data: { transactions: [], current_balance: 0, total: 0 }, error: { code: 'FETCH_TRANSACTIONS_FAILED', message: errorMessage } };
        }
    },

    async createTopup(amount: number): Promise<TopupApiResponse> {
        try {
            const response = await api.post('/billing/topup', { amount });
            console.log('[BILLING] createTopup response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<TopupResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'TOPUP_FAILED', message: 'Invalid response' } };
                } else if ('checkout_url' in response.data) {
                    return { success: true, data: response.data as TopupResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'TOPUP_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[BILLING] createTopup error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to create topup';
            return { success: false, data: {} as any, error: { code: 'TOPUP_FAILED', message: errorMessage } };
        }
    },

    async getStripePortal(): Promise<StripePortalApiResponse> {
        try {
            const response = await api.get('/billing/portal');
            console.log('[BILLING] getStripePortal response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<StripePortalResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'PORTAL_FAILED', message: 'Invalid response' } };
                } else if ('url' in response.data) {
                    return { success: true, data: response.data as StripePortalResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'PORTAL_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[BILLING] getStripePortal error:', error);
            console.error('[BILLING] Error response data:', error.response?.data);
            console.error('[BILLING] Error status:', error.response?.status);
            
            let errorMessage = 'Failed to get portal URL';
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
            
            return { success: false, data: {} as any, error: { code: 'PORTAL_FAILED', message: errorMessage } };
        }
    },

    async getClientSettings(clientId?: string): Promise<ClientSettingsApiResponse> {
        try {
            const url = clientId ? `/billing/settings?client_id=${clientId}` : '/billing/settings';
            const response = await api.get(url);
            console.log('[BILLING] getClientSettings response:', response.data);
            console.log('[BILLING] Response status:', response.status);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<ClientSettingsResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'FETCH_SETTINGS_FAILED', message: 'Invalid response' } };
                } else if ('auto_recharge_amount' in response.data) {
                    return { success: true, data: response.data as ClientSettingsResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'FETCH_SETTINGS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[BILLING] getClientSettings error:', error);
            console.error('[BILLING] Error response data:', error.response?.data);
            console.error('[BILLING] Error status:', error.response?.status);
            
            let errorMessage = 'Failed to fetch settings';
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
            
            return { success: false, data: {} as any, error: { code: 'FETCH_SETTINGS_FAILED', message: errorMessage } };
        }
    },

    async updateAutoRecharge(amount: number, clientId?: string): Promise<ClientSettingsApiResponse> {
        try {
            const url = '/billing/settings/auto-recharge';
            // For superadmin operations, include client_id in the body if provided
            const requestBody: any = { auto_recharge_amount: amount };
            if (clientId) {
                requestBody.client_id = clientId;
            }
            const response = await api.put(url, requestBody);
            console.log('[BILLING] updateAutoRecharge response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<ClientSettingsResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'UPDATE_SETTINGS_FAILED', message: 'Invalid response' } };
                } else if ('auto_recharge_amount' in response.data) {
                    return { success: true, data: response.data as ClientSettingsResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'UPDATE_SETTINGS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[BILLING] updateAutoRecharge error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to update auto-recharge';
            return { success: false, data: {} as any, error: { code: 'UPDATE_SETTINGS_FAILED', message: errorMessage } };
        }
    },

    async updateAutoRechargeEnabled(enabled: boolean, clientId?: string): Promise<ClientSettingsApiResponse> {
        try {
            const url = '/billing/settings/auto-recharge-enabled';
            // The API expects 'allow_auto_recharge' field based on the validation error
            // For superadmin operations, include client_id in the body if provided
            const requestBody: any = { allow_auto_recharge: enabled };
            if (clientId) {
                requestBody.client_id = clientId;
            }
            const response = await api.put(url, requestBody);
            console.log('[BILLING] updateAutoRechargeEnabled request body:', requestBody);
            console.log('[BILLING] updateAutoRechargeEnabled response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<ClientSettingsResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'UPDATE_SETTINGS_FAILED', message: 'Invalid response' } };
                } else if ('auto_recharge_amount' in response.data) {
                    return { success: true, data: response.data as ClientSettingsResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'UPDATE_SETTINGS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            // Extract validation error message first
            let errorMessage = 'Failed to update auto-recharge setting';
            const isClientAssociationError = error.response?.data?.detail === 'No client associated with this user' || 
                                            (typeof error.response?.data?.detail === 'string' && 
                                             error.response.data.detail.includes('No client associated'));
            
            if (error.response?.data?.detail) {
                if (Array.isArray(error.response.data.detail)) {
                    const validationErrors = error.response.data.detail.map((err: any) => {
                        const field = err.loc ? err.loc.join('.') : 'unknown';
                        return `${field}: ${err.msg || err.message || 'Invalid value'}`;
                    }).join(', ');
                    errorMessage = `Validation error: ${validationErrors}`;
                } else if (typeof error.response.data.detail === 'string') {
                    errorMessage = error.response.data.detail;
                    // Provide a more helpful message for superadmin operations
                    if (isClientAssociationError && clientId) {
                        errorMessage = 'Unable to update settings. The backend may not support superadmin operations for this endpoint.';
                    }
                }
            } else if (error.response?.data?.error?.message) {
                errorMessage = error.response.data.error.message;
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Suppress console errors for expected backend limitations
            if (!isClientAssociationError) {
                if (error.response?.status !== 400 && error.response?.status !== 500) {
                    console.error('[BILLING] updateAutoRechargeEnabled error:', error);
                } else if (error.response?.status === 400 || error.response?.status === 500) {
                    console.error('[BILLING] Error response data:', error.response?.data);
                    console.error('[BILLING] Error detail:', JSON.stringify(error.response?.data?.detail, null, 2));
                }
            }
            
            return { success: false, data: {} as any, error: { code: 'UPDATE_SETTINGS_FAILED', message: errorMessage } };
        }
    },

    async updateThreshold(threshold: number, clientId?: string): Promise<ClientSettingsApiResponse> {
        try {
            const url = '/billing/settings/threshold';
            // The API expects 'low_balance_threshold' field based on Swagger documentation
            // For superadmin operations, include client_id in the body if provided
            const requestBody: any = { low_balance_threshold: threshold };
            if (clientId) {
                requestBody.client_id = clientId;
            }
            const response = await api.put(url, requestBody);
            console.log('[BILLING] updateThreshold response:', response.data);
            
            if (response.data && typeof response.data === 'object') {
                if ('success' in response.data) {
                    const apiResponse = response.data as ApiResponse<ClientSettingsResponse>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: {} as any, error: apiResponse.error || { code: 'UPDATE_SETTINGS_FAILED', message: 'Invalid response' } };
                } else if ('low_balance_threshold' in response.data) {
                    return { success: true, data: response.data as ClientSettingsResponse };
                }
            }
            return { success: false, data: {} as any, error: { code: 'UPDATE_SETTINGS_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
            console.error('[BILLING] updateThreshold error:', error);
            const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to update threshold';
            return { success: false, data: {} as any, error: { code: 'UPDATE_SETTINGS_FAILED', message: errorMessage } };
        }
    }
};