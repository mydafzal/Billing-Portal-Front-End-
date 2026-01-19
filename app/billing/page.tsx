'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BillingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard (main entry point)
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      <p className="text-sm text-slate-500 font-medium">Redirecting to dashboard...</p>
    </div>
  );
}





