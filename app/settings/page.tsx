'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CreditCard, ExternalLink, User, Settings, Save, ShieldCheck, Lock, Loader2, AlertCircle } from 'lucide-react';
import { changePassword, me } from '@/lib/api/auth';
import { billingApi } from '@/lib/api/billing';
import { User as UserType } from '@/lib/types/api';
import { ClientSettingsResponse } from '@/lib/types/billing';
import { getUserRole } from '@/lib/auth/role';
import clsx from 'clsx';

export default function SettingsPage() {
  const [user, setUser] = useState<UserType | null>(null);
  const [settings, setSettings] = useState<ClientSettingsResponse | null>(null);
  const [autoRechargeAmount, setAutoRechargeAmount] = useState<string>('');
  const [threshold, setThreshold] = useState<string>('');
  const [autoRechargeEnabled, setAutoRechargeEnabled] = useState<boolean>(false);
  const [hasAutoRechargePermission, setHasAutoRechargePermission] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [savingAutoRecharge, setSavingAutoRecharge] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [savingToggle, setSavingToggle] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const role = getUserRole();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await me();
        setUser(userData);
        
        // Check if user is superadmin or doesn't have a client_id
        const userRole = userData.role as string;
        if (userRole === 'superadmin' || !userData.client_id) {
          // Superadmins don't have billing settings
          setLoading(false);
          return;
        }
      } catch (error: any) {
        console.error('Failed to fetch user:', error);
        setError('Failed to load user profile');
        setLoading(false);
        return;
      }

      try {
        const settingsData = await billingApi.getClientSettings();
        if (settingsData.success) {
          setSettings(settingsData.data);
          setAutoRechargeAmount(settingsData.data.auto_recharge_amount.toString());
          setThreshold(settingsData.data.low_balance_threshold.toString());
          // allow_auto_recharge is the permission flag AND the current state
          // Store it for both permission and state
          const autoRechargeState = settingsData.data.allow_auto_recharge || false;
          setHasAutoRechargePermission(autoRechargeState);
          setAutoRechargeEnabled(autoRechargeState);
        } else {
          // Don't show error for expected failures (superadmin, no client, etc.)
          if (settingsData.error?.message && !settingsData.error.message.includes('client') && !settingsData.error.message.includes('Client ID')) {
            console.warn('Failed to fetch billing settings:', settingsData.error.message);
          }
        }
      } catch (error: any) {
        // Only log if it's not a client-related error
        if (!error.message?.includes('client') && !error.message?.includes('Client ID')) {
          console.warn('Failed to fetch billing settings:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleManageBilling = async () => {
    if (role === 'viewer') return;
    try {
      const response = await billingApi.getStripePortal();
      if (response.success && response.data?.url) {
        window.location.href = response.data.url;
      } else {
        // Handle error response from API
        const errorMessage = response.error?.message || 'Failed to get portal URL';
        console.log('[SETTINGS] Portal error message:', errorMessage);
        
        // Check for common error cases - case insensitive
        const lowerMessage = errorMessage.toLowerCase();
        if (lowerMessage.includes('client') || lowerMessage.includes('no client') || lowerMessage.includes('client associated')) {
          toast.error('Organization Required', {
            description: 'You must be assigned to an organization to access billing portal. Please contact your administrator.'
          });
        } else if (lowerMessage.includes('stripe') || lowerMessage.includes('customer') || lowerMessage.includes('no user associated')) {
          toast.error('Billing Account Not Set Up', {
            description: 'Please add funds via Dashboard first to activate your Stripe billing account.'
          });
        } else {
          toast.error('Failed to Access Billing Portal', {
            description: errorMessage
          });
        }
      }
    } catch (error: any) {
      console.error('Portal error:', error);
      const errorMsg = error?.response?.data?.error?.message || error?.response?.data?.detail || error.message;
      
      if (error?.response?.status === 400) {
        const lowerErrorMsg = (errorMsg || '').toLowerCase();
        if (lowerErrorMsg.includes('client') || lowerErrorMsg.includes('no client') || lowerErrorMsg.includes('client associated')) {
          toast.error('Organization Required', {
            description: 'You must be assigned to an organization to access billing portal. Please contact your administrator.'
          });
        } else if (lowerErrorMsg.includes('stripe') || lowerErrorMsg.includes('customer') || lowerErrorMsg.includes('no user associated')) {
          toast.error('Billing Account Not Set Up', {
            description: 'Please add funds via Dashboard first to activate your Stripe billing account.'
          });
        } else {
          toast.error('Failed to Access Billing Portal', {
            description: errorMsg || 'Unable to access billing portal. Please try again later.'
          });
        }
      } else {
        toast.error('Portal redirect failed', {
          description: errorMsg || 'An unexpected error occurred'
        });
      }
    }
  };

  const handleSaveAutoRecharge = async () => {
    if (role === 'viewer' || !settings?.allow_admin_auto_recharge_edit) return;
    setSavingAutoRecharge(true);
    try {
      const val = parseFloat(autoRechargeAmount);
      if (isNaN(val) || val < 10) {
        toast.error('Invalid amount', { description: 'Minimum auto-recharge amount is $10' });
        setSavingAutoRecharge(false);
        return;
      }
      const response = await billingApi.updateAutoRecharge(val);
      if (response.success && response.data) {
        setSettings(response.data);
        setAutoRechargeAmount(response.data.auto_recharge_amount.toString());
        toast.success('Settings saved', { description: 'Auto-recharge amount updated' });
      } else {
        const errorMsg = response.error?.message || 'Failed to update auto-recharge amount';
        toast.error('Save failed', { description: errorMsg });
      }
    } catch (error: any) {
      toast.error('Save failed', { description: error?.response?.data?.error?.message || 'Failed to save settings' });
    } finally {
      setSavingAutoRecharge(false);
    }
  };

  const handleSaveThreshold = async () => {
    if (role === 'viewer' || !settings?.allow_admin_threshold_edit) return;
    setSavingThreshold(true);
    try {
      const val = parseFloat(threshold);
      if (isNaN(val) || val < 0) {
        toast.error('Invalid threshold', { description: 'Threshold must be a positive number' });
        setSavingThreshold(false);
        return;
      }
      const response = await billingApi.updateThreshold(val);
      if (response.success && response.data) {
        setSettings(response.data);
        setThreshold(response.data.low_balance_threshold.toString());
        toast.success('Settings saved', { description: 'Threshold updated' });
      } else {
        const errorMsg = response.error?.message || 'Failed to update threshold';
        toast.error('Save failed', { description: errorMsg });
      }
    } catch (error: any) {
      toast.error('Save failed', { description: error?.response?.data?.error?.message || 'Failed to save settings' });
    } finally {
      setSavingThreshold(false);
    }
  };

  const handleToggleAutoRecharge = async (enabled: boolean) => {
    if (role === 'viewer') return;
    setSavingToggle(true);
    const previousState = autoRechargeEnabled;
    // Optimistically update UI - this is the source of truth
    setAutoRechargeEnabled(enabled);
    try {
      const response = await billingApi.updateAutoRechargeEnabled(enabled);
      if (response.success && response.data) {
        // Update settings but KEEP our enabled state - don't let server override it
        setSettings(response.data);
        setAutoRechargeEnabled(enabled); // Force our value
        setHasAutoRechargePermission(enabled);
        toast.success('Settings saved', { description: 'Auto-recharge setting updated' });
      } else {
        const errorMsg = response.error?.message || 'Failed to update auto-recharge setting';
        toast.error('Save failed', { description: errorMsg });
        setAutoRechargeEnabled(previousState);
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error?.message || error?.message || 'Failed to save settings';
      toast.error('Save failed', { description: errorMsg });
      setAutoRechargeEnabled(previousState);
    } finally {
      setSavingToggle(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
        <p className="font-bold text-slate-400 uppercase tracking-widest text-xs">Loading Settings...</p>
      </div>
    );
  }

  const isViewer = role === 'viewer';
  const hasClientId = !!user?.client_id;

  return (
    <div className="space-y-6 max-w-5xl animate-in fade-in duration-700">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
          Settings
        </h1>
        <p className="text-slate-500 font-medium text-sm">
          Manage your account, billing, and security settings
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm" role="alert">
          <ShieldCheck className="text-red-500 h-5 w-5" />
          <span className="font-bold text-sm">{error}</span>
        </div>
      )}

      {/* Message for users without client_id */}
      {!isViewer && !hasClientId && user && (
        <Card className="rounded-xl shadow-sm border border-amber-200 overflow-hidden bg-amber-50/50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertCircle className="text-amber-600 h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-amber-900 mb-1">Billing Not Available</h3>
                <p className="text-xs font-medium text-amber-700">
                  Your account is not associated with any organization. Please contact your administrator to be assigned to a client organization to access billing features.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Billing Settings - Hidden for Viewers and users without client_id */}
      {!isViewer && hasClientId && (
        <Card className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <CreditCard className="text-emerald-600 h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold tracking-tight">Billing</CardTitle>
                <CardDescription className="text-xs font-medium text-slate-500">Manage payment methods and auto-recharge settings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">Payments</h3>
                <p className="text-xs font-medium text-slate-400">Manage your credit cards and billing history via Stripe.</p>
              </div>
              <Button
                onClick={handleManageBilling}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm"
              >
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Manage Billing
              </Button>
            </div>

            {(settings?.allow_admin_auto_recharge_edit || settings?.allow_admin_threshold_edit || hasAutoRechargePermission) && (
              <div className="pt-6 border-t border-slate-100 space-y-6">
                {/* Show toggle for admin and superadmin - always visible for these roles */}
                {(role === 'admin' || role === 'superadmin') && (
                  <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-emerald-600" />
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">Auto-Recharge</h3>
                        <p className="text-xs text-slate-500">Enable or disable automatic balance refill</p>
                      </div>
                    </div>
                    <Switch
                      checked={autoRechargeEnabled}
                      onCheckedChange={handleToggleAutoRecharge}
                      disabled={savingToggle}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  </div>
                )}

                {settings?.allow_admin_auto_recharge_edit && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Recharge Amount</h3>
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-50/50 p-6 rounded-lg border border-slate-100">
                      <div className="space-y-2 flex-1 w-full">
                        <Label htmlFor="auto-recharge" className="text-xs font-bold text-slate-500 ml-1">Recharge Amount (USD)</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                          <Input
                            id="auto-recharge"
                            type="number"
                            value={autoRechargeAmount}
                            onChange={(e) => setAutoRechargeAmount(e.target.value)}
                            disabled={!settings?.allow_admin_auto_recharge_edit}
                            className="h-10 pl-8 rounded-lg border-slate-200 bg-white font-bold text-sm focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveAutoRecharge}
                        disabled={savingAutoRecharge || !settings?.allow_admin_auto_recharge_edit}
                        className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingAutoRecharge ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                      </Button>
                    </div>
                  </div>
                )}

                {settings?.allow_admin_threshold_edit && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Settings className="h-5 w-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900">Low Balance Threshold</h3>
                    </div>

                    <div className="flex flex-col md:flex-row items-end gap-4 bg-slate-50/50 p-6 rounded-lg border border-slate-100">
                      <div className="space-y-2 flex-1 w-full">
                        <Label htmlFor="threshold" className="text-xs font-bold text-slate-500 ml-1">Threshold Amount (USD)</Label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">$</span>
                          <Input
                            id="threshold"
                            type="number"
                            step="0.01"
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value)}
                            disabled={!settings?.allow_admin_threshold_edit}
                            className="h-10 pl-8 rounded-lg border-slate-200 bg-white font-bold text-sm focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleSaveThreshold}
                        disabled={savingThreshold || !settings?.allow_admin_threshold_edit}
                        className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm w-full md:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingThreshold ? 'Saving...' : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                      </Button>
                    </div>
                    <p className="text-[10px] font-semibold text-slate-400 ml-1">
                      Auto-recharge will trigger when balance falls below this threshold
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Info */}
      <Card className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-teal-50 rounded-lg">
              <User className="text-teal-600 h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight">Profile</CardTitle>
              <CardDescription className="text-xs font-medium text-slate-500">View your account details and role</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', value: user?.full_name || 'Pending' },
              { label: 'Email Address', value: user?.email, lowercase: true },
              { label: 'User Role', component: <BadgeRole role={user?.role} /> },
              { label: 'Company', value: user?.client_name || 'System' }
            ].map((field, i) => (
              <div key={i} className="p-4 bg-slate-50/50 rounded-lg space-y-1 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{field.label}</p>
                {field.component ? field.component : (
                  <p className={clsx("text-sm font-bold text-slate-900", field.lowercase && "lowercase")}>{field.value}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ChangePasswordCard />

    </div>
  );
}

function BadgeRole({ role }: { role?: string }) {
  if (!role) return null;
  const styles = {
    superadmin: "bg-emerald-600 text-white",
    admin: "bg-slate-900 text-white",
    viewer: "bg-slate-100 text-slate-600 border-slate-200"
  };
  const style = styles[role as keyof typeof styles] || styles.viewer;

  return (
    <span className={clsx("inline-flex items-center px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", style)}>
      {role}
    </span>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Weak password', { description: 'New password must be at least 8 characters long.' });
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password Updated', { description: 'Your password has been successfully changed.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      toast.error('Update failed', {
        description: error?.response?.data?.error?.message || 'Failed to update password'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="rounded-xl shadow-sm border border-slate-200 overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-emerald-50 rounded-lg">
            <Lock className="text-emerald-600 h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg font-bold tracking-tight">Change Password</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-500">Securely update your account password</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs font-bold text-slate-500 ml-1">Current Password</Label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <Input
                id="current-password"
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="h-10 pl-10 rounded-lg border-slate-200 focus:border-emerald-500 transition-all font-medium"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-bold text-slate-500 ml-1">New Password</Label>
            <div className="relative group">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-600 transition-colors" />
              <Input
                id="new-password"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-10 pl-10 rounded-lg border-slate-200 focus:border-emerald-500 transition-all font-medium"
                minLength={8}
              />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm mt-2">
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </div>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

