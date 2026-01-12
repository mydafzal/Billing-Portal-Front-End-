'use client';

import { useEffect, useState } from 'react';
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
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from '@/components/ui/badge';
import { Mail, Pencil, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { adminApi } from '@/lib/api/admin';
import { InviteUserRequest, Client } from '@/lib/types/admin';
import { User } from '@/lib/types/api';
import { getUserRole } from '@/lib/auth/role';
import { me } from '@/lib/api/auth';

export default function UsersPage() {
    const role = getUserRole();
    const isViewer = role === 'viewer';
    const isSuperadmin = role === 'superadmin';
    const [users, setUsers] = useState<User[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    // Invite State
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteData, setInviteData] = useState<InviteUserRequest>({
        email: '',
        role: 'viewer',
        client_id: ''
    });

    // Filter State
    const [selectedClient, setSelectedClient] = useState<string>('');

    // Edit State
    const [editOpen, setEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<{ id: string, role: string, is_active: boolean, client_id?: string } | null>(null);

    const fetchClients = async () => {
        try {
            const response = await adminApi.getClients(false);
            if (response.success) {
                setClients(response.data?.clients || []);
            }
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            // For admins (not superadmins), filter by their own client_id
            let clientIdToUse = selectedClient || undefined;
            if (!isSuperadmin && currentUser?.client_id) {
                // Admin users should only see users from their own client
                clientIdToUse = currentUser.client_id;
            }
            
            console.log('[USERS] Fetching users...', { selectedClient, clientIdToUse, isSuperadmin });
            const response = await adminApi.getUsers(clientIdToUse);
            console.log('[USERS] Response:', response);
            
            if (response.success) {
                const usersList = response.data?.users || [];
                console.log('[USERS] Users fetched:', usersList.length, usersList);
                setUsers(usersList);
                
                if (usersList.length === 0) {
                    console.warn('[USERS] No users found in response');
                }
            } else {
                console.error('[USERS] Failed to fetch users:', response.error);
                toast.error('Failed to load users', { 
                    description: response.error?.message || 'Unknown error' 
                });
            }
        } catch (error: any) {
            console.error('[USERS] Exception fetching users:', error);
            console.error('[USERS] Error details:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            toast.error('Failed to load users', { 
                description: error.response?.data?.error?.message || error.message || 'Unknown error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await me();
                setCurrentUser(userData);
                // For admins, set their client_id as the default filter
                if (!isSuperadmin && userData.client_id) {
                    setSelectedClient(userData.client_id);
                }
            } catch (error) {
                console.error('Failed to fetch current user:', error);
            }
        };
        setIsMounted(true);
        loadUser();
        if (isSuperadmin) {
            fetchClients();
        }
    }, [isSuperadmin]);

    useEffect(() => {
        if (currentUser || isSuperadmin) {
            fetchUsers();
        }
    }, [selectedClient, currentUser]);

    // Set client_id for admins when inviting
    useEffect(() => {
        if (!isSuperadmin && currentUser?.client_id && inviteData.client_id !== currentUser.client_id) {
            setInviteData(prev => ({ ...prev, client_id: currentUser.client_id }));
        }
    }, [currentUser, isSuperadmin]);

    const handleInvite = async () => {
        try {
            if (!inviteData.email || !inviteData.role) {
                toast.error('Missing Fields', { description: 'Email and role are required.' });
                return;
            }
            
            // For admins, ensure client_id is set to their own client
            const invitePayload = { ...inviteData };
            if (!isSuperadmin && currentUser?.client_id) {
                invitePayload.client_id = currentUser.client_id;
            }
            
            console.log('[USERS] Inviting user with data:', invitePayload);
            const response = await adminApi.inviteUser(invitePayload);
            
            if (response.success) {
                setInviteOpen(false);
                // Reset form
                setInviteData({
                    email: '',
                    role: 'viewer',
                    client_id: ''
                });
                fetchUsers();
                toast.success('Invitation Sent', { description: `Invitation sent to ${inviteData.email}` });
            } else {
                const errorMsg = response.error?.message || 'Failed to send invitation';
                console.error('[USERS] Invite failed:', errorMsg);
                toast.error('Invitation Failed', { 
                    description: errorMsg,
                    duration: 6000
                });
            }
        } catch (error: any) {
            console.error('[USERS] Invite user error:', error);
            console.error('[USERS] Error response:', error?.response?.data);
            
            // Extract detailed error message
            let errorMessage = 'Failed to send invitation';
            if (error?.response?.data) {
                if (error.response.data.error?.message) {
                    errorMessage = error.response.data.error.message;
                } else if (error.response.data.detail) {
                    if (typeof error.response.data.detail === 'string') {
                        errorMessage = error.response.data.detail;
                    } else if (Array.isArray(error.response.data.detail)) {
                        const validationErrors = error.response.data.detail.map((err: any) => {
                            const field = err.loc ? err.loc.slice(1).join('.') : 'unknown';
                            return `${field}: ${err.msg || err.message || 'Invalid value'}`;
                        }).join(', ');
                        errorMessage = `Validation errors: ${validationErrors}`;
                    }
                } else if (error.response.data.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error?.message) {
                errorMessage = error.message;
            }
            
            toast.error('Invitation Failed', { 
                description: errorMessage,
                duration: 6000
            });
        }
    }

    const handleUpdateUser = async () => {
        if (!editingUser) return;
        try {
            // Build update data including client_id if superadmin is editing
            const updateData: any = {
                role: editingUser.role,
                is_active: editingUser.is_active
            };
            
            // Include client_id in the update request if superadmin is editing
            // Always include it if it exists in editingUser (even if empty string means remove)
            if (isSuperadmin && 'client_id' in editingUser) {
                // If client_id is empty string, set to null to remove association
                updateData.client_id = editingUser.client_id === '' ? null : (editingUser.client_id || null);
                console.log('[USERS] Including client_id in update request:', updateData.client_id);
            }
            
            console.log('[USERS] Updating user with data:', JSON.stringify(updateData, null, 2));
            console.log('[USERS] editingUser full state:', JSON.stringify(editingUser, null, 2));
            console.log('[USERS] isSuperadmin:', isSuperadmin);
            
            // Update user with all fields including client_id
            const response = await adminApi.updateUser(editingUser.id, updateData);
            console.log('[USERS] Update response:', response);
            
            if (response.success) {
                console.log('[USERS] Update successful, response data:', response.data);
                
                // Check if client_id was actually updated
                const requestedClientId = updateData.client_id;
                const returnedClientId = response.data?.client_id;
                
                if (requestedClientId !== undefined) {
                    console.log('[USERS] Client ID check:', { 
                        requested: requestedClientId, 
                        returned: returnedClientId,
                        match: requestedClientId === returnedClientId || (requestedClientId === null && returnedClientId === null)
                    });
                    
                    // Check if the client_id was actually updated
                    if (requestedClientId !== returnedClientId && !(requestedClientId === null && returnedClientId === null)) {
                        console.warn('[USERS] Client ID was not updated:', { 
                            requested: requestedClientId, 
                            returned: returnedClientId,
                            note: 'The API may not support updating client_id via PUT /admin/users/{userId}'
                        });
                        
                        // Try separate endpoint as fallback
                        console.log('[USERS] Attempting to assign client_id via separate endpoint as fallback...');
                        const assignResponse = await adminApi.assignUserToClient(editingUser.id, requestedClientId);
                        console.log('[USERS] Assign client response:', assignResponse);
                        
                        if (assignResponse.success) {
                            toast.success('User Updated', { 
                                description: 'User information including client association updated successfully' 
                            });
                        } else if (assignResponse.error?.code === 'ENDPOINT_NOT_FOUND') {
                            // Show a more helpful message with action options
                            toast.warning('User Updated (Client Association Cannot Be Changed)', { 
                                description: 'User role and status updated successfully. However, the API does not support changing client association for existing users. To associate this user with a client, please use the "Re-invite" option from the user menu or contact support.',
                                duration: 8000
                            });
                        } else {
                            toast.warning('User Updated (Client Assignment Failed)', { 
                                description: `User role and status updated, but client assignment failed: ${assignResponse.error?.message || 'Unknown error'}` 
                            });
                        }
                    } else {
                        toast.success('User Updated', { 
                            description: 'User information including client association updated successfully' 
                        });
                    }
                } else {
                    toast.success('User Updated', { 
                        description: 'User information updated successfully' 
                    });
                }
                
                setEditOpen(false);
                setEditingUser(null);
                fetchUsers();
            } else {
                toast.error('Update Failed', { description: response.error?.message || 'Failed to update user' });
            }
        } catch (error: any) {
            console.error('[USERS] Update user error:', error);
            toast.error('Update Failed', { description: error?.response?.data?.error?.message || error?.response?.data?.detail || error.message });
        }
    }

    const openEditDialog = (user: User) => {
        setEditingUser({
            id: user.id,
            role: user.role,
            is_active: user.is_active,
            client_id: user.client_id || ''
        });
        setEditOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Users</h1>
                    <p className="text-slate-500 font-medium text-sm">Manage user permissions and system access</p>
                </div>

                <div className="flex items-center gap-3">
                    {isSuperadmin && (
                        <select
                            className="h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-600 focus:outline-none focus:border-emerald-500 shadow-sm"
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                        >
                            <option value="">All Clients</option>
                            {clients.map(client => (
                                <option key={client.id} value={client.id}>{client.name}</option>
                            ))}
                        </select>
                    )}
                    {!isSuperadmin && currentUser && (
                        <Badge variant="outline" className="h-10 px-4 flex items-center border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                            {currentUser.client_name || 'Your Organization'}
                        </Badge>
                    )}

                    {isMounted && !isViewer && (
                        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                            <DialogTrigger asChild>
                                <Button className="h-10 px-6 font-bold shadow-sm bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all active:scale-95">
                                    <Mail className="mr-2 h-4 w-4" /> Invite User
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold tracking-tight">Invite New User</DialogTitle>
                                    <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                                        Send an invitation to join the platform
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 ml-1">Email Address</Label>
                                        <Input type="email" placeholder="user@company.com" value={inviteData.email}
                                            className="h-10 border-slate-200 rounded-lg font-semibold text-sm focus:border-emerald-500"
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-bold text-slate-500 ml-1">Role</Label>
                                            <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                                                value={inviteData.role}
                                                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
                                            >
                                                <option value="viewer">Viewer</option>
                                                <option value="admin">Admin</option>
                                                <option value="superadmin">Superadmin</option>
                                            </select>
                                        </div>
                                        {isSuperadmin && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 ml-1">Client</Label>
                                                <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                                                    value={inviteData.client_id || ''}
                                                    onChange={(e) => setInviteData({ ...inviteData, client_id: e.target.value })}
                                                >
                                                    <option value="">Global</option>
                                                    {clients.map(client => (
                                                        <option key={client.id} value={client.id}>{client.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                        {!isSuperadmin && currentUser && (
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold text-slate-500 ml-1">Client</Label>
                                                <input
                                                    type="text"
                                                    className="flex h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold"
                                                    value={currentUser.client_name || 'Your Organization'}
                                                    disabled
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <DialogFooter className="pt-4 border-t border-slate-100">
                                    <Button onClick={handleInvite} className="w-full h-10 bg-slate-900 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-slate-800 transition-all">
                                        Send Invitation
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Edit User Dialog */}
            {isMounted && (
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-md bg-white border border-slate-200 shadow-2xl rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold tracking-tight">Edit User</DialogTitle>
                            <DialogDescription className="text-sm font-medium text-slate-500 mt-1">
                                Update user permissions and status
                            </DialogDescription>
                        </DialogHeader>
                        {editingUser && (
                            <div className="space-y-4 py-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-slate-500 ml-1">Role</Label>
                                    <select className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                                        value={editingUser.role}
                                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="admin">Admin</option>
                                        <option value="superadmin">Superadmin</option>
                                    </select>
                                </div>
                                
                                {/* Client Association - Only for superadmins */}
                                {isSuperadmin && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-bold text-slate-500 ml-1">Organization (Client)</Label>
                                        <select 
                                            className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-500"
                                            value={editingUser.client_id || ''}
                                            onChange={(e) => setEditingUser({ ...editingUser, client_id: e.target.value })}
                                        >
                                            <option value="">No Organization (Global)</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2">
                                            <p className="text-[10px] font-semibold text-amber-800 leading-relaxed">
                                                <span className="font-bold">Note:</span> Client association cannot be changed via API. To associate this user with a different organization, you'll need to re-invite them using the "Invite User" button with the correct client selected.
                                            </p>
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                                    <Label htmlFor="is_active" className="text-sm font-bold text-slate-700">Account Active</Label>
                                    <input type="checkbox" id="is_active" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                        checked={editingUser.is_active}
                                        onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                                    />
                                </div>
                            </div>
                        )}
                        <DialogFooter className="pt-4 border-t border-slate-100">
                            <div className="flex flex-col gap-2 w-full">
                                <Button onClick={handleUpdateUser} className="w-full h-10 bg-emerald-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-emerald-700 transition-all">
                                    Save Changes
                                </Button>
                                {isSuperadmin && editingUser && editingUser.client_id && editingUser.client_id !== '' && (
                                    <p className="text-[10px] font-medium text-amber-600 text-center px-2">
                                        ⚠️ Client association cannot be changed via API. To associate this user with a client, use "Invite User" with the correct client selected.
                                    </p>
                                )}
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-bold text-xs text-slate-500 py-4 pl-6">User</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Role</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Client</TableHead>
                            <TableHead className="font-bold text-xs text-slate-500">Status</TableHead>
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
                        ) : !users || users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center">
                                    <p className="text-sm font-bold text-slate-300 uppercase tracking-widest">No users found</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id} className="group hover:bg-slate-50/30 transition-all border-b border-slate-50 last:border-0">
                                    <TableCell className="py-4 pl-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-slate-900">{user.full_name || 'Anonymous User'}</span>
                                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize text-[10px] font-bold tracking-wide bg-white border-slate-200 px-2 py-0.5 rounded-md text-slate-600">{user.role}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-xs font-bold text-slate-500">{user.client_name || 'Global'}</span>
                                    </TableCell>
                                    <TableCell>
                                        {user.is_active ? (
                                            <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-2">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-200" /> Inactive
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-4">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Last Login</span>
                                                <span className="text-[10px] font-bold text-slate-600">{user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</span>
                                            </div>
                                            {!isViewer && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-all border border-slate-200 shadow-sm" onClick={() => openEditDialog(user)}>
                                                    <Pencil className="h-3.5 w-3.5" />
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
        </div>
    );
}
