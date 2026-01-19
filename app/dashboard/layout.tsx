'use client';
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, CreditCard, Settings, User, ShieldCheck, LogOut, Wallet, Building2, Users, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { logout } from '@/lib/api/auth';
import clsx from 'clsx';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Fetch user info for topbar
    // No need to check isAuthenticated here - middleware already protects this route
    import('@/lib/api/auth').then(({ me }) => {
      me().then(u => setUser(u)).catch(console.error);
    });
  }, []);


  const isAdmin = (user as any)?.role === 'admin' || (user as any)?.role === 'superadmin';
  const isSuperadmin = (user as any)?.role === 'superadmin';
  const isViewer = (user as any)?.role === 'viewer';

  const navItem = (href: string, label: string, Icon: any) => {
    const isActive = pathname === href;

    return (
      <Link
        href={href}
        className={clsx(
          'flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group',
          isActive
            ? 'bg-emerald-600 text-white shadow-sm font-semibold'
            : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 font-medium'
        )}
      >
        <Icon size={18} className={clsx(isActive ? 'text-white' : 'text-slate-400 group-hover:text-emerald-600 transition-colors')} />
        <span className="text-sm">{label}</span>
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        <Link href="/dashboard" className="p-6 flex items-center gap-3 group cursor-pointer active:scale-95 transition-transform">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center shadow-md shadow-emerald-100 transition-transform">
            <ShieldCheck className="text-white h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900 tracking-tight leading-none">Voice Agents</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Portal</p>
          </div>
        </Link>

        <nav className="flex-1 px-3 space-y-1">
          {navItem('/dashboard', 'Dashboard', LayoutDashboard)}
          {navItem('/dashboard/billing', 'Billing', CreditCard)}
          {!isViewer && navItem('/dashboard/transactions', 'Payments', Wallet)}
          {isAdmin && !isSuperadmin && navItem('/dashboard/team', 'Team', Users)}
          {navItem('/settings', 'Settings', Settings)}

          {/* Admin Section */}
          {isSuperadmin && (
            <div className="pt-6 mb-4">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Admin Panel</p>
              <div className="space-y-1">
                {navItem('/admin/integrations', 'Service Setup', Globe)}
                {navItem('/admin/clients', 'Clients', Building2)}
                {navItem('/admin/users', 'Users', Users)}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 mt-auto">
          <div className="bg-slate-900 rounded-xl p-4 text-white shadow-lg border border-white/5">
            <p className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider mb-1">Status</p>
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Operational
            </p>
          </div>
        </div>
      </aside>

      {/* Right side */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {pathname === '/dashboard' ? 'Dashboard' :
                pathname === '/dashboard/usage' ? 'Usage' :
                  pathname === '/dashboard/billing' ? 'Billing' :
                    pathname === '/dashboard/transactions' ? 'Payments' :
                      pathname === '/dashboard/team' ? 'Team Management' :
                        pathname === '/settings' ? 'Settings' :
                          pathname === '/admin' ? 'Admin Dashboard' :
                            pathname === '/admin/integrations' ? 'Service Configuration' :
                              pathname.startsWith('/admin/clients') ? 'Clients' :
                                pathname.startsWith('/admin/users') ? 'Users' :
                                  'Overview'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900">
                {user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {(user as any)?.role || 'Loading...'}
              </span>
            </div>
            {isMounted && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full border border-slate-100 hover:bg-emerald-50 transition-all group">
                    <User size={20} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-2 border-slate-200 shadow-xl">
                  <DropdownMenuLabel className="font-bold text-[10px] uppercase text-slate-400 tracking-widest px-2 py-1.5">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100" />
                  <DropdownMenuItem asChild className="rounded-lg mt-1 focus:bg-emerald-50">
                    <Link href="/settings" className="cursor-pointer py-2 font-semibold text-sm text-slate-700">
                      <User className="mr-2 h-4 w-4 text-emerald-600" />
                      <span>Profile Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="rounded-lg mt-1 text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer py-2 font-semibold text-sm"
                    onClick={async () => {
                      await logout();
                      router.replace('/login');
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}


