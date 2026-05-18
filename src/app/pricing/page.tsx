"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Zap, FileText, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    description: 'Try deep research with 3 free credits',
    icon: FileText,
    features: [
      '3 free research credits (one-time)',
      'Depth: 1 level',
      'Breadth: 2 parallel searches',
      'Basic PDF reports',
    ],
    cta: 'Current Plan',
    current: true,
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'For professionals who need deeper research',
    icon: Zap,
    features: [
      '20 research sessions per month',
      'Depth: 3 levels',
      'Breadth: 5 parallel searches',
      'Priority processing',
      'Advanced PDF reports',
    ],
    cta: 'Upgrade to Pro',
    planId: 'pro',
    popular: true,
  },
  {
    name: 'Power',
    price: '$39',
    period: '/month',
    description: 'Maximum depth for analysts and researchers',
    icon: Crown,
    features: [
      'Unlimited research sessions',
      'Depth: 5 levels (maximum)',
      'Breadth: 10 parallel searches',
      'Priority processing',
      'Advanced PDF reports',
      'Priority support',
    ],
    cta: 'Upgrade to Power',
    planId: 'power',
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `plan=${plan}`,
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('No URL returned from checkout');
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 py-16">
        <div className="text-center mb-12">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Research
            </Link>
          </Button>
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Choose the plan that fits your research needs. Upgrade or downgrade at any time.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const Icon = tier.icon;
            return (
              <Card
                key={tier.name}
                className={`relative ${
                  tier.popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border'
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className={`w-8 h-8 ${tier.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                  </div>
                  <CardDescription className="text-base">
                    {tier.description}
                  </CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && <span className="text-muted-foreground ml-1">{tier.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  {tier.planId ? (
                    <Button
                      onClick={() => handleCheckout(tier.planId!)}
                      disabled={loading === tier.planId}
                      className="w-full"
                      variant={tier.popular ? 'default' : 'outline'}
                    >
                      {loading === tier.planId ? 'Loading...' : tier.cta}
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {tier.cta}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-sm">
            All plans include AI-powered research synthesis, source quality evaluation, and PDF report generation.
          </p>
        </div>
      </div>
    </div>
  );
}
