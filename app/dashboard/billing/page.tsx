'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { billingApi } from '@/lib/api/billing';
import { BillingHistoryItem } from '@/lib/types/billing';
import { format } from 'date-fns';
import { ExternalLink, Receipt, AlertCircle, FileText, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { me } from '@/lib/api/auth';

export default function BillingHistoryPage() {
    const router = useRouter();
    const [history, setHistory] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperadmin, setIsSuperadmin] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                // Get user info to check if superadmin
                const userData = await me();
                const userRole = userData.role as string;
                
                // Check if user is superadmin or doesn't have a client_id
                if (userRole === 'superadmin' || !userData.client_id) {
                    setIsSuperadmin(true);
                    setLoading(false);
                    return; // Prevent further API calls for superadmins
                }

                const response = await billingApi.getBillingHistory();
                if (response.success) {
                    setHistory(response.data.periods || []);
                } else {
                    // Don't show error toast for expected failures (superadmin, no client, etc.)
                    if (response.error?.message && !response.error.message.includes('client') && !response.error.message.includes('Client ID')) {
                        toast.error(response.error?.message || 'Failed to load billing history');
                    }
                }
            } catch (error: any) {
                // Ignore 400/404 for superadmins/new users
                if (error.response?.status === 400 || error.response?.status === 404) {
                    setHistory([]);
                    return;
                }
                console.error('Failed to fetch billing history:', error);
                // Only show error if it's not related to client_id
                if (!error.message?.includes('client') && !error.message?.includes('Client ID')) {
                    toast.error('An unexpected error occurred while loading billing history');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Loading billing history...</p>
            </div>
        );
    }

    // Show message for superadmin users
    if (isSuperadmin) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="text-center space-y-4 max-w-md">
                    <h2 className="text-xl font-bold text-slate-900">Billing History Not Available</h2>
                    <p className="text-slate-500">As a superadmin, billing history is not available at the organization level. Please use the Admin section to view platform-wide billing and manage clients.</p>
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

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Usage History
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        View your usage periods and spending history
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white shadow-sm px-4 py-2 rounded-lg border border-slate-200 uppercase tracking-widest">
                    <Receipt size={16} className="text-emerald-600" />
                    <span>Prepaid Wallet</span>
                </div>
            </div>

            {/* Content Area */}
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                    <div className="flex items-center gap-3">
                        <FileText className="text-emerald-600" size={18} />
                        <CardTitle className="text-lg font-bold tracking-tight">Usage Periods</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 pl-6">Period</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Voice</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">SMS</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Total</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-center">Status</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right pr-6">Invoice</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse border-slate-50">
                                        <TableCell colSpan={5} className="h-16 bg-slate-50/10"></TableCell>
                                    </TableRow>
                                ))
                            ) : history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Receipt size={32} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 uppercase text-xs tracking-widest">No usage history yet</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">Usage periods will appear here as you use services.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((item) => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50/30 transition-colors border-slate-50">
                                        <TableCell className="py-4 pl-6">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm">
                                                    {format(new Date(item.period_start), 'MMM d')} - {format(new Date(item.period_end), 'MMM d, yyyy')}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.id}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-slate-600 text-sm font-bold tabular-nums">
                                            ${item.voice_cost.toFixed(2)}
                                        </TableCell>

                                        <TableCell className="text-slate-600 text-sm font-bold tabular-nums">
                                            ${item.sms_cost.toFixed(2)}
                                        </TableCell>

                                        <TableCell className="font-bold text-slate-900 text-sm tabular-nums">
                                            ${item.total.toFixed(2)}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Badge
                                                variant="outline"
                                                className={`rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider border-0 shadow-none hover:opacity-80 transition-opacity ${item.status === "finalized"
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-amber-50 text-amber-700"
                                                    }`}
                                            >
                                                {item.status}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-right pr-6">
                                            {item.stripe_invoice_url ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 h-8 gap-2 rounded-lg font-bold text-xs"
                                                    asChild
                                                >
                                                    <a href={item.stripe_invoice_url} target="_blank" rel="noopener noreferrer">
                                                        <Download size={12} />
                                                        <span>View</span>
                                                    </a>
                                                </Button>
                                            ) : (
                                                <span className="text-slate-400 text-[9px] font-bold uppercase tracking-tight italic">—</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Footer Help */}
            <div className="p-5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-4">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    <AlertCircle className="text-emerald-600" size={18} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-900 text-xs mb-1">Usage Tracking</h4>
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-tight leading-relaxed">
                        Usage is tracked in real-time and deducted from your prepaid wallet balance. Periods are finalized monthly for record-keeping.
                    </p>
                </div>
            </div>
        </div>
    );
}
