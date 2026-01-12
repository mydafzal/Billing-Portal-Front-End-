'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import {
    Plus,
    ArrowRight,
    Building2,
    Search,
    Filter,
    CircleEllipsis,
    ArrowUpRight,
    Loader2,
    CheckCircle2,
    XCircle,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { Client, CreateClientRequest } from '@/lib/types/admin';
import { getUserRole } from '@/lib/auth/role';

export default function ClientsPage() {
    const router = useRouter();
    const role = getUserRole();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newClient, setNewClient] = useState<Partial<CreateClientRequest>>({
        id: '',
        name: '',
        crm_type: 'boulevard',
        markup_percent: 20,
        bill_sms: true,
        billing_email: '',
        low_balance_threshold: 25,
        auto_recharge_amount: 50,
        per_call_surcharge: 0.02,
        per_sms_surcharge: 0.01,
        allow_admin_auto_recharge_edit: false
    });

    const fetchClients = async () => {
        setLoading(true);
        try {
            console.log('[CLIENTS] Fetching clients...');
            const response = await adminApi.getClients(false);
            console.log('[CLIENTS] Response:', response);
            
            if (response.success) {
                const clientsList = response.data?.clients || [];
                console.log('[CLIENTS] Clients fetched:', clientsList.length, clientsList);
                setClients(clientsList);
                
                if (clientsList.length === 0) {
                    console.warn('[CLIENTS] No clients found in response');
                }
            } else {
                console.error('[CLIENTS] Failed to fetch clients:', response.error);
                toast.error('Failed to load clients', { 
                    description: response.error?.message || 'Unknown error' 
                });
            }
        } catch (error: any) {
            console.error('[CLIENTS] Exception fetching clients:', error);
            console.error('[CLIENTS] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast.error('Failed to load clients', { 
                description: error.response?.data?.error?.message || error.message || 'Unknown error' 
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        fetchClients();
    }, [role, router]);

    const handleCreate = async () => {
        try {
            if (!newClient.id || !newClient.name) {
                toast.error('Missing Fields', { description: 'ID and Name are required.' });
                return;
            }
            
            // Validate and clean the client ID
            const clientId = newClient.id.trim().toLowerCase();
            const idPattern = /^[a-z0-9-]+$/;
            
            if (!idPattern.test(clientId)) {
                toast.error('Invalid Client ID', { 
                    description: 'Client ID must contain only lowercase letters, numbers, and hyphens (e.g., "client-123" or "my-client")' 
                });
                return;
            }
            
            // Ensure crm_type is set
            if (!newClient.crm_type) {
                newClient.crm_type = 'boulevard';
            }
            
            // Build the request payload with all required fields
            // Only include fields that have values (don't send undefined)
            const payload: any = {
                id: clientId,
                name: newClient.name!.trim(),
                crm_type: newClient.crm_type || 'boulevard',
                markup_percent: newClient.markup_percent ?? 20,
                bill_sms: newClient.bill_sms ?? true
            };
            
            // Add optional fields only if they have values
            if (newClient.billing_email && newClient.billing_email.trim()) {
                payload.billing_email = newClient.billing_email.trim();
            }
            if (newClient.low_balance_threshold !== undefined && newClient.low_balance_threshold !== null) {
                payload.low_balance_threshold = newClient.low_balance_threshold;
            }
            if (newClient.auto_recharge_amount !== undefined && newClient.auto_recharge_amount !== null) {
                payload.auto_recharge_amount = newClient.auto_recharge_amount;
            }
            if (newClient.allow_admin_auto_recharge_edit !== undefined) {
                payload.allow_admin_auto_recharge_edit = newClient.allow_admin_auto_recharge_edit;
            }
            if (newClient.per_call_surcharge !== undefined && newClient.per_call_surcharge !== null) {
                payload.per_call_surcharge = newClient.per_call_surcharge;
            }
            if (newClient.per_sms_surcharge !== undefined && newClient.per_sms_surcharge !== null) {
                payload.per_sms_surcharge = newClient.per_sms_surcharge;
            }
            if (newClient.backend_url && newClient.backend_url.trim()) {
                payload.backend_url = newClient.backend_url.trim();
            }
            
            console.log('[CLIENTS] Creating client with payload:', payload);
            
            const response = await adminApi.createClient(payload);
            
            if (response.success) {
                setIsCreateOpen(false);
                // Reset form
                setNewClient({
                    id: '',
                    name: '',
                    crm_type: 'boulevard',
                    markup_percent: 20,
                    bill_sms: true,
                    billing_email: '',
                    low_balance_threshold: 25,
                    auto_recharge_amount: 50,
                    per_call_surcharge: 0.02,
                    per_sms_surcharge: 0.01,
                    allow_admin_auto_recharge_edit: false
                });
                fetchClients();
                toast.success('Client Created', { description: `${payload.name} has been added.` });
            } else {
                // Show detailed error message
                const errorMsg = response.error?.message || 'Failed to create client';
                console.error('[CLIENTS] Create failed:', errorMsg);
                toast.error('Creation Failed', { 
                    description: errorMsg,
                    duration: 5000 // Show longer for validation errors
                });
            }
        } catch (error: any) {
            console.error('[CLIENTS] Create client error:', error);
            console.error('[CLIENTS] Error response:', error?.response?.data);
            
            // Extract detailed error message
            let errorMessage = 'Failed to create client';
            if (error?.response?.data) {
                if (Array.isArray(error.response.data.detail)) {
                    const validationErrors = error.response.data.detail.map((err: any) => {
                        const field = err.loc ? err.loc.slice(1).join('.') : 'unknown';
                        return `${field}: ${err.msg || err.message || 'Invalid value'}`;
                    });
                    errorMessage = `Validation errors:\n${validationErrors.join('\n')}`;
                } else if (error.response.data.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.response.data.detail) {
                    errorMessage = typeof error.response.data.detail === 'string' 
                        ? error.response.data.detail 
                        : JSON.stringify(error.response.data.detail);
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            toast.error('Creation Failed', { 
                description: errorMessage,
                duration: 5000
            });
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Clients</h1>
                    <p className="text-slate-500 font-medium text-sm">Manage your clients and their service configurations</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-10 px-6 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all active:scale-95">
                            <Plus className="mr-2 h-4 w-4" /> Add Client
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl bg-white border border-slate-200 shadow-2xl rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold tracking-tight">Add Client</DialogTitle>
                            <DialogDescription className="font-medium text-sm text-slate-500">
                                Enter the client's information and billing settings
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Client Details</Label>
                                    <div className="space-y-1">
                                        <Input
                                            placeholder="client-id-123"
                                            className="h-10 border-slate-200 rounded-lg focus:border-emerald-500"
                                            value={newClient.id}
                                            onChange={(e) => {
                                                // Auto-convert to lowercase and remove spaces/invalid characters
                                                const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                setNewClient({ ...newClient, id: value });
                                            }}
                                        />
                                        <p className="text-[10px] font-medium text-slate-400 ml-1">
                                            Only lowercase letters, numbers, and hyphens allowed
                                        </p>
                                    </div>
                                    <Input
                                        placeholder="Name"
                                        className="h-10 border-slate-200 rounded-lg focus:border-emerald-500"
                                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    />
                                    <Input
                                        placeholder="Billing Email"
                                        type="email"
                                        className="h-10 border-slate-200 rounded-lg focus:border-emerald-500"
                                        onChange={(e) => setNewClient({ ...newClient, billing_email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">CRM System</Label>
                                    <select
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:border-emerald-500 focus:outline-none"
                                        onChange={(e) => setNewClient({ ...newClient, crm_type: e.target.value as any })}
                                        value={newClient.crm_type}
                                    >
                                        <option value="boulevard">Boulevard</option>
                                        <option value="ghl">GHL</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label className="text-xs font-bold text-slate-500 ml-1">Billing Settings</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Markup %</span>
                                        <Input type="number" className="h-9 rounded-lg border-slate-200" value={newClient.markup_percent}
                                            onChange={(e) => setNewClient({ ...newClient, markup_percent: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Threshold $</span>
                                        <Input type="number" className="h-9 rounded-lg border-slate-200" value={newClient.low_balance_threshold}
                                            onChange={(e) => setNewClient({ ...newClient, low_balance_threshold: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Auto-Rech $</span>
                                        <Input type="number" className="h-9 rounded-lg border-slate-200" value={newClient.auto_recharge_amount}
                                            onChange={(e) => setNewClient({ ...newClient, auto_recharge_amount: Number(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Surcharge $</span>
                                        <Input type="number" step="0.01" className="h-9 rounded-lg border-slate-200" value={newClient.per_call_surcharge}
                                            onChange={(e) => setNewClient({ ...newClient, per_call_surcharge: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2.5 pt-2">
                                    <div className="flex items-center gap-2.5">
                                        <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            checked={newClient.bill_sms}
                                            onChange={(e) => setNewClient({ ...newClient, bill_sms: e.target.checked })}
                                        />
                                        <span className="text-xs font-semibold text-slate-600">Enable SMS Billing</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                        <input type="checkbox" className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                            checked={newClient.allow_admin_auto_recharge_edit}
                                            onChange={(e) => setNewClient({ ...newClient, allow_admin_auto_recharge_edit: e.target.checked })}
                                        />
                                        <span className="text-xs font-semibold text-slate-600">Allow Client Editing</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="border-t border-slate-100 pt-6">
                            <Button className="w-full h-10 bg-slate-900 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-slate-800 transition-all" onClick={handleCreate}>
                                Create Client
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* View Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <Card className="flex-1 border border-slate-200 shadow-sm bg-white rounded-lg overflow-hidden">
                    <CardContent className="p-0 flex items-center px-3">
                        <Search size={16} className="text-slate-400" />
                        <input
                            placeholder="Search clients..."
                            className="bg-transparent border-0 focus:ring-0 text-sm w-full font-medium h-10 px-3 placeholder:text-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </CardContent>
                </Card>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-slate-50 border-slate-200 text-xs font-bold text-slate-600 px-3 py-1.5 shadow-sm">
                        {clients.length} clients
                    </Badge>
                </div>
            </div>

            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-xs text-slate-500 py-4 pl-6">Client</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Status</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">CRM</TableHead>
                            <TableHead className="text-right font-bold text-xs text-slate-500">Balance</TableHead>
                            <TableHead className="text-right font-bold text-xs text-slate-500 pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : filteredClients.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                        <CircleEllipsis size={40} />
                                        <p className="font-bold text-sm">No clients found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredClients.map((client) => {
                                const isLow = client.wallet_balance < client.low_balance_threshold;
                                const isCritical = client.wallet_balance <= 0;

                                return (
                                    <TableRow key={client.id} className="group hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-0">
                                        <TableCell className="py-4 pl-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                                                    <Building2 size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-900">{client.name}</span>
                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{client.id}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {client.services_paused ? (
                                                <Badge className="bg-red-50 text-red-700 border-red-100 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none hover:bg-red-50">
                                                    Paused
                                                </Badge>
                                            ) : client.is_active ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none hover:bg-emerald-50">
                                                    Active
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none hover:bg-slate-100">
                                                    Inactive
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200">{client.crm_type}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className={`text-sm font-bold tabular-nums ${isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                                                    ${client.wallet_balance.toFixed(2)}
                                                </span>
                                                {isLow && (
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 uppercase">
                                                        <AlertTriangle size={10} /> Low
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg group/btn" asChild>
                                                <Link href={`/admin/clients/${client.id}`} className="flex items-center gap-2">
                                                    View <ArrowUpRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
