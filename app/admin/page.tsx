'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Building2, Wallet, AlertTriangle, PauseCircle, Save, Loader2, AlertCircle } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { PlatformOverviewResponse } from '@/lib/types/admin';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { me } from '@/lib/api/auth';

export default function AdminOverviewPage() {
    const router = useRouter();
    const [data, setData] = useState<PlatformOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        setIsMounted(true);
        const checkAccess = async () => {
            try {
                const userData = await me();
                const role = userData.role as string;
                setUserRole(role);
                
                // Block viewers and non-superadmins from accessing admin pages
                if (role !== 'superadmin') {
                    setError('Access Denied');
                    setLoading(false);
                    return;
                }
            } catch (error) {
                console.error('Failed to check user role:', error);
            }
        };

        const fetchOverview = async () => {
            try {
                const response = await adminApi.getOverview();
                if (response.success) {
                    setData(response.data);
                    setError(null);
                } else {
                    // Handle error response
                    const errorMessage = response.error?.message || 'Failed to fetch overview';
                    setError(errorMessage);
                    // Don't show toast for 403 - it's a permission issue
                    if (!errorMessage.includes('403') && !errorMessage.includes('Forbidden') && !errorMessage.includes('Superadmin')) {
                        toast.error('Failed to load overview', { description: errorMessage });
                    }
                }
            } catch (error: any) {
                console.error('Failed to fetch overview:', error);
                const errorMessage = error.response?.data?.error?.message || error.response?.data?.detail || error.message || 'Failed to fetch overview';
                setError(errorMessage);
                // Don't show toast for 403 - it's a permission issue
                if (error.response?.status !== 403 && !errorMessage.includes('Forbidden') && !errorMessage.includes('Superadmin')) {
                    toast.error('Failed to load overview', { description: errorMessage });
                }
            } finally {
                setLoading(false);
            }
        };

        checkAccess().then(() => {
            if (userRole === 'superadmin') {
                fetchOverview();
            }
        });
    }, [userRole]);

    const clientCount = data?.total_clients || 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading Overview...</p>
            </div>
        );
    }

    // Show error message if there's a permission issue
    if (error && (error.includes('403') || error.includes('Forbidden') || error.includes('permission') || error.includes('Superadmin') || error === 'Access Denied')) {
        const isViewer = userRole === 'viewer';
        const isAdmin = userRole === 'admin';
        
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="text-center space-y-4 max-w-md">
                    <div className="p-4 bg-red-50 rounded-full inline-block">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
                    <p className="text-slate-500">
                        {isViewer 
                            ? 'Viewer accounts do not have access to admin features. Please contact your administrator if you need elevated permissions.'
                            : isAdmin
                            ? 'Admin accounts can manage users for their organization, but platform-wide admin features require superadmin access.'
                            : 'You don\'t have permission to access the admin overview. Superadmin access is required for this section.'}
                    </p>
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm rounded-lg transition-colors"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Show error message for other errors
    if (error) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Overview</h1>
                    <p className="text-slate-500 font-medium text-sm">System-wide platform statistics and status</p>
                </div>
                <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3" role="alert">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-semibold">{error}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Overview</h1>
                <p className="text-slate-500 font-medium text-sm">System-wide platform statistics and status</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <CardContent className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Balance</p>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">${(data?.total_wallet_balance || 0).toLocaleString()}</p>
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
                            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{clientCount}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                <span className="text-emerald-600 font-bold">{data?.active_clients || 0}</span> Active
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
                            <p className="text-2xl font-bold text-slate-900 tracking-tight mt-1">{data?.total_users || 0}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Global Total</p>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg">
                            <Users className="text-slate-400 h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Low Balance Clients */}
                <Card className="rounded-xl border border-orange-200 bg-orange-50/30 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">Low Balance Alerts</p>
                            <h2 className="text-xl font-bold text-slate-900 mt-1">{data?.clients_with_low_balance || 0} Clients</h2>
                            <p className="text-[10px] font-semibold text-orange-600/70 mt-1">Requires Attention</p>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg shadow-sm">
                            <AlertTriangle className="text-orange-600 h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                {/* Paused Clients */}
                <Card className="rounded-xl border border-red-200 bg-red-50/30 shadow-sm">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Paused Services</p>
                            <h2 className="text-xl font-bold text-slate-900 mt-1">{data?.paused_clients || 0} Clients</h2>
                            <p className="text-[10px] font-semibold text-red-600/70 mt-1">Services Suspended</p>
                        </div>
                        <div className="p-2.5 bg-white rounded-lg shadow-sm">
                            <PauseCircle className="text-red-600 h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Configuration */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Save className="h-4 w-4 text-slate-400" />
                    Configuration
                </h3>

                <Card className="rounded-xl shadow-sm border border-slate-200 bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-bold tracking-tight">Stripe Webhook</CardTitle>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold uppercase py-0.5 px-2">Critical</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-5 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 ml-1">Webhook URL</Label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={`${isMounted ? window.location.origin : ''}/api/webhooks/stripe`}
                                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono font-bold text-emerald-600 outline-none focus:border-emerald-500"
                                />
                                <button
                                    className="inline-flex items-center justify-center rounded-lg font-bold bg-slate-900 text-white hover:bg-slate-800 px-4 h-9 text-xs transition-colors shadow-sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/stripe`);
                                        toast.success('Stripe Webhook URL copied');
                                    }}
                                >
                                    Copy
                                </button>
                            </div>
                            <p className="text-[10px] font-semibold text-slate-400 leading-relaxed ml-1">
                                Use this URL in Stripe to synchronize payments and balances.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <Label className="text-[10px] font-bold text-slate-400 block mb-3 uppercase tracking-wider">Required Events</Label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {[
                                    'checkout.session.completed',
                                    'payment_intent.succeeded',
                                    'invoice.paid',
                                    'invoice.payment_failed'
                                ].map(event => (
                                    <div key={event} className="flex items-center gap-2 text-[10px] text-slate-600 bg-slate-50/50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                                        <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                        <span className="font-bold font-mono">{event}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
