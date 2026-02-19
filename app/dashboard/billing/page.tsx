'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { Receipt, AlertCircle, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { me } from '@/lib/api/auth';
import { getUserRole } from '@/lib/auth/role';
import { adminApi } from '@/lib/api/admin';
import { Client } from '@/lib/types/admin';

export default function BillingHistoryPage() {
    const [history, setHistory] = useState<BillingHistoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperadmin, setIsSuperadmin] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string>('');
    const [clients, setClients] = useState<Client[]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [total, setTotal] = useState(0);
    const PERIODS_PER_PAGE = 12;
    const role = getUserRole();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Get user info to check if superadmin
                const userData = await me();
                const userRole = userData.role as string;
                
                // Set superadmin flag but still try to fetch data
                if (userRole === 'superadmin' || !userData.client_id) {
                    setIsSuperadmin(true);
                    // Fetch clients list for superadmin
                    const clientsResp = await adminApi.getClients(false);
                    if (clientsResp.success && clientsResp.data?.clients) {
                        setClients(clientsResp.data.clients);
                    }
                } else {
                    // Regular user - fetch their billing history
                    const offset = currentPage * PERIODS_PER_PAGE;
                    const response = await billingApi.getBillingHistory(undefined, PERIODS_PER_PAGE, offset);
                    if (response.success) {
                        const data = response.data;
                        if (Array.isArray(data)) {
                            setHistory(data);
                        } else if (data && 'periods' in data) {
                            setHistory(data.periods || []);
                            if (data.pagination) {
                                setTotal(data.pagination.total);
                            }
                        } else {
                            setHistory([]);
                        }
                    }
                }
            } catch (error: any) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!isSuperadmin) return;
            if (!selectedClientId) {
                setHistory([]);
                setTotal(0);
                return;
            }

            setLoading(true);
            try {
                const offset = currentPage * PERIODS_PER_PAGE;
                const response = await billingApi.getBillingHistory(selectedClientId, PERIODS_PER_PAGE, offset);
                if (response.success) {
                    const data = response.data;
                    if (Array.isArray(data)) {
                        setHistory(data);
                    } else if (data && 'periods' in data) {
                        setHistory(data.periods || []);
                        if (data.pagination) {
                            setTotal(data.pagination.total);
                        }
                    } else {
                        setHistory([]);
                    }
                } else {
                    if (response.error?.message && !response.error.message.includes('client') && !response.error.message.includes('Client ID')) {
                        toast.error(response.error?.message || 'Failed to load billing history');
                    }
                    setHistory([]);
                    setTotal(0);
                }
            } catch (error: any) {
                console.error('Failed to fetch billing history:', error);
                setHistory([]);
                setTotal(0);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [selectedClientId, isSuperadmin, currentPage]);

    useEffect(() => {
        setCurrentPage(0);
    }, [selectedClientId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Loading billing history...</p>
            </div>
        );
    }


    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {isSuperadmin ? 'Platform Billing History' : 'Usage History'}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        {isSuperadmin ? 'View client usage periods and spending history' : 'View your usage periods and spending history'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isSuperadmin && (
                        <select
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:border-emerald-500 shadow-sm"
                            value={selectedClientId}
                            onChange={(e) => setSelectedClientId(e.target.value)}
                        >
                            <option value="">Select a client...</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    )}
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-white shadow-sm px-4 py-2 rounded-lg border border-slate-200 uppercase tracking-widest">
                        <Receipt size={16} className="text-emerald-600" />
                        <span>Prepaid Wallet</span>
                    </div>
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
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Voice Cost</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">SMS Cost</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Subtotal</TableHead>
                                {role !== 'admin' && (
                                    <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Markup</TableHead>
                                )}
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Total</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse border-slate-50">
                                        <TableCell colSpan={role === 'admin' ? 6 : 7} className="h-16 bg-slate-50/10"></TableCell>
                                    </TableRow>
                                ))
                            ) : history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={role === 'admin' ? 6 : 7} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Receipt size={32} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900 uppercase text-xs tracking-widest">
                                                    {isSuperadmin && !selectedClientId ? 'Select a client to view billing history' : 'No usage history yet'}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-1">
                                                    {isSuperadmin && !selectedClientId ? 'Choose a client from the dropdown above' : 'Usage periods will appear here as you use services.'}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((item) => {
                                    // Only use fields that exist in the API response
                                    const voiceCost = item.voice_cost ?? 0;
                                    const smsCost = item.sms_cost ?? 0;
                                    const subtotal = item.subtotal ?? 0;
                                    const markupPercent = item.markup_percent ?? 0;
                                    const markupAmount = item.markup_amount ?? 0;
                                    const total = item.total ?? 0;
                                    
                                    return (
                                        <TableRow key={item.id} className="group hover:bg-slate-50/30 transition-colors border-slate-50">
                                            <TableCell className="py-4 pl-6">
                                                <div className="flex flex-col">
                                                    {item.period_start && item.period_end ? (
                                                        <span className="font-bold text-slate-900 text-sm">
                                                            {format(new Date(item.period_start), 'MMM d')} - {format(new Date(item.period_end), 'MMM d, yyyy')}
                                                        </span>
                                                    ) : (
                                                        <span className="font-bold text-slate-900 text-sm">—</span>
                                                    )}
                                                    {item.created_at && (
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                            {format(new Date(item.created_at), 'MMM d, yyyy')}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            <TableCell className="text-slate-600 text-sm font-bold tabular-nums">
                                                ${voiceCost.toFixed(2)}
                                            </TableCell>

                                            <TableCell className="text-slate-600 text-sm font-bold tabular-nums">
                                                ${smsCost.toFixed(2)}
                                            </TableCell>

                                            <TableCell className="text-slate-600 text-sm font-bold tabular-nums">
                                                ${subtotal.toFixed(2)}
                                            </TableCell>

                                            {role !== 'admin' && (
                                                <TableCell className="text-slate-600 text-sm font-bold tabular-nums">
                                                    {markupPercent > 0 ? (
                                                        <div className="flex flex-col">
                                                            <span>${markupAmount.toFixed(2)}</span>
                                                            <span className="text-[10px] text-slate-400">({markupPercent}%)</span>
                                                        </div>
                                                    ) : (
                                                        <span>$0.00</span>
                                                    )}
                                                </TableCell>
                                            )}

                                            <TableCell className="font-bold text-slate-900 text-sm tabular-nums">
                                                ${total.toFixed(2)}
                                            </TableCell>

                                            <TableCell className="text-center">
                                                {item.status ? (
                                                    <Badge
                                                        variant="outline"
                                                        className={`rounded-lg px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider border-0 shadow-none hover:opacity-80 transition-opacity ${
                                                            item.status === "finalized" || item.status === "paid"
                                                                ? "bg-emerald-50 text-emerald-700"
                                                                : "bg-amber-50 text-amber-700"
                                                        }`}
                                                    >
                                                        {item.status}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-slate-400 text-[9px] font-bold uppercase tracking-tight italic">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {total > PERIODS_PER_PAGE && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-500">
                            Showing {currentPage * PERIODS_PER_PAGE + 1}-{Math.min((currentPage + 1) * PERIODS_PER_PAGE, total)} of {total}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => setCurrentPage(p => p + 1)}
                                disabled={(currentPage + 1) * PERIODS_PER_PAGE >= total}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
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
