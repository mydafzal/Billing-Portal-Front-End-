'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Globe, Save, CreditCard, Smartphone, MessageSquare, Copy } from 'lucide-react';

export default function IntegrationsPage() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const origin = isMounted ? window.location.origin : '';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integrations</h1>
                    <p className="text-slate-500 font-medium text-sm">Configure global webhooks and system integrations</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Stripe Webhook */}
                <Card className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-5">
                        <CardTitle className="flex items-center gap-2 text-sm font-bold text-slate-900">
                            <CreditCard className="h-4 w-4 text-emerald-600" />
                            Stripe Webhook
                        </CardTitle>
                        <p className="text-xs font-medium text-slate-500 mt-1">Global endpoint for Stripe billing events</p>
                    </CardHeader>
                    <CardContent className="p-5 space-y-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 ml-1">Webhook URL</Label>
                            <div className="flex gap-2">
                                <input
                                    readOnly
                                    value={`${origin}/api/webhooks/stripe`}
                                    className="flex h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-mono font-bold text-emerald-600 outline-none focus:border-emerald-500"
                                />
                                <Button size="icon" variant="outline" className="shrink-0 h-9 w-9 rounded-lg border-slate-200 hover:bg-slate-50 transition-all shadow-sm" onClick={() => copyToClipboard(`${origin}/api/webhooks/stripe`, 'Stripe Webhook URL')}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <Label className="text-xs font-bold text-slate-700 block mb-3">Required Events</Label>
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

                {/* Info Card */}
                <div className="space-y-6">
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
                                        Global endpoints synchronize events for the entire platform. Configure these in your provider's master dashboard.
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="h-8 w-8 shrink-0 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-xs">2</div>
                                    <p className="text-sm font-medium text-slate-600 leading-relaxed">
                                        Client-specific webhooks (GHL, Vapi, Twilio) are managed individually. Configure those in the <span className="text-emerald-600 font-bold hover:underline cursor-pointer">Clients</span> section.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-3">
                                <Smartphone size={16} className="text-emerald-600 mt-0.5" />
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Production Sync</p>
                                    <p className="text-xs font-medium text-emerald-600/80 leading-snug">Ensure production-level CNAME records are used for live deployments to maintain reliable connectivity.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
