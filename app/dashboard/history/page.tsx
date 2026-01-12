'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from '@/components/ui/button';
import { billingApi } from '@/lib/api/billing';
import { BillingHistoryItem } from '@/lib/types/billing';
import { format } from 'date-fns';
import { Download, Calendar, Loader2 } from 'lucide-react';
import { me } from '@/lib/api/auth';
import clsx from 'clsx';

export default function HistoryPage() {
    const router = useRouter();
    const [periods, setPeriods] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
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
                    setPeriods(response.data.periods);
                } else {
                    // Don't show error for expected failures (superadmin, no client, etc.)
                    if (response.error?.message && !response.error.message.includes('client') && !response.error.message.includes('Client ID')) {
                        setError(response.error?.message || 'Failed to fetch billing history');
                    }
                }
            } catch (error: any) {
                console.error('Failed to fetch history:', error);
                // Only set error if it's not related to client_id
                if (!error.message?.includes('client') && !error.message?.includes('Client ID')) {
                    setError(error.response?.data?.error?.message || error.message || 'An unexpected error occurred');
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
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Loading history...</p>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Billing History</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Review your past usage and download invoices</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3" role="alert">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span className="text-sm font-semibold">{error}</span>
                </div>
            )}

            <Card className="rounded-xl border border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-emerald-600 h-5 w-5" />
                        <CardTitle className="text-lg font-bold">Past Cycles</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading history...</div>
                    ) : !periods || periods.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No billing cycles found</div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/30">
                                <TableRow className="hover:bg-transparent border-b border-slate-100">
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Cycle Range</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Usage</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Cost</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Status</TableHead>
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right pr-6">Invoice</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {periods.map((period) => (
                                    <TableRow key={period.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="font-bold text-slate-900 text-sm">
                                            {format(new Date(period.period_start), 'MMM d')} - {format(new Date(period.period_end), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-xs font-semibold text-slate-600">{period.total_calls} Calls</span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm font-bold text-slate-900">${period.total_cost.toFixed(2)}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={clsx(
                                                "capitalize text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-md",
                                                period.status === 'current' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-200"
                                            )}>
                                                {period.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            {period.invoice_url ? (
                                                <Button variant="ghost" size="sm" className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold text-xs" onClick={() => window.open(period.invoice_url!, '_blank')}>
                                                    <Download className="h-3.5 w-3.5 mr-1.5" /> PDF
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase italic">Pending</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
