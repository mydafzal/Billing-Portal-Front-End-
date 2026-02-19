'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DollarSign, CreditCard } from 'lucide-react';
import { billingApi } from '@/lib/api/billing';

export default function TopupPage() {
    const [amount, setAmount] = useState<string>('10');
    const [isLoading, setIsLoading] = useState(false);

    const handleTopup = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const val = parseFloat(amount);
            if (isNaN(val) || val <= 0) {
                toast.error("Invalid amount", { description: "Please enter a valid positive number" });
                return;
            }

            const response = await billingApi.createTopup(val);

            if (response.success && response.data.checkout_url) {
                window.location.href = response.data.checkout_url;
            } else {
                toast.error("Top-up failed", { description: "Could not initiate payment. Please try again." });
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Top-up error", { description: error?.response?.data?.error?.message || "An error occurred" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <Card className="rounded-xl shadow-lg border-0">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CreditCard className="text-green-600 w-6 h-6" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-900">Add Funds</CardTitle>
                    <CardDescription>Top up your wallet balance securely</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleTopup} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="amount" className="text-sm font-medium text-gray-700">Amount (USD)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    id="amount"
                                    type="number"
                                    min="1"
                                    step="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-10 h-11 text-lg"
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-semibold transition-all"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Processing...' : 'Proceed to Payment'}
                        </Button>

                        <p className="text-xs text-center text-gray-500 mt-4">
                            Secured by Stripe
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
