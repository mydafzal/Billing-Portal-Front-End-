'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  ExternalLink,
  Phone,
  AlertCircle,
  Loader2,
  History,
  ChevronLeft,
  ChevronRight,
  Building2,
  Users,
  AlertTriangle,
  PauseCircle
} from 'lucide-react';
import { billingApi } from '@/lib/api/billing';
import { BillingCurrentResponse, WalletTransaction } from '@/lib/types/billing';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { UserRole } from '@/lib/auth/role';
import { me } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { PlatformOverviewResponse } from '@/lib/types/admin';

export default function DashboardPage() {
  const router = useRouter();
  const [billingData, setBillingData] = useState<BillingCurrentResponse | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [transactionPage, setTransactionPage] = useState(0);
  const [transactionTotal, setTransactionTotal] = useState(0);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [adminOverview, setAdminOverview] = useState<PlatformOverviewResponse | null>(null);
  const TRANSACTIONS_PER_PAGE = 5;

  const fetchBilling = async () => {
    try {
      // Get user info
      const userData = await me();
      setUser(userData);
      const userRole = userData.role as UserRole;
      setRole(userRole);

      // ALL users can see the dashboard
      // Only fetch billing data if user has a client_id
      if (userData.client_id) {
        const response = await billingApi.getCurrentBilling();
        if (response.success && response.data) {
          setBillingData(response.data);
        } else if (response.error) {
          console.warn('[DASHBOARD] Billing fetch failed:', response.error.message);
          // Don't show error for expected failures
          if (response.error.message && !response.error.message.includes('client')) {
            toast.error('Failed to load billing data', { description: response.error.message });
          }
        }

        const settingsResp = await billingApi.getClientSettings();
        if (settingsResp.success && settingsResp.data) {
          setSettings(settingsResp.data);
        } else if (settingsResp.error) {
          console.warn('[DASHBOARD] Settings fetch failed:', settingsResp.error.message);
        }

        // Fetch recent transactions
        await fetchTransactions(0);
      } else if (userRole === 'superadmin') {
        // Superadmin: fetch platform overview
        const overviewResp = await adminApi.getOverview();
        if (overviewResp.success && overviewResp.data) {
          setAdminOverview(overviewResp.data);
        }
        // Don't fetch billing history or transactions for superadmin without client_id
        // They need to select a client first (handled in dedicated pages)
      } else {
        // User doesn't have client_id - show dashboard with empty/default values
        setBillingData(null);
        setTransactions([]);
      }
    } catch (error: any) {
      console.error('Failed to fetch billing data:', error);
      // Don't show error for expected failures (no client_id, etc.)
      if (error.response?.status !== 400 && error.response?.status !== 403) {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = useCallback(async (page: number, clientIdToUse?: string) => {
    setLoadingTransactions(true);
    try {
      // Superadmin without client_id cannot fetch transactions - skip it
      if (role === 'superadmin' && !clientIdToUse && !user?.client_id) {
        setTransactions([]);
        setTransactionTotal(0);
        return;
      }
      const offset = page * TRANSACTIONS_PER_PAGE;
      const response = await billingApi.getTransactions(clientIdToUse, TRANSACTIONS_PER_PAGE, offset);
      if (response.success && response.data) {
        setTransactions(response.data.transactions);
        setTransactionTotal(response.data.total);
      } else {
        // Handle expected errors for superadmin (no client_id)
        if (response.error?.message?.includes('client') || response.error?.message?.includes('Client ID')) {
          setTransactions([]);
          setTransactionTotal(0);
        }
      }
    } catch (error: any) {
      // Silently handle 400 errors for superadmin (no client_id required)
      if (error.response?.status === 400) {
        setTransactions([]);
        setTransactionTotal(0);
      } else {
        console.error('Failed to fetch transactions:', error);
      }
    } finally {
      setLoadingTransactions(false);
    }
  }, [role, user?.client_id]);


  useEffect(() => {
    fetchBilling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loading && role) {
      if (user?.client_id && billingData) {
        fetchTransactions(transactionPage);
      }
      // Don't fetch transactions for superadmin without client_id
      // They need to select a client first (handled in dedicated pages)
    }
  }, [transactionPage, user?.client_id, billingData, role, loading, fetchTransactions]);

  const handleTopup = async () => {
    if (role === 'viewer') return;
    try {
      setIsProcessing(true);
      const response = await billingApi.createTopup(50); // Default $50
      if (response.success && response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error: any) {
      toast.error('Topup failed', { description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStripePortal = async () => {
    if (role === 'viewer') return;
    try {
      const response = await billingApi.getStripePortal();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        // Handle error response from API
        const errorMessage = response.error?.message || 'Failed to get portal URL';
        
        // Check for common error cases
        if (errorMessage.includes('client') || errorMessage.includes('Client ID') || errorMessage.includes('No client')) {
          toast.error('Organization Required', {
            description: 'You must be assigned to an organization to access billing portal.'
          });
        } else if (errorMessage.includes('Stripe') || errorMessage.includes('customer') || errorMessage.includes('no user associated')) {
          toast.error('Billing Account Not Set Up', {
            description: 'Please add funds via Dashboard first to activate your Stripe billing account.'
          });
        } else {
          toast.error('Failed to Access Billing Portal', {
            description: errorMessage
          });
        }
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      const errorMsg = error?.response?.data?.error?.message || error?.response?.data?.detail || error.message;
      
      if (error?.response?.status === 400) {
        if (errorMsg?.includes('client') || errorMsg?.includes('Client ID') || errorMsg?.includes('No client')) {
          toast.error('Organization Required', {
            description: 'You must be assigned to an organization to access billing portal.'
          });
        } else if (errorMsg?.includes('Stripe') || errorMsg?.includes('customer') || errorMsg?.includes('no user associated')) {
          toast.error('Billing Account Not Set Up', {
            description: 'Please add funds via Dashboard first to activate your Stripe billing account.'
          });
        } else {
          toast.error('Failed to Access Billing Portal', {
            description: errorMsg || 'Unable to access billing portal. Please try again later.'
          });
        }
      } else {
        toast.error('Portal redirect failed', {
          description: errorMsg || 'An unexpected error occurred'
        });
      }
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500 font-medium">Loading Dashboard...</p>
      </div>
    );
  }

  const isPaused = billingData?.services_paused ?? false;
  const isViewer = role === 'viewer';
  const isAdmin = role === 'admin';
  const isSuperadmin = role === 'superadmin';
  const walletBalance = billingData?.wallet_balance ?? 0;
  const totalSpent = billingData?.total_spent ?? 0;
  const usage = billingData?.usage;
  const period = billingData?.period;
  const hasClientId = !!user?.client_id;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">
            {hasClientId 
              ? `Billing overview for ${billingData?.client_name || user?.client_name || 'Organization'}`
              : isSuperadmin 
                ? 'Platform overview dashboard'
                : 'Dashboard overview'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasClientId && (
            <Badge variant={isPaused ? "destructive" : "outline"} className={!isPaused ? "bg-emerald-50 text-emerald-700 border-emerald-200 px-3 py-1 font-semibold" : "px-3 py-1 font-semibold"}>
              <div className={`h-1.5 w-1.5 rounded-full mr-2 ${isPaused ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse`} />
              {isPaused ? 'Services Paused' : 'Services Active'}
            </Badge>
          )}
          {isSuperadmin && (
            <Button
              variant="outline"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
              onClick={() => router.push('/admin/clients')}
            >
              Admin Panel <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Super Admin Overview */}
      {isSuperadmin && !hasClientId && adminOverview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">${(adminOverview.total_wallet_balance || 0).toLocaleString()}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </p>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-lg">
                <Wallet className="text-emerald-600 h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clients</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{adminOverview.total_clients || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                  <span className="text-emerald-600 font-bold">{adminOverview.active_clients || 0}</span> Active
                </p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <Building2 className="text-slate-400 h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Users</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{adminOverview.total_users || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Global Total</p>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg">
                <Users className="text-slate-400 h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Low Balance Clients</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{adminOverview.clients_with_low_balance || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Need Attention</p>
              </div>
              <div className="p-2.5 bg-amber-50 rounded-lg">
                <AlertTriangle className="text-amber-600 h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paused Clients</p>
                <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{adminOverview.paused_clients || 0}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Services Stopped</p>
              </div>
              <div className="p-2.5 bg-red-50 rounded-lg">
                <PauseCircle className="text-red-600 h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Wallet Balance and Usage Summary - Only show for admins with client_id, not superadmin */}
      {hasClientId && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Widget */}
          <Card className="lg:col-span-1 border-emerald-100 shadow-sm bg-white overflow-hidden rounded-xl">
            <CardContent className="p-0">
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-emerald-50 rounded-lg">
                    <Wallet className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Wallet Balance</span>
                </div>

                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-slate-900 tabular-nums tracking-tight">
                      ${walletBalance.toFixed(2)}
                    </span>
                    <span className="text-xs font-bold text-slate-400 uppercase">USD</span>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    {isPaused ? (
                      <><div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> <span className="text-xs font-semibold text-red-600">Top up to resume services</span></>
                    ) : (
                      <><div className="w-2 h-2 rounded-full bg-emerald-500" /> <span className="text-xs font-semibold text-emerald-600">Services Online</span></>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                      <Phone className="h-4 w-4 text-slate-400" />
                      <span className="text-xs font-semibold text-slate-600">Active Calls: <span className="font-bold text-slate-900">{billingData?.active_call_count ?? 0}</span></span>
                    </div>
                  )}
                </div>

                {/* Top-up button - Hidden for viewers, shown for admins/superadmins with client_id */}
                {!isViewer && hasClientId && (
                  <div className="flex flex-col gap-2 pt-2">
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-5 rounded-lg shadow-sm active:scale-95 transition-all w-full"
                      onClick={handleTopup}
                      disabled={isProcessing}
                    >
                      <ArrowUpRight className="mr-2 h-4 w-4" /> Add Funds
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 font-semibold text-sm h-10 rounded-lg transition-all w-full"
                      onClick={handleStripePortal}
                    >
                      Billing Portal <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {isViewer && (
                  <div className="pt-2">
                    <p className="text-xs text-slate-400 text-center">View-only access</p>
                  </div>
                )}
              </div>

              {/* Auto-recharge settings - Always show for admins with client_id */}
              {isAdmin && hasClientId && (
                <div className="bg-slate-50 px-6 py-5 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings size={14} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500">Auto-Recharge</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">${settings?.auto_recharge_amount ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Low Balance Threshold</span>
                    <span className="text-xs font-bold text-amber-600">${settings?.low_balance_threshold ?? 0}</span>
                  </div>
                  {settings?.allow_admin_auto_recharge_edit && (
                    <p className="text-[9px] font-semibold text-slate-400 leading-relaxed">
                      Auto-recharge will trigger when balance falls below ${settings.low_balance_threshold}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Analytics */}
          <Card className="lg:col-span-2 border border-slate-100 shadow-sm bg-white overflow-hidden rounded-xl">
            <CardHeader className="border-b border-slate-50 flex flex-row items-center justify-between p-6">
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Usage Summary</CardTitle>
                <p className="text-xs font-medium text-slate-400 mt-0.5">
                  Current period usage metrics
                </p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg">
                <Activity className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {usage ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Usage Summary Wrapper */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl">
                          <Activity className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Voice Calls</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{usage.voice_calls ?? 0} Calls</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900 tabular-nums">${usage.voice_cost?.toFixed(2) ?? '0.00'}</p>
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tight">VOICE COST</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">SMS Messages</p>
                        <p className="text-sm font-bold text-slate-900">{usage.sms_messages ?? 0}</p>
                        <p className="text-[10px] font-bold text-slate-500">${usage.sms_cost?.toFixed(2) ?? '0.00'}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Total Spent</p>
                        <p className="text-sm font-bold text-slate-900">${totalSpent.toFixed(2)}</p>
                        <p className="text-[10px] font-bold text-slate-500">This Period</p>
                      </div>
                    </div>
                  </div>

                  {period && (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Current Period</p>
                      <p className="text-xs font-bold text-slate-900 tracking-tight">
                        {format(new Date(period.start), 'MMM d')} - {format(new Date(period.end), 'MMM d, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-slate-300 mb-4" />
                  <p className="text-sm font-semibold text-slate-400">No usage data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction List - Show for admins with client_id, not superadmin */}
      {hasClientId && (
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
          <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <History className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-slate-900 tracking-tight">Recent Transactions</CardTitle>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Latest payment activity</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-xs font-semibold"
              onClick={() => router.push('/dashboard/transactions')}
            >
              View All <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTransactions ? (
              <div className="p-12 text-center">
                <div className="h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">Loading transactions...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-sm font-semibold text-slate-400">No transactions yet</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                            {tx.amount > 0 ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">
                              {tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </p>
                            <p className="text-xs text-slate-500">{format(new Date(tx.created_at), 'MMM d, yyyy · HH:mm')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold tabular-nums ${tx.amount > 0 ? 'text-green-600' : 'text-slate-900'}`}>
                            {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-slate-400">Balance: ${tx.balance_after.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {transactionTotal > TRANSACTIONS_PER_PAGE && (
                  <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                    <p className="text-xs font-semibold text-slate-500">
                      Showing {transactionPage * TRANSACTIONS_PER_PAGE + 1}-{Math.min((transactionPage + 1) * TRANSACTIONS_PER_PAGE, transactionTotal)} of {transactionTotal}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setTransactionPage(p => Math.max(0, p - 1))}
                        disabled={transactionPage === 0}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs"
                        onClick={() => setTransactionPage(p => p + 1)}
                        disabled={(transactionPage + 1) * TRANSACTIONS_PER_PAGE >= transactionTotal}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Services Paused Alert - Only show if user has client_id */}
      {hasClientId && isPaused && !isViewer && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-5 flex items-start gap-4 animate-in slide-in-from-bottom-2 duration-500">
          <div className="bg-red-100 p-2 rounded-lg">
            <AlertCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="space-y-1">
            <h4 className="text-md font-bold text-red-900">Services Paused</h4>
            <p className="text-sm text-red-700 font-medium">Your wallet balance is empty. Services are suspended until you add funds.</p>
            <Button className="mt-3 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs h-9 px-4 rounded-lg" onClick={handleTopup}>
              Add Funds Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

