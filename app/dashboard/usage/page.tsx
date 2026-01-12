'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Phone,
    MessageSquare,
    TrendingUp,
    Calendar,
    Loader2
} from 'lucide-react';
import { billingApi } from '@/lib/api/billing';
import { BillingCurrentResponse } from '@/lib/types/billing';
import { me } from '@/lib/api/auth';
import { toast } from 'sonner';

export default function UsagePage() {
    const router = useRouter();
    const [billingData, setBillingData] = useState<BillingCurrentResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    useEffect(() => {
        const fetchUsage = async () => {
            try {
                // Get user info to check if superadmin
                const userData = await me();
                const userRole = userData.role as string;
                
                // Check if user is superadmin or doesn't have a client_id
                if (userRole === 'superadmin' || !userData.client_id) {
                    setIsSuperadmin(true);
                    setLoading(false);
                    return;
                }

                const response = await billingApi.getCurrentBilling();
                if (response.success) {
                    setBillingData(response.data);
                } else if (response.error) {
                    // Handle error gracefully
                    console.warn('[USAGE] Billing fetch failed:', response.error.message);
                    // Don't show error toast for expected failures (superadmin, no client, etc.)
                    if (response.error.message && !response.error.message.includes('client') && !response.error.message.includes('Client ID')) {
                        toast.error('Failed to load usage breakdown', { description: response.error.message });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch usage:', error);
                // Only show error if it's not related to client_id
                if (error instanceof Error && !error.message.includes('client') && !error.message.includes('Client ID')) {
                    toast.error('Failed to load usage breakdown');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUsage();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Loading usage...</p>
            </div>
        );
    }

    // Show message for superadmin users
    if (isSuperadmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-xl font-bold text-slate-900">Usage Data Not Available</h2>
                    <p className="text-slate-500">As a superadmin, usage data is not available at the organization level. Please use the Admin section to view platform-wide usage and manage clients.</p>
                    <Button 
                        onClick={() => router.push('/admin')}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        Go to Admin Panel
                    </Button>
                </div>
            </div>
        );
    }

    const voiceCost = billingData?.usage?.voice_cost || 0;
    const smsCost = billingData?.usage?.sms_cost || 0;
    const voiceCount = billingData?.usage?.voice_calls || 0;
    const smsCount = billingData?.usage?.sms_messages || 0;
    const totalUsageCost = billingData?.total_cost || (voiceCost + smsCost);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Usage</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Resource consumption breakdown for the current period</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                    <Calendar className="text-emerald-600 h-4 w-4" />
                    <span className="text-sm font-semibold text-slate-700">Current Period</span>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-emerald-100 shadow-sm bg-white overflow-hidden rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                                <Phone size={20} />
                            </div>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase">VAPI AI</Badge>
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Voice Usage</h3>
                        <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">${voiceCost.toFixed(2)}</p>
                        <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight">{voiceCount} Total Calls</p>
                    </CardContent>
                </Card>

                <Card className="border-teal-100 shadow-sm bg-white overflow-hidden rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-lg">
                                <MessageSquare size={20} />
                            </div>
                            <Badge variant="outline" className="bg-teal-50 text-teal-600 border-teal-100 font-bold text-[10px] uppercase">TWILIO</Badge>
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">SMS Usage</h3>
                        <p className="text-3xl font-bold text-slate-900 tabular-nums tracking-tight">${smsCost.toFixed(2)}</p>
                        <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-tight">{smsCount} Messages Sent</p>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 shadow-sm bg-slate-900 text-white overflow-hidden rounded-xl">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2.5 bg-white/10 text-emerald-400 rounded-lg">
                                <TrendingUp size={20} />
                            </div>
                            <Badge variant="outline" className="bg-white/10 text-white border-white/20 font-bold text-[10px] uppercase">TOTAL</Badge>
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-white/50">Total Spend</h3>
                        <p className="text-3xl font-bold tabular-nums tracking-tight">${totalUsageCost.toFixed(2)}</p>
                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tight">Deducted from wallet</p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdown */}
            <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                    <div className="flex items-center gap-3">
                        <Activity className="text-emerald-600 h-5 w-5" />
                        <div>
                            <CardTitle className="text-lg font-bold tracking-tight">Service Breakdown</CardTitle>
                            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consumption Details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Service</TableHead>
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Units</TableHead>
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Metric</TableHead>
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Rate</TableHead>
                                <TableHead className="py-3 text-right font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 pr-6">Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                <TableCell className="py-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                            <Phone size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">Voice Calls</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">VAPI AI Service</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold text-slate-900 text-sm tabular-nums">{voiceCount}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-500 uppercase tracking-tight">Minutes</TableCell>
                                <TableCell className="text-xs font-bold text-slate-500 uppercase tracking-tight">Standard + Markup</TableCell>
                                <TableCell className="text-right py-4 pr-6">
                                    <span className="text-base font-bold text-slate-900 tabular-nums">${voiceCost.toFixed(2)}</span>
                                </TableCell>
                            </TableRow>

                            <TableRow className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                <TableCell className="py-4 pl-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">
                                            <MessageSquare size={16} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 text-sm">SMS Messages</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Twilio SMS Gateway</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-bold text-slate-900 text-sm tabular-nums">{smsCount}</TableCell>
                                <TableCell className="text-xs font-bold text-slate-500 uppercase tracking-tight">Messages</TableCell>
                                <TableCell className="text-xs font-bold text-slate-500 uppercase tracking-tight">Outgoing Rate</TableCell>
                                <TableCell className="text-right py-4 pr-6">
                                    <span className="text-base font-bold text-slate-900 tabular-nums">${smsCost.toFixed(2)}</span>
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Information Alert */}
            <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm text-emerald-600">
                    <Activity size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-1">Usage Data Notice</h4>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight leading-relaxed">
                        Usage metrics are synchronized daily from upstream providers. Costs displayed include your organization's specific markup. For live balance updates, please refer to the main dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}
