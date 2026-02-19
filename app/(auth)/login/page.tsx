'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { toast } from 'sonner';

export default function LoginPage() {

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('[LOGIN PAGE] Attempting login for:', email);
      
      const user = await login(email, password);
      
      console.log('[LOGIN PAGE] Login successful, user:', user);
      console.log('[LOGIN PAGE] User object type:', typeof user);
      console.log('[LOGIN PAGE] User object:', JSON.stringify(user, null, 2));
      
      toast.success('Login Successful', {
        description: user ? `Welcome back, ${user.full_name || user.email}!` : 'Welcome back!'
      });

      // Small delay to ensure cookies are set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Hard redirect to dashboard
      console.log('[LOGIN PAGE] Redirecting to dashboard...');
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error('[LOGIN PAGE] Login error:', error);
      
      // Extract error message from various possible locations
      const errorMessage = 
        error?.response?.data?.detail || 
        error?.response?.data?.error?.message || 
        error?.response?.data?.message ||
        error?.message || 
        'Please check your email and password.';

      toast.error('Login Failed', {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      {/* Background Decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] bg-emerald-100/50 rounded-full blur-3xl opacity-50" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-50/50 rounded-full blur-3xl opacity-50" />
      </div>

      <Card className="w-full max-w-md rounded-xl shadow-sm border-emerald-100 bg-white z-10">
        <CardHeader className="space-y-2 text-center pt-8 pb-4">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-md shadow-emerald-100 transition-transform">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Voice Agents Portal</h1>
              <p className="text-slate-500 text-sm">Please enter your details to login</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 pb-8 pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 pl-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
                  tabIndex={isLoading ? -1 : 0}
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-emerald-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 pl-10 pr-10 rounded-lg border-slate-200 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
                  required
                  disabled={isLoading}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm active:scale-[0.98] transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Logging in...
                </div>
              ) : (
                'Login'
              )}
            </Button>

            <div className="text-center pt-4">
              <p className="text-slate-500 text-sm font-medium">
                Don't have an account?{' '}
                <Link 
                  href="/signup" 
                  className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline underline-offset-4"
                  tabIndex={isLoading ? -1 : 0}
                >
                  Sign Up
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}