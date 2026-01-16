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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { billingApi } from '@/lib/api/billing';
import { WalletTransaction } from '@/lib/types/billing';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, History, Wallet, Search, CreditCard, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { me } from '@/lib/api/auth';

export default function TransactionsPage() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSuperadmin, setIsSuperadmin] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [total, setTotal] = useState(0);
    const TRANSACTIONS_PER_PAGE = 20;

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                // Get user info to check if superadmin
                const userData = await me();
                const userRole = userData.role as string;
                
                // Set superadmin flag but still try to fetch data
                if (userRole === 'superadmin' || !userData.client_id) {
                    setIsSuperadmin(true);
                }

                // Try to fetch transactions (API may support superadmin without client_id)
                await loadTransactions(currentPage);
            } catch (error: any) {
                // Silently handle 400/404 errors (API may not support superadmin without client_id)
                if (error.response?.status === 400 || error.response?.status === 404) {
                    setTransactions([]);
                } else {
                    console.error('Failed to fetch transactions:', error);
                    // Only show error if it's not related to client_id
                    if (!error.message?.includes('client') && !error.message?.includes('Client ID')) {
                        toast.error(error.response?.data?.error?.message || error.message || 'An unexpected error occurred');
                    }
                }
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, []);

    const loadTransactions = async (page: number) => {
        setLoading(true);
        try {
            const offset = page * TRANSACTIONS_PER_PAGE;
            const response = await billingApi.getTransactions(undefined, TRANSACTIONS_PER_PAGE, offset);
            if (response.success) {
                setTransactions(response.data.transactions);
                setTotal(response.data.total);
            } else {
                // Don't show error toast for expected failures (superadmin, no client, etc.)
                if (response.error?.message && !response.error.message.includes('client') && !response.error.message.includes('Client ID')) {
                    toast.error(response.error?.message || 'Failed to load transactions');
                }
            }
        } catch (error: any) {
            console.error('Failed to fetch transactions:', error);
            if (!error.message?.includes('client') && !error.message?.includes('Client ID')) {
                toast.error('Failed to load transactions');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Load transactions for all users including superadmin
        loadTransactions(currentPage);
    }, [currentPage]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                <p className="text-sm text-slate-500 font-medium font-bold uppercase tracking-widest text-[10px]">Loading transactions...</p>
            </div>
        );
    }


    const getTransactionIcon = (type: string) => {
        const t = type.toLowerCase();
        if (['topup', 'auto_recharge', 'adjustment', 'refund', 'credit_given'].includes(t)) {
            return (
                <div className="p-1.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-green-600" />
                </div>
            );
        }
        return (
            <div className="p-1.5 bg-amber-50 rounded-lg group-hover:bg-amber-100 transition-colors">
                <ArrowUpRight className="h-3.5 w-3.5 text-amber-600" />
            </div>
        );
    };

    const getTransactionColor = (type: string, amount: number) => {
        if (amount > 0) {
            return "text-green-600 font-bold";
        }
        return "text-slate-900 font-semibold";
    }

    const formatTransactionType = (type: string) => {
        return type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {isSuperadmin ? 'Platform Transactions' : 'Payments'}
                    </h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        {isSuperadmin ? 'View all platform-wide transaction history' : 'History of credits, top-ups, and service usage'}
                    </p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                    <Wallet className="text-emerald-600" size={16} />
                    <span className="text-sm font-semibold text-slate-600">Unified Wallet</span>
                </div>
            </div>

            {/* Main Content */}
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <History className="text-emerald-600" size={18} />
                            <CardTitle className="text-lg font-bold tracking-tight">Activity Log</CardTitle>
                        </div>
                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 font-semibold text-[10px] uppercase">
                            Recent
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Date</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Type</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11">Description</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Amount</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-400 tracking-wider h-11 text-right">Balance</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="animate-pulse border-slate-50">
                                        <TableCell colSpan={5} className="h-14 bg-slate-50/10"></TableCell>
                                    </TableRow>
                                ))
                            ) : transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-3 opacity-60">
                                            <div className="p-4 bg-slate-50 rounded-full">
                                                <Search size={32} className="text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">No activity yet</p>
                                                <p className="text-xs text-slate-500">Your payments will appear here in detail.</p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((item) => (
                                    <TableRow key={item.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="text-slate-500 text-xs whitespace-nowrap">
                                            {format(new Date(item.created_at), 'MMM d, yyyy · HH:mm')}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getTransactionIcon(item.type)}
                                                <span className="text-sm font-semibold text-slate-700">
                                                    {formatTransactionType(item.type)}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-slate-600 text-xs max-w-xs truncate">
                                            {item.description || <span className="text-slate-300 italic">No details</span>}
                                        </TableCell>

                                        <TableCell className={`text-right ${getTransactionColor(item.type, item.amount)}`}>
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm tabular-nums">{item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}</span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-slate-900 text-sm tabular-nums">${item.balance_after.toFixed(2)}</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
                {total > TRANSACTIONS_PER_PAGE && (
                    <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                        <p className="text-xs font-semibold text-slate-500">
                            Showing {currentPage * TRANSACTIONS_PER_PAGE + 1}-{Math.min((currentPage + 1) * TRANSACTIONS_PER_PAGE, total)} of {total}
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
                                disabled={(currentPage + 1) * TRANSACTIONS_PER_PAGE >= total}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* Quick Actions / Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <CreditCard size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Add Funds</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Need more credits? You can add funds to your wallet instantly from the dashboard.
                        </p>
                    </div>
                </div>
                <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm flex items-start gap-4">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                        <ArrowDownLeft size={18} />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Auto-Recharge</h4>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Enable auto-recharge in settings to ensure your services are never interrupted.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
