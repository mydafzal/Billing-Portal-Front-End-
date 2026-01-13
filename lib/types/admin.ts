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
    allow_admin_auto_recharge_edit: boolean;
    per_call_surcharge: number;
    per_sms_surcharge: number;
    services_paused: boolean;
    stripe_customer_id: string | null;
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
    per_call_surcharge?: number;
    per_sms_surcharge?: number;
    backend_url?: string;
}

export interface UpdateClientRequest {
    name?: string;
    markup_percent?: number;
    bill_sms?: boolean;
    billing_email?: string;
    backend_url?: string;
    low_balance_threshold?: number;
    auto_recharge_amount?: number;
    auto_recharge_enabled?: boolean;
    allow_admin_auto_recharge_edit?: boolean;
    per_call_surcharge?: number;
    per_sms_surcharge?: number;
    is_active?: boolean;
}

export interface UpdateMappingsRequest {
    mappings: ClientMapping[];
}

export type ClientApiResponse = ApiResponse<Client>;
export type ClientListApiResponse = ApiResponse<{ clients: Client[] }>;

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
export type UserListApiResponse = ApiResponse<{ users: import('./api').User[] }>;

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
