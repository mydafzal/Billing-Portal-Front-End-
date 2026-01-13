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
                    const apiResponse = response.data as ApiResponse<{ periods: BillingHistoryItem[] }>;
                    if (apiResponse.success && apiResponse.data) {
                        return { success: true, data: apiResponse.data };
                    }
                    return { success: false, data: { periods: [] }, error: apiResponse.error || { code: 'FETCH_HISTORY_FAILED', message: 'Invalid response' } };
                } else if ('periods' in response.data || Array.isArray(response.data)) {
                    const periods = Array.isArray(response.data) ? response.data : response.data.periods || [];
                    return { success: true, data: { periods } };
                }
            }
            return { success: false, data: { periods: [] }, error: { code: 'FETCH_HISTORY_FAILED', message: 'Invalid response structure' } };
        } catch (error: any) {
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

    async updateAutoRecharge(amount: number): Promise<ClientSettingsApiResponse> {
        try {
            const response = await api.put('/billing/settings/auto-recharge', {
                auto_recharge_amount: amount
            });
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
    }
};