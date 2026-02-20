'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Switch } from "@/components/ui/switch";
import {
    Plus,
    CreditCard,
    Copy,
    Loader2,
    CircleEllipsis,
    Pencil,
    Star,
    XCircle,
    Globe,
    Smartphone,
    Eye,
    EyeOff
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { StripeAccount, CreateStripeAccountRequest, UpdateStripeAccountRequest } from '@/lib/types/admin';
import { getUserRole } from '@/lib/auth/role';

export default function IntegrationsPage() {
    const router = useRouter();
    const role = getUserRole();
    const [accounts, setAccounts] = useState<StripeAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    // Create dialog
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newAccount, setNewAccount] = useState<CreateStripeAccountRequest>({
        name: '',
        stripe_secret_key: '',
        stripe_webhook_secret: '',
        is_default: false,
    });

    // Edit dialog
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<StripeAccount | null>(null);
    const [editData, setEditData] = useState<UpdateStripeAccountRequest>({});
    const [saving, setSaving] = useState(false);

    // Password visibility
    const [showSecretKey, setShowSecretKey] = useState(false);
    const [showWebhookSecret, setShowWebhookSecret] = useState(false);

    useEffect(() => {
        if (role !== 'superadmin') {
            router.push('/dashboard');
            return;
        }
        setIsMounted(true);
        fetchAccounts();
    }, [role, router]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const response = await adminApi.getStripeAccounts();
            if (response.success) {
                setAccounts(response.data?.accounts || []);
            } else {
                toast.error('Failed to load Stripe accounts', {
                    description: response.error?.message || 'Unknown error'
                });
            }
        } catch (error: any) {
            toast.error('Failed to load Stripe accounts', {
                description: error.message || 'Unknown error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newAccount.name || !newAccount.stripe_secret_key || !newAccount.stripe_webhook_secret) {
            toast.error('Missing Fields', { description: 'Name, Secret Key, and Webhook Secret are required.' });
            return;
        }

        setCreating(true);
        try {
            const response = await adminApi.createStripeAccount(newAccount);
            if (response.success) {
                setIsCreateOpen(false);
                setNewAccount({ name: '', stripe_secret_key: '', stripe_webhook_secret: '', is_default: false });
                setShowSecretKey(false);
                setShowWebhookSecret(false);
                fetchAccounts();
                toast.success('Stripe Account Created', { description: `${newAccount.name} has been added.` });
            } else {
                toast.error('Creation Failed', { description: response.error?.message || 'Failed to create Stripe account' });
            }
        } catch (error: any) {
            toast.error('Creation Failed', { description: error.message || 'Failed to create Stripe account' });
        } finally {
            setCreating(false);
        }
    };

    const openEditDialog = (account: StripeAccount) => {
        setEditingAccount(account);
        setEditData({ name: account.name });
        setIsEditOpen(true);
        setShowSecretKey(false);
        setShowWebhookSecret(false);
    };

    const handleUpdate = async () => {
        if (!editingAccount) return;

        setSaving(true);
        try {
            const response = await adminApi.updateStripeAccount(editingAccount.id, editData);
            if (response.success) {
                setIsEditOpen(false);
                setEditingAccount(null);
                setEditData({});
                fetchAccounts();
                toast.success('Stripe Account Updated');
            } else {
                toast.error('Update Failed', { description: response.error?.message || 'Failed to update Stripe account' });
            }
        } catch (error: any) {
            toast.error('Update Failed', { description: error.message || 'Failed to update Stripe account' });
        } finally {
            setSaving(false);
        }
    };

    const handleSetDefault = async (account: StripeAccount) => {
        try {
            const response = await adminApi.updateStripeAccount(account.id, { is_default: true });
            if (response.success) {
                fetchAccounts();
                toast.success('Default Updated', { description: `${account.name} is now the default account.` });
            } else {
                toast.error('Failed to set default', { description: response.error?.message });
            }
        } catch (error: any) {
            toast.error('Failed to set default', { description: error.message });
        }
    };

    const handleDeactivate = async (account: StripeAccount) => {
        if (account.is_default) {
            toast.error('Cannot deactivate', { description: 'Cannot deactivate the default Stripe account. Set another account as default first.' });
            return;
        }
        if (account.client_count > 0) {
            if (!confirm(`This account has ${account.client_count} client(s) assigned. Deactivating will require reassigning them. Continue?`)) return;
        }
        try {
            const response = await adminApi.deleteStripeAccount(account.id);
            if (response.success) {
                fetchAccounts();
                toast.success('Account Deactivated', { description: `${account.name} has been deactivated.` });
            } else {
                toast.error('Deactivation Failed', { description: response.error?.message });
            }
        } catch (error: any) {
            toast.error('Deactivation Failed', { description: error.message });
        }
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Stripe Accounts</h1>
                    <p className="text-slate-500 font-medium text-sm">Manage Stripe accounts and payment routing</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) {
                        setShowSecretKey(false);
                        setShowWebhookSecret(false);
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button className="h-10 px-6 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all active:scale-95">
                            <Plus className="mr-2 h-4 w-4" /> Add Stripe Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold tracking-tight">Add Stripe Account</DialogTitle>
                            <DialogDescription className="font-medium text-sm text-slate-500">
                                Register a new Stripe account for payment routing
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 ml-1">Account Name</Label>
                                <Input
                                    placeholder="e.g. Primary, Account B"
                                    className="h-10 border-slate-200 rounded-lg focus:border-emerald-500"
                                    value={newAccount.name}
                                    onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 ml-1">Stripe Secret Key</Label>
                                <div className="relative">
                                    <Input
                                        type={showSecretKey ? 'text' : 'password'}
                                        placeholder="sk_live_..."
                                        className="h-10 border-slate-200 rounded-lg focus:border-emerald-500 pr-10 font-mono text-sm"
                                        value={newAccount.stripe_secret_key}
                                        onChange={(e) => setNewAccount({ ...newAccount, stripe_secret_key: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowSecretKey(!showSecretKey)}
                                    >
                                        {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-500 ml-1">Webhook Secret</Label>
                                <div className="relative">
                                    <Input
                                        type={showWebhookSecret ? 'text' : 'password'}
                                        placeholder="whsec_..."
                                        className="h-10 border-slate-200 rounded-lg focus:border-emerald-500 pr-10 font-mono text-sm"
                                        value={newAccount.stripe_webhook_secret}
                                        onChange={(e) => setNewAccount({ ...newAccount, stripe_webhook_secret: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                                    >
                                        {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                                <div className="flex flex-col">
                                    <Label className="text-xs font-bold text-slate-700">Set as Default</Label>
                                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-tight">Fallback account for new clients</span>
                                </div>
                                <Switch
                                    checked={newAccount.is_default}
                                    onCheckedChange={(c) => setNewAccount({ ...newAccount, is_default: c })}
                                    className="data-[state=checked]:bg-emerald-600"
                                />
                            </div>
                        </div>
                        <DialogFooter className="border-t border-slate-100 pt-6">
                            <Button
                                className="w-full h-10 bg-slate-900 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-slate-800 transition-all"
                                onClick={handleCreate}
                                disabled={creating}
                            >
                                {creating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                Create Account
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-slate-50 border-slate-200 text-xs font-bold text-slate-600 px-3 py-1.5 shadow-sm">
                    {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-xs font-bold text-emerald-600 px-3 py-1.5 shadow-sm">
                    {accounts.filter(a => a.is_active).length} active
                </Badge>
            </div>

            {/* Stripe Accounts Table */}
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-xs text-slate-500 py-4 pl-6">Account</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Key</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Webhook URL</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500 text-center">Clients</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Status</TableHead>
                            <TableHead className="text-right font-bold text-xs text-slate-500 pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3 text-slate-300">
                                        <CircleEllipsis size={40} />
                                        <p className="font-bold text-sm">No Stripe accounts configured</p>
                                        <p className="text-xs text-slate-400">Add your first Stripe account to start routing payments</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            accounts.map((account) => (
                                <TableRow key={account.id} className="group hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-0">
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                                                <CreditCard size={18} />
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">{account.name}</span>
                                                    {account.is_default && (
                                                        <Badge className="bg-amber-50 text-amber-700 border-amber-100 px-1.5 py-0 font-bold text-[9px] uppercase shadow-none hover:bg-amber-50">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                                                    {new Date(account.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100/50 px-2 py-0.5 rounded border border-slate-200">
                                            ...{account.stripe_secret_key_last4}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 max-w-[280px]">
                                            <span className="text-[10px] font-mono font-semibold text-emerald-600 truncate">
                                                {account.webhook_url}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 shrink-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                onClick={() => copyToClipboard(account.webhook_url, 'Webhook URL')}
                                            >
                                                <Copy size={12} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {account.client_count > 0 ? (
                                            <span
                                                className="text-sm font-bold tabular-nums text-slate-900 cursor-default underline decoration-dotted decoration-slate-300 underline-offset-2"
                                                title={account.client_names?.join(', ')}
                                            >
                                                {account.client_count}
                                            </span>
                                        ) : (
                                            <span className="text-sm font-bold tabular-nums text-slate-400">
                                                0
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {account.is_active ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none hover:bg-emerald-50">
                                                Active
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200 px-2 py-0.5 font-bold text-[10px] uppercase shadow-none hover:bg-slate-100">
                                                Inactive
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all border border-slate-200 shadow-sm"
                                                onClick={() => openEditDialog(account)}
                                                title="Edit"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                            {!account.is_default && account.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all border border-slate-200 shadow-sm"
                                                    onClick={() => handleSetDefault(account)}
                                                    title="Set as Default"
                                                >
                                                    <Star className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            {!account.is_default && account.is_active && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-all border border-slate-200 shadow-sm"
                                                    onClick={() => handleDeactivate(account)}
                                                    title="Deactivate"
                                                >
                                                    <XCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Edit Dialog */}
            {isMounted && (
                <Dialog open={isEditOpen} onOpenChange={(open) => {
                    setIsEditOpen(open);
                    if (!open) {
                        setShowSecretKey(false);
                        setShowWebhookSecret(false);
                    }
                }}>
                    <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold tracking-tight">Edit Stripe Account</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                                Update account settings. Leave key fields blank to keep current values.
                            </DialogDescription>
                        </DialogHeader>
                        {editingAccount && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Account Name</Label>
                                    <Input
                                        className="h-10 border-slate-200 rounded-lg focus:border-emerald-500"
                                        value={editData.name || ''}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">
                                        Stripe Secret Key
                                        <span className="text-slate-400 font-normal ml-1">(leave blank to keep current)</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showSecretKey ? 'text' : 'password'}
                                            placeholder={`Current: ...${editingAccount.stripe_secret_key_last4}`}
                                            className="h-10 border-slate-200 rounded-lg focus:border-emerald-500 pr-10 font-mono text-sm"
                                            value={editData.stripe_secret_key || ''}
                                            onChange={(e) => setEditData({ ...editData, stripe_secret_key: e.target.value || undefined })}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            onClick={() => setShowSecretKey(!showSecretKey)}
                                        >
                                            {showSecretKey ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">
                                        Webhook Secret
                                        <span className="text-slate-400 font-normal ml-1">(leave blank to keep current)</span>
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            type={showWebhookSecret ? 'text' : 'password'}
                                            placeholder="whsec_..."
                                            className="h-10 border-slate-200 rounded-lg focus:border-emerald-500 pr-10 font-mono text-sm"
                                            value={editData.stripe_webhook_secret || ''}
                                            onChange={(e) => setEditData({ ...editData, stripe_webhook_secret: e.target.value || undefined })}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                                        >
                                            {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <Label htmlFor="is_active_edit" className="text-sm font-bold text-slate-700">Account Active</Label>
                                    <Switch
                                        id="is_active_edit"
                                        checked={editData.is_active !== undefined ? editData.is_active : editingAccount.is_active}
                                        onCheckedChange={(c) => setEditData({ ...editData, is_active: c })}
                                        className="data-[state=checked]:bg-emerald-600"
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter className="pt-4 border-t border-slate-100">
                            <Button
                                onClick={handleUpdate}
                                disabled={saving}
                                className="w-full h-10 bg-emerald-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-emerald-700 transition-all"
                            >
                                {saving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Configuration Guide */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Globe className="h-4 w-4 text-emerald-600" />
                            Configuration Guide
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-5">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-xs">1</div>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    Add your Stripe account credentials above. Each account gets a unique webhook URL.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-xs">2</div>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    Copy the webhook URL for each account and configure it in your Stripe Dashboard under Developers &gt; Webhooks.
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-xs">3</div>
                                <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                    Assign clients to Stripe accounts from the <span className="text-emerald-600 font-bold">Client Detail</span> page. Unassigned clients use the default account.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <Label className="text-xs font-bold text-slate-700 block mb-3">Required Webhook Events</Label>
                            <div className="grid grid-cols-1 gap-1.5">
                                {[
                                    'checkout.session.completed',
                                    'payment_intent.succeeded',
                                    'payment_intent.payment_failed',
                                    'invoice.paid',
                                    'invoice.payment_failed'
                                ].map((token, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-2 bg-slate-50/50 rounded-lg border border-slate-100">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-mono font-bold text-slate-600">{token}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <Smartphone className="h-4 w-4 text-emerald-600" />
                            How Routing Works
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        <div className="space-y-3">
                            <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Client Assigned</p>
                                <p className="text-xs font-medium text-slate-600 leading-snug">
                                    When a client has a Stripe account assigned, all their payments (top-ups, auto-recharge) route through that account.
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">No Assignment</p>
                                <p className="text-xs font-medium text-slate-600 leading-snug">
                                    Clients without an explicit assignment fall back to the default Stripe account automatically.
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Webhook Verification</p>
                                <p className="text-xs font-medium text-slate-600 leading-snug">
                                    Each account has its own webhook endpoint, ensuring signatures are verified with the correct secret.
                                </p>
                            </div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                            <CreditCard size={16} className="text-emerald-600 mt-0.5" />
                            <div className="space-y-0.5">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Multiple Accounts</p>
                                <p className="text-xs font-medium text-emerald-600/80 leading-snug">
                                    You can route different clients to different Stripe accounts. Multiple clients can share a single account.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
