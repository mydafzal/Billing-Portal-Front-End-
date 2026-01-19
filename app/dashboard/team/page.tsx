'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
    Card,
    CardContent
} from "@/components/ui/card";
import { UserPlus, Mail, Loader2, Users, Search } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { User } from '@/lib/types/api';
import { getClientId, getUserRole } from '@/lib/auth/role';
import { me } from '@/lib/api/auth';
import { format } from 'date-fns';

export default function TeamPage() {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [clientId, setClientId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState({
        email: '',
        role: 'viewer' as 'admin' | 'viewer'
    });

    // Fetch user info to get client_id and role
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                // Try to get from JWT token first (faster)
                const tokenClientId = getClientId();
                const tokenRole = getUserRole();
                
                if (tokenClientId && tokenRole) {
                    console.log('[TEAM] Got client_id from token:', tokenClientId);
                    setClientId(tokenClientId);
                    setUserRole(tokenRole);
                    
                    if (tokenRole === 'viewer') {
                        toast.error('Access Restricted', { description: 'You do not have permission to manage team members.' });
                        router.replace('/dashboard');
                        return;
                    }
                } else {
                    // Fallback to API call
                    console.log('[TEAM] Token missing client_id, fetching from API...');
                    const user = await me();
                    console.log('[TEAM] User from API:', user);
                    
                    // Check if user is superadmin (client_id is null)
                    if (!user.client_id && user.role === 'superadmin') {
                        toast.info('Superadmin Access', { 
                            description: 'As a superadmin, please use the Admin panel to manage users across all clients.' 
                        });
                        router.replace('/admin/users');
                        return;
                    }
                    
                    // Check if user doesn't have a client_id assigned
                    if (!user.client_id) {
                        toast.error('No Organization Assigned', { 
                            description: 'Your account is not associated with any organization. Please contact support.' 
                        });
                        setLoading(false);
                        return;
                    }
                    
                    setClientId(user.client_id);
                    setUserRole(user.role || null);
                    
                    if (user.role === 'viewer') {
                        toast.error('Access Restricted', { description: 'You do not have permission to manage team members.' });
                        router.replace('/dashboard');
                        return;
                    }
                }
            } catch (error) {
                console.error('[TEAM] Failed to fetch user info:', error);
                toast.error('Failed to load user information', { description: 'Please refresh the page.' });
                setLoading(false);
            }
        };
        fetchUserInfo();
    }, [router]);

    const fetchUsers = useCallback(async () => {
        if (!clientId) {
            console.log('[TEAM] No client_id available, skipping fetch');
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            console.log('[TEAM] Fetching users for client:', clientId);
            const response = await adminApi.getUsers(clientId);
            console.log('[TEAM] Users response:', response);
            
            if (response.success) {
                const usersList = response.data?.users || [];
                console.log('[TEAM] Users fetched:', usersList.length, usersList);
                setUsers(usersList);
            } else {
                console.error('[TEAM] Failed to fetch users:', response.error);
                toast.error('Failed to load team members', { 
                    description: response.error?.message || 'Unknown error' 
                });
            }
        } catch (error: any) {
            console.error('[TEAM] Exception fetching users:', error);
            console.error('[TEAM] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast.error('Failed to load team members', { 
                description: error.response?.data?.error?.message || error.message || 'Unknown error' 
            });
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    useEffect(() => {
        if (clientId && userRole !== 'viewer') {
            fetchUsers();
        }
    }, [clientId, userRole, fetchUsers]);

    const handleInvite = async () => {
        // Try to get client_id from multiple sources
        let currentClientId = clientId;
        
        if (!currentClientId) {
            // Try from token
            currentClientId = getClientId();
        }
        
        if (!currentClientId) {
            // Try from API
            try {
                const user = await me();
                currentClientId = user.client_id || null;
                if (currentClientId) {
                    setClientId(currentClientId);
                }
            } catch (error) {
                console.error('[TEAM] Failed to get client_id from API:', error);
            }
        }
        
        if (!currentClientId) {
            toast.error('Client ID Missing', { 
                description: 'Unable to determine your organization. Please refresh the page or contact support.' 
            });
            return;
        }
        
        if (!inviteData.email || !inviteData.email.includes('@')) {
            toast.error('Invalid Email', { description: 'Please enter a valid email address.' });
            return;
        }
        
        setInviting(true);
        try {
            console.log('[TEAM] Inviting user with data:', { 
                email: inviteData.email, 
                role: inviteData.role, 
                client_id: currentClientId 
            });
            
            const response = await adminApi.inviteUser({
                email: inviteData.email,
                role: inviteData.role,
                client_id: currentClientId
            });
            
            console.log('[TEAM] Invite response:', response);
            
            if (response.success) {
                toast.success('Invitation sent', {
                    description: `An invite has been sent to ${inviteData.email}`
                });
                setIsInviteOpen(false);
                setInviteData({ email: '', role: 'viewer' });
                fetchUsers();
            } else {
                toast.error('Invitation failed', {
                    description: response.error?.message || 'Failed to send invitation'
                });
            }
        } catch (error: any) {
            console.error('[TEAM] Invite error:', error);
            console.error('[TEAM] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast.error('Invitation failed', {
                description: error?.response?.data?.error?.message || error?.message || 'Failed to send invitation'
            });
        } finally {
            setInviting(false);
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            await adminApi.updateUser(userId, { is_active: !currentStatus });
            toast.success(`User ${!currentStatus ? 'enabled' : 'disabled'}`);
            fetchUsers();
        } catch {
            toast.error('Update failed');
        }
    };

    if (userRole === 'viewer') return null;
    
    // Show message if no client_id (user not assigned to organization)
    if (!clientId && !loading) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                    <div className="text-center space-y-4">
                        <h2 className="text-xl font-bold text-slate-900">No Organization Assigned</h2>
                        <p className="text-slate-500">Your account is not associated with any organization.</p>
                        <p className="text-sm text-slate-400">Please contact your administrator or support to assign you to an organization.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team</h1>
                    <p className="text-slate-500 text-sm font-medium mt-1">Manage your organization's team members and permissions</p>
                </div>

                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm">
                            <UserPlus className="mr-2 h-4 w-4" /> Invite Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-xl border border-slate-200 shadow-2xl p-0 overflow-hidden">
                        <div className="p-6">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold text-slate-900 tracking-tight">Invite Member</DialogTitle>
                                <DialogDescription className="text-sm font-medium text-slate-500">
                                    Send an invitation to join your team.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-xs font-bold text-slate-500 ml-1">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="name@company.com"
                                            className="pl-10 rounded-lg border-slate-200 focus:border-emerald-500 transition-all font-medium"
                                            value={inviteData.email}
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="role" className="text-xs font-bold text-slate-500 ml-1">Role</Label>
                                    <select
                                        id="role"
                                        className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none transition-all appearance-none cursor-pointer"
                                        value={inviteData.role}
                                        onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <div className="p-3 bg-emerald-50/50 rounded-lg mt-2 border border-emerald-100">
                                        <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide leading-relaxed">
                                            {inviteData.role === 'admin'
                                                ? 'Full access to billing, wallet, and user management.'
                                                : 'View-only access to usage and invoices.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm"
                                    onClick={handleInvite}
                                    disabled={inviting || !inviteData.email}
                                >
                                    {inviting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Inviting...</> : 'Send Invitation'}
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Table Card */}
            <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden rounded-xl">
                <div className="bg-slate-50/50 border-b border-slate-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                            <Users size={18} />
                        </div>
                        <p className="font-bold text-slate-900 text-lg tracking-tight">Team Members</p>
                    </div>
                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                        <Input className="h-10 pl-10 rounded-lg border-slate-200 bg-white text-sm" placeholder="Search members..." />
                    </div>
                </div>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/30">
                            <TableRow className="hover:bg-transparent border-slate-100">
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider pl-8">Member</TableHead>
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-center">Role</TableHead>
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider text-center">Status</TableHead>
                                <TableHead className="py-3 font-bold text-[10px] uppercase text-slate-400 tracking-wider">Joined</TableHead>
                                <TableHead className="text-right font-bold text-[10px] uppercase text-slate-400 tracking-wider pr-8">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-600 mb-4" />
                                        <p className="text-sm font-medium text-slate-400">Loading team...</p>
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-64 text-center border-none">
                                        <div className="p-4 bg-slate-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                            <Users size={32} className="text-slate-300" />
                                        </div>
                                        <p className="font-bold text-slate-500 text-sm">No team members found.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors border-slate-50">
                                        <TableCell className="py-4 pl-8">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {user.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || (user.email ? user.email[0].toUpperCase() : 'P')}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{user.full_name || 'Pending Invitation'}</div>
                                                    <div className="text-xs font-semibold text-slate-400">{user.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {user.role === 'admin' ? (
                                                    <Badge variant="outline" className="px-3 py-0.5 bg-amber-50 text-amber-700 border-amber-100 font-bold text-[10px] uppercase tracking-wider">Admin</Badge>
                                                ) : user.role === 'superadmin' ? (
                                                    <Badge variant="outline" className="px-3 py-0.5 bg-purple-50 text-purple-700 border-purple-100 font-bold text-[10px] uppercase tracking-wider">Superadmin</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="px-3 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-100 font-bold text-[10px] uppercase tracking-wider">Viewer</Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {user.is_active ? (
                                                <Badge className="bg-emerald-600 text-white font-bold uppercase text-[10px] px-2.5 py-0.5 border-0">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-slate-100 text-slate-400 font-bold uppercase text-[10px] px-2.5 py-0.5 border-0">Inactive</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={user.role === 'superadmin'}
                                                onClick={() => toggleUserStatus(user.id, user.is_active)}
                                                className={user.is_active ? "text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-xs" : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 font-bold text-xs"}
                                            >
                                                {user.is_active ? 'Disable' : 'Enable'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
