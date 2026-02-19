'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { resetPassword } from '@/lib/api/auth';
import { Loader2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            toast.error('Error', { description: 'Reset token is missing.' });
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Error', { description: 'Passwords do not match.' });
            return;
        }

        if (password.length < 8) {
            toast.error('Error', { description: 'Password must be at least 8 characters.' });
            return;
        }

        setLoading(true);

        try {
            await resetPassword(token, password);
            toast.success('Success', {
                description: 'Your password has been reset successfully.',
            });
            router.push('/login');
        } catch (error: any) {
            toast.error('Error', {
                description: error?.response?.data?.error?.message || 'Failed to reset password.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="text-center py-4">
                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck className="text-red-600 h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Invalid Link</h2>
                <p className="text-sm text-slate-500 font-medium mt-2 mb-8">This password reset link is invalid or has expired.</p>
                <Link href="/login">
                    <Button variant="outline" className="w-full h-10 rounded-lg border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Back to Login</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-8 text-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-100">
                        <Lock className="text-white h-6 w-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Reset Password</h2>
                        <p className="text-slate-500 text-sm">Create a new secure password</p>
                    </div>
                </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-sm font-medium text-slate-700">New Password</Label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-10 pl-10 pr-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                minLength={8}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                required
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="h-10 pl-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                minLength={8}
                            />
                        </div>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all mt-4"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting...
                        </>
                    ) : (
                        'Reset Password'
                    )}
                </Button>
            </form>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-50/50 rounded-full blur-3xl opacity-50" />
            </div>

            <Card className="w-full max-w-md rounded-xl shadow-sm border-emerald-100 bg-white z-10">
                <CardContent className="px-6 pb-10 pt-10">
                    <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin text-emerald-600 h-10 w-10" /></div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}

