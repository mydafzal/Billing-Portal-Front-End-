'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { signup } from '@/lib/api/auth';
import { Suspense } from 'react';

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteToken = useMemo(() => {
    const rawToken = searchParams.get('token');
    return rawToken ? decodeURIComponent(rawToken) : null;
  }, [searchParams]);

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteToken) {
      toast.error('Invalid Token', { description: 'Invalid or missing invitation token.' });
      return;
    }

    if (password.length < 8) {
      toast.error('Password too short', { description: 'Password must be at least 8 characters long.' });
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match', { description: 'Please ensure both passwords are the same.' });
      return;
    }

    setIsLoading(true);

    try {
      await signup(inviteToken, password, fullName);
      toast.success('Welcome!', { description: 'Your account has been created.' });
      router.push('/dashboard');
    } catch (error: any) {
      toast.error('Sign up Failed', {
        description: error?.response?.data?.error?.message || 'Please check your invitation link and try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 border-emerald-100 shadow-sm bg-white">
          <div className="mx-auto w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
            <Lock size={32} />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Invitation Required</CardTitle>
          <p className="text-slate-500 mb-8 font-medium">This platform is currently invitation-only. Please use the link provided by your administrator.</p>
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700" asChild>
            <Link href="/login" className="text-white font-semibold">Back to Login</Link>
          </Button>
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

      <Card className="w-full max-w-md rounded-xl shadow-sm border-emerald-100 bg-white z-10 transition-all">
        <div className="flex flex-col items-center gap-4 pt-10 pb-4">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-100">
            <CheckCircle2 className="text-white h-6 w-6" />
          </div>
          <div className="text-center px-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Account</h1>
            <p className="text-slate-500 text-sm">Set up your profile to get started</p>
          </div>
        </div>

        <CardContent className="px-6 pb-10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Full Name</Label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-emerald-500 transition-all" />
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="h-10 pl-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-emerald-500 transition-all" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="h-10 pl-10 pr-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
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
              <Label className="text-sm font-medium text-slate-700">Confirm Password</Label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-emerald-500 transition-all" />
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="h-10 pl-10 pr-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all mt-6">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </Button>

            <div className="text-center pt-6 border-t border-slate-100">
              <p className="text-slate-500 text-sm font-medium">
                Already have an account?{' '}
                <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 text-slate-400">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="font-medium text-sm">Loading...</p>
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}

