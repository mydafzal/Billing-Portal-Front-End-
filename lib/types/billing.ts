import { ApiResponse } from './api';

export interface BillingPeriod {
  start: string;
  end: string;
  days_remaining: number;
}

export interface ClientUsage {
  voice_cost: number;
  sms_cost: number;
  voice_calls: number;
  sms_messages: number;
}

export interface BillingCurrentResponse {
  client_name?: string;
  client_id?: string;
  period: {
    start: string;
    end: string;
    days_remaining: number;
  };
  usage: {
    voice_cost: number;
    sms_cost: number;
    voice_calls: number;
    sms_messages: number;
  };
  total_spent: number;
  wallet_balance: number;
  active_call_count?: number;
  subtotal?: number;
  markup_percent?: number;
  markup_amount?: number;
  services_paused?: boolean;
}

export type BillingCurrentApiResponse = ApiResponse<BillingCurrentResponse>;

export interface BillingHistoryItem {
  id: string;
  period_start: string;
  period_end: string;
  voice_cost: number;
  sms_cost: number;
  total: number;
  total_cost?: number;
  total_calls?: number;
  voice_calls?: number;
  sms_messages?: number;
  status: 'current' | 'finalized' | 'paid';
  stripe_invoice_url: string | null;
  invoice_url?: string | null;
  created_at: string;
  subtotal?: number;
  markup_percent?: number;
  markup_amount?: number;
  paid_at?: string;
}

export type BillingHistoryApiResponse = ApiResponse<{ periods: BillingHistoryItem[]; pagination?: ApiResponse<any>['pagination'] }>;

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'usage' | 'refund' | 'adjustment' | 'auto_recharge' | 'credit_given' | 'credit_revoked';
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface TransactionsData {
  transactions: WalletTransaction[];
  current_balance: number;
  total: number;
  pagination?: { total: number; limit: number; offset: number; has_more: boolean };
}

export type TransactionsApiResponse = ApiResponse<TransactionsData>;

export interface TopupResponse {
  checkout_url: string;
  amount: number;
}

export type TopupApiResponse = ApiResponse<TopupResponse>;

export interface StripePortalResponse {
  url: string;
}

export type StripePortalApiResponse = ApiResponse<StripePortalResponse>;

export interface ClientSettingsResponse {
  auto_recharge_amount: number;
  low_balance_threshold: number;
  allow_admin_auto_recharge_edit: boolean;
  allow_admin_threshold_edit: boolean;
  allow_auto_recharge: boolean;
}

export type ClientSettingsApiResponse = ApiResponse<ClientSettingsResponse>;