'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { forgotPassword } from '@/lib/api/auth';
import { Loader2, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            await forgotPassword(email);
            setSubmitted(true);
            toast.success('Reset Link Sent', {
                description: 'Please check your email for instructions.',
            });
        } catch (error: any) {
            toast.error('Request Failed', {
                description: error?.response?.data?.error?.message || 'We could not process your request.'
            });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="w-full max-w-md rounded-xl shadow-sm border-emerald-100 bg-white text-center">
                    <CardHeader className="pt-10 pb-6">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-inner">
                                <Mail className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Check Email</h2>
                        </div>
                    </CardHeader>
                    <CardContent className="px-6 pb-10 space-y-6">
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            Password reset instructions have been sent to <span className="text-slate-900 font-bold">{email}</span>.
                        </p>
                        <Link href="/login" className="block">
                            <Button variant="outline" className="w-full h-10 rounded-lg border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            {/* Background Decor */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl opacity-50" />
                <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-50/50 rounded-full blur-3xl opacity-50" />
            </div>

            <Card className="w-full max-w-md rounded-xl shadow-sm border-emerald-100 bg-white z-10">
                <CardHeader className="space-y-4 text-center pb-6 pt-10">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-100">
                            <ShieldCheck className="text-white h-6 w-6" />
                        </div>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Forgot Password</h1>
                            <p className="text-slate-500 text-sm">Reset your portal password</p>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-6 pb-10">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-1.5">
                            <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="user@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-10 pl-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                type="submit"
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </Button>

                            <Link href="/login">
                                <Button variant="ghost" className="w-full h-10 text-sm font-semibold text-slate-500 hover:text-slate-700 transition-colors" type="button">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Login
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
