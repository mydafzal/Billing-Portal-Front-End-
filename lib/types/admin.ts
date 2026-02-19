import { ApiResponse } from './api';

export interface PlatformOverviewResponse {
    total_clients: number;
    active_clients: number;
    total_users: number;
    total_wallet_balance: number;
    clients_with_low_balance: number;
    paused_clients: number;
}

export type PlatformOverviewApiResponse = ApiResponse<PlatformOverviewResponse>;

export interface ClientMapping {
    type: 'vapi_squad' | 'vapi_assistant' | 'twilio_number';
    value: string;
    description: string | null;
}

export interface Client {
    id: string;
    name: string;
    crm_type: 'boulevard' | 'ghl';
    markup_percent: number;
    bill_sms: boolean;
    billing_email: string | null;
    wallet_balance: number;
    low_balance_threshold: number;
    auto_recharge_amount: number;
    auto_recharge_enabled: boolean;
    allow_auto_recharge: boolean;
    allow_admin_auto_recharge_edit: boolean;
    allow_admin_threshold_edit: boolean;
    minimum_call_balance?: number;
    active_call_count?: number;
    per_call_surcharge: number;
    per_sms_surcharge: number;
    services_paused: boolean;
    stripe_customer_id: string | null;
    stripe_account_id: string | null;
    stripe_account_name: string | null;
    backend_url: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    mappings: ClientMapping[];
    users_count: number;
}

export interface CreateClientRequest {
    id: string;
    name: string;
    crm_type: 'boulevard' | 'ghl';
    markup_percent: number;
    bill_sms: boolean;
    billing_email?: string;
    low_balance_threshold?: number;
    auto_recharge_amount?: number;
    allow_admin_auto_recharge_edit?: boolean;
    allow_admin_threshold_edit?: boolean;
    minimum_call_balance?: number;
    per_call_surcharge?: number;
    per_sms_surcharge?: number;
    backend_url?: string;
    stripe_account_id?: string;
}

export interface UpdateClientRequest {
    name?: string;
    crm_type?: 'boulevard' | 'ghl';
    markup_percent?: number;
    bill_sms?: boolean;
    billing_email?: string;
    backend_url?: string;
    low_balance_threshold?: number;
    auto_recharge_amount?: number;
    auto_recharge_enabled?: boolean;
    allow_auto_recharge?: boolean;
    allow_admin_auto_recharge_edit?: boolean;
    allow_admin_threshold_edit?: boolean;
    minimum_call_balance?: number;
    per_call_surcharge?: number;
    per_sms_surcharge?: number;
    is_active?: boolean;
    stripe_account_id?: string | null;
}

export interface UpdateMappingsRequest {
    mappings: ClientMapping[];
}

export type ClientApiResponse = ApiResponse<Client>;
export type ClientListApiResponse = ApiResponse<{ clients: Client[]; pagination?: ApiResponse<any>['pagination'] }>;

export interface InviteUserRequest {
    email: string;
    client_id?: string;
    role: 'viewer' | 'admin' | 'superadmin';
}

export interface UpdateUserRequest {
    role?: 'viewer' | 'admin' | 'superadmin';
    is_active?: boolean;
    client_id?: string | null;
}

export interface InvitationResponse {
    id: string;
    email: string;
    client_id: string | null;
    role: string;
    expires_at: string;
    message: string;
}

export type InvitationApiResponse = ApiResponse<InvitationResponse>;
export type UserListApiResponse = ApiResponse<{ users: import('./api').User[]; pagination?: ApiResponse<any>['pagination'] }>;

export interface CreditAdjustmentRequest {
    amount: number;
    client_id?: string;
    reason?: string;
}

export interface CreditAdjustmentResult {
    client_id: string;
    client_name: string;
    previous_balance: number;
    new_balance: number;
    amount_changed: number;
}

export interface CreditAdjustmentResponse {
    operation: 'give' | 'revoke';
    total_clients_affected: number;
    total_amount: number;
    results: CreditAdjustmentResult[];
}

export type CreditAdjustmentApiResponse = ApiResponse<CreditAdjustmentResponse>;

// Stripe Accounts
export interface StripeAccount {
    id: string;
    name: string;
    is_default: boolean;
    is_active: boolean;
    client_count: number;
    stripe_secret_key_last4: string;
    webhook_url: string;
    created_at: string;
}

export interface CreateStripeAccountRequest {
    name: string;
    stripe_secret_key: string;
    stripe_webhook_secret: string;
    is_default?: boolean;
}

export interface UpdateStripeAccountRequest {
    name?: string;
    stripe_secret_key?: string;
    stripe_webhook_secret?: string;
    is_default?: boolean;
    is_active?: boolean;
}

export type StripeAccountApiResponse = ApiResponse<StripeAccount>;
export type StripeAccountListApiResponse = ApiResponse<{ accounts: StripeAccount[] }>;
