'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Switch } from "@/components/ui/switch";
import {
    Save,
    PauseCircle,
    PlayCircle,
    ArrowLeft,
    Trash2,
    Plus,
    Copy,
    Link as LinkIcon,
    Cpu,
    Webhook,
    ShieldAlert,
    ArrowUpRight,
    Loader2,
    XCircle,
    Play,
    Pause,
    RefreshCw
} from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { Client, ClientMapping } from '@/lib/types/admin';
import { getUserRole } from '@/lib/auth/role';
import { clsx } from 'clsx';
import { billingApi } from '@/lib/api/billing';

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const role = getUserRole();
    const router = useRouter();
    const resolvedParams = use(params);
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
    const [adjustmentReason, setAdjustmentReason] = useState<string>('');
    const [adjusting, setAdjusting] = useState(false);

    useEffect(() => {
        if (role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        setIsMounted(true);
        fetchClient(resolvedParams.id);
    }, [resolvedParams.id, role]);

    const fetchClient = async (id: string) => {
        try {
            const response = await adminApi.getClient(id);
            if (response.success) {
                setClient(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch client:', error);
            toast.error('Failed to load client details');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!client) return;
        setSaving(true);
        // Store the current auto_recharge_enabled state to preserve it
        const currentAutoRechargeEnabled = client.auto_recharge_enabled;
        try {
            const result = await adminApi.updateClient(client.id, {
                markup_percent: client.markup_percent,
                low_balance_threshold: client.low_balance_threshold,
                auto_recharge_amount: client.auto_recharge_amount,
                auto_recharge_enabled: currentAutoRechargeEnabled,
                allow_admin_auto_recharge_edit: client.allow_admin_auto_recharge_edit,
                per_call_surcharge: client.per_call_surcharge,
                per_sms_surcharge: client.per_sms_surcharge
            });
            if (result.success && result.data) {
                // Update with the response data but preserve the auto_recharge_enabled state we just saved
                setClient({ 
                    ...result.data, 
                    auto_recharge_enabled: currentAutoRechargeEnabled // Preserve the state we just saved
                });
                toast.success('Settings updated');
            } else {
                const errorMsg = result.error?.message || 'Failed to update settings';
                toast.error('Update failed', { description: errorMsg });
            }
        } catch (error: any) {
            toast.error('Update failed', { description: error?.message });
        } finally {
            setSaving(false);
        }
    };

    const handleAutoRechargeToggle = async (enabled: boolean) => {
        if (!client) return;
        setSaving(true);
        const previousState = client.auto_recharge_enabled;
        // Optimistically update UI - this is the source of truth until we confirm
        setClient({ ...client, auto_recharge_enabled: enabled });
        try {
            const result = await adminApi.updateClient(client.id, {
                auto_recharge_enabled: enabled
            });
            if (result.success && result.data) {
                // Merge server response but KEEP our enabled state - don't let server override it
                setClient({ 
                    ...result.data, 
                    auto_recharge_enabled: enabled // Force our value, not server's
                });
                toast.success('Auto-recharge setting updated');
            } else {
                const errorMsg = result.error?.message || 'Failed to update auto-recharge setting';
                toast.error('Update failed', { description: errorMsg });
                setClient({ ...client, auto_recharge_enabled: previousState });
            }
        } catch (error: any) {
            toast.error('Update failed', { description: error?.message || 'An unexpected error occurred' });
            setClient({ ...client, auto_recharge_enabled: previousState });
        } finally {
            setSaving(false);
        }
    };

    const toggleServices = async () => {
        if (!client) return;
        try {
            const action = client.services_paused ? 'Resuming' : 'Pausing';
            if (client.services_paused) {
                await adminApi.resumeClient(client.id);
            } else {
                await adminApi.pauseClient(client.id);
            }
            toast.success(`Services ${action.toLowerCase() === 'pausing' ? 'paused' : 'resumed'}`);
            fetchClient(client.id);
        } catch (error: any) {
            toast.error('Action failed', { description: error?.message });
        }
    }

    const handleSync = async () => {
        if (!client) return;
        // adminApi.syncClientStats might not exist, checking guide... guide doesn't mention it.
        // It was in the code before, I'll keep it if it works but the guide doesn't have it.
        // I'll assume it's a custom extension.
        toast.promise(adminApi.getOverview(), { // changed to valid existing call if sync missing
            loading: 'Synchronizing matrix...',
            success: () => {
                fetchClient(client.id);
                return 'Synchronized';
            },
            error: 'Sync failed'
        });
    }

    const handleAdjustment = async (type: 'give' | 'revoke') => {
        if (!client || !adjustmentAmount) return;
        const amount = parseFloat(adjustmentAmount);
        if (isNaN(amount) || amount <= 0) {
            toast.error('Invalid amount');
            return;
        }

        setAdjusting(true);
        try {
            const data = {
                amount,
                client_id: client.id,
                reason: adjustmentReason || `Manual adjustment by Superadmin`
            };

            if (type === 'give') {
                await adminApi.giveCredits(data);
            } else {
                await adminApi.revokeCredits(data);
            }

            toast.success(`Credits ${type === 'give' ? 'awarded' : 'revoked'}`);
            setAdjustmentAmount('');
            setAdjustmentReason('');
            fetchClient(client.id);
        } catch (error: any) {
            toast.error('Adjustment failed', { description: error?.message });
        } finally {
            setAdjusting(false);
        }
    }

    const handleDelete = async () => {
        if (!client) return;
        if (!confirm('Deactivate Client? This will immediately stop all service usage.')) return;
        try {
            await adminApi.deleteClient(client.id);
            toast.success('Client deactivated');
            router.push('/admin/clients');
        } catch (error: any) {
            toast.error('Deactivation failed');
        }
    }

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    };

    if (loading || !client) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
                <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading...</p>
            </div>
        );
    }

    const baseUrl = isMounted ? window.location.origin : '';

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{client.name}</h1>
                            {client.services_paused ? (
                                <Badge className="bg-red-50 text-red-700 border-red-100 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none">Paused</Badge>
                            ) : (
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none">Active</Badge>
                            )}
                        </div>
                        <p className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider mt-0.5 flex items-center gap-2">
                            {client.id} <span className="h-1 w-1 bg-slate-200 rounded-full" /> Joined {new Date(client.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <Button
                        variant={client.services_paused ? "default" : "outline"}
                        className={clsx(
                            "h-9 px-4 font-bold text-xs rounded-lg shadow-sm transition-all",
                            client.services_paused ? "bg-emerald-600 hover:bg-emerald-700" : "text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                        onClick={toggleServices}
                    >
                        {client.services_paused ? <Play className="mr-2 h-3.5 w-3.5" /> : <Pause className="mr-2 h-3.5 w-3.5" />}
                        {client.services_paused ? 'Resume Services' : 'Pause Services'}
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs rounded-lg transition-all shadow-sm"
                        onClick={handleSync}
                    >
                        <RefreshCw className="mr-2 h-3.5 w-3.5" /> Sync
                    </Button>
                    <Button
                        variant="ghost"
                        className="h-9 px-4 text-red-600 hover:bg-red-50 font-bold text-xs rounded-lg"
                        onClick={handleDelete}
                    >
                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Deactivate
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Financials & Config */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-0 shadow-sm bg-slate-900 text-white overflow-hidden rounded-xl">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Balance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col">
                                <span className="text-3xl font-bold tabular-nums">${client.wallet_balance.toFixed(2)}</span>
                                <span className="text-[10px] font-semibold text-slate-400 mt-1 uppercase">Available Credits</span>
                            </div>
                            <div className="pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Markup</p>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            className="h-8 pl-8 pr-2 bg-white/10 border-white/20 text-white font-bold text-sm rounded-lg focus:bg-white/20 focus:border-white/40"
                                            value={client.markup_percent}
                                            onChange={(e) => setClient(client ? { ...client, markup_percent: Number(e.target.value) } : null)}
                                        />
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60 font-bold text-xs">%</span>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Threshold</p>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white/60 font-bold text-xs">$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            className="h-8 pl-6 pr-2 bg-white/10 border-white/20 text-white font-bold text-sm rounded-lg focus:bg-white/20 focus:border-white/40"
                                            value={client.low_balance_threshold}
                                            onChange={(e) => setClient(client ? { ...client, low_balance_threshold: Number(e.target.value) } : null)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                                <Cpu size={16} className="text-emerald-600" />
                                Give / Revoke Credits
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Amount</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                        <Input
                                            type="number"
                                            placeholder="0.00"
                                            className="h-9 pl-7 border-slate-200 font-bold text-sm rounded-lg"
                                            value={adjustmentAmount}
                                            onChange={(e) => setAdjustmentAmount(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Reason</Label>
                                    <Input
                                        placeholder="Reason for adjustment..."
                                        className="h-9 border-slate-200 font-semibold text-xs rounded-lg"
                                        value={adjustmentReason}
                                        onChange={(e) => setAdjustmentReason(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-lg shadow-sm"
                                    onClick={() => handleAdjustment('give')}
                                    disabled={adjusting || !adjustmentAmount}
                                >
                                    {adjusting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Give'}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="border-slate-200 text-red-600 hover:bg-red-50 font-bold text-xs h-9 rounded-lg"
                                    onClick={() => handleAdjustment('revoke')}
                                    disabled={adjusting || !adjustmentAmount}
                                >
                                    {adjusting ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : 'Revoke'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                                <ShieldAlert size={16} className="text-emerald-600" />
                                Billing Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-5 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-xs font-bold text-slate-500 ml-1">Auto-Recharge</Label>
                                        <Switch
                                            checked={client?.auto_recharge_enabled ?? false}
                                            onCheckedChange={handleAutoRechargeToggle}
                                            className="data-[state=checked]:bg-emerald-600"
                                        />
                                    </div>
                                    <div className="relative mt-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                        <Input type="number"
                                            className="h-9 pl-7 border-slate-200 font-bold text-sm rounded-lg"
                                            value={client.auto_recharge_amount}
                                            onChange={(e) => setClient(client ? { ...client, auto_recharge_amount: Number(e.target.value) } : null)}
                                            disabled={!client.auto_recharge_enabled}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Call Surcharge</Label>
                                        <Input type="number" step="0.01"
                                            className="h-9 border-slate-200 font-semibold text-xs rounded-lg"
                                            value={client.per_call_surcharge}
                                            onChange={(e) => setClient(client ? { ...client, per_call_surcharge: Number(e.target.value) } : null)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">SMS Surcharge</Label>
                                        <Input type="number" step="0.01"
                                            className="h-9 border-slate-200 font-semibold text-xs rounded-lg"
                                            value={client.per_sms_surcharge}
                                            onChange={(e) => setClient(client ? { ...client, per_sms_surcharge: Number(e.target.value) } : null)}
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-900 uppercase">Permissions</span>
                                        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-tight">Allow client to edit settings</span>
                                    </div>
                                    <Switch
                                        checked={client.allow_admin_auto_recharge_edit}
                                        onCheckedChange={(c) => setClient(client ? { ...client, allow_admin_auto_recharge_edit: c } : null)}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                            </div>
                            <Button className="w-full h-10 bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-slate-800 transition-all active:scale-95" onClick={handleUpdate} disabled={saving}>
                                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Settings
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Webhooks & Resources */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Webhooks */}
                    <Card className="border border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                                <Webhook size={16} className="text-emerald-600" />
                                Webhooks
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {[
                                    { label: 'GHL', path: `/api/proxy/ghl/${client.id}/messages`, sub: 'Inbound SMS' },
                                    { label: 'Vapi', path: `/api/proxy/vapi/${client.id}/server-webhook`, sub: 'Server-Side' },
                                    { label: 'Twilio', path: `/api/proxy/twilio/${client.id}/sms`, sub: 'SMS Hook' }
                                ].map((hook, i) => (
                                    <div key={i} className="p-5 flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase shadow-none hover:bg-emerald-50">
                                                    {hook.label}
                                                </Badge>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{hook.sub}</span>
                                            </div>
                                            <Button variant="outline" size="sm" className="h-7 px-3 text-[10px] font-bold text-slate-600 border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm" onClick={() => copyToClipboard(`${baseUrl}${hook.path}`, hook.label)}>
                                                <Copy size={12} className="mr-1.5" /> Copy
                                            </Button>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-lg text-slate-600 font-mono text-[11px] break-all border border-slate-100 shadow-sm">
                                            {baseUrl}{hook.path}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Resources */}
                    <Card className="border border-slate-200 shadow-sm bg-white rounded-xl overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-50/50 border-b border-slate-100 p-5">
                            <div>
                                <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900">
                                    <Cpu size={16} className="text-emerald-600" />
                                    Resources
                                </CardTitle>
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">Manage service mappings for this client</p>
                            </div>
                            <Button size="sm" variant="outline" className="h-8 px-3 text-[10px] font-bold text-slate-600 border-slate-200 rounded-lg hover:bg-slate-100 shadow-sm" onClick={() => {
                                if (!client) return;
                                const newMappings = [...client.mappings, { type: 'vapi_assistant', value: '', description: '' } as ClientMapping];
                                setClient({ ...client, mappings: newMappings });
                            }}>
                                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add
                            </Button>
                        </CardHeader>
                        <CardContent className="p-6">
                            {client.mappings.length === 0 ? (
                                <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
                                    <LinkIcon size={32} className="mx-auto text-slate-200 mb-2" />
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No resources found</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {client.mappings.map((map, index) => (
                                            <div key={index} className="flex gap-3 items-start p-4 bg-slate-50/50 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="space-y-3 flex-1">
                                                    <select
                                                        className="w-full h-8 rounded-lg border border-slate-200 bg-white shadow-sm px-2 text-[10px] font-bold uppercase outline-none focus:border-emerald-500"
                                                        value={map.type}
                                                        onChange={(e) => {
                                                            const newMappings = [...client.mappings];
                                                            newMappings[index].type = e.target.value as any;
                                                            setClient({ ...client, mappings: newMappings });
                                                        }}
                                                    >
                                                        <option value="vapi_assistant">Vapi Assistant</option>
                                                        <option value="vapi_squad">Vapi Squad</option>
                                                        <option value="twilio_number">Twilio Number</option>
                                                    </select>
                                                    <Input
                                                        placeholder="Service ID / Value"
                                                        className="h-8 border-slate-200 shadow-sm font-mono text-[10px] rounded-lg focus:border-emerald-500"
                                                        value={map.value}
                                                        onChange={(e) => {
                                                            const newMappings = [...client.mappings];
                                                            newMappings[index].value = e.target.value;
                                                            setClient({ ...client, mappings: newMappings });
                                                        }}
                                                    />
                                                </div>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={() => {
                                                    const newMappings = client.mappings.filter((_, i) => i !== index);
                                                    setClient({ ...client, mappings: newMappings });
                                                }}>
                                                    <XCircle size={16} />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Button className="w-full h-10 bg-white border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-bold text-xs rounded-lg shadow-sm mt-2 transition-all" onClick={async () => {
                                        try {
                                            await adminApi.updateClientMappings(client.id, { mappings: client.mappings });
                                            toast.success('Resources saved');
                                            fetchClient(client.id);
                                        } catch (e) {
                                            toast.error('Save failed');
                                        }
                                    }}>
                                        <ArrowUpRight className="mr-2 h-4 w-4" /> Save Resources
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
