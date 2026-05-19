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
    description: 'Explore the product with 3 research credits',
    icon: FileText,
    features: [
      '3 research credits (one-time)',
      'Depth: 1 level',
      'Breadth: 2 parallel searches',
      'Standard PDF reports',
    ],
    cta: 'Current Plan',
    current: true,
  },
  {
    name: 'Pro',
    price: '$15',
    period: '/month',
    description: 'Perfect for 1–2 research projects per week',
    icon: Zap,
    features: [
      '20 research sessions per month',
      'Depth: 3 levels',
      'Breadth: 5 parallel searches',
      'Priority processing',
      'Advanced PDF reports with citations',
    ],
    cta: 'Upgrade to Pro',
    planId: 'pro',
    popular: true,
  },
  {
    name: 'Power',
    price: '$39',
    period: '/month',
    description: 'For teams doing daily competitive analysis',
    icon: Crown,
    features: [
      'Unlimited research sessions',
      'Depth: 5 levels (maximum)',
      'Breadth: 10 parallel searches',
      'Priority processing',
      'Advanced PDF reports with citations',
      'Priority email support',
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
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto p-6 py-16">
        <div className="text-center mb-12">
          <Button asChild variant="ghost" className="mb-6">
            <Link href="/research">
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

        {/* Trust signals */}
        <div className="mt-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Cancel anytime. No long-term contracts. Your data stays private.
          </p>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
              Secure Stripe billing
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
              Instant cancellation
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-primary" />
              Email support
            </span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: 'What counts as a research session?',
                a: 'One session is a complete research run from query to PDF delivery. Each session consumes one credit from your monthly allowance.',
              },
              {
                q: 'Can I export or share my reports?',
                a: 'Yes. Every report is delivered as a downloadable PDF with a permanent link you can share with colleagues or clients.',
              },
              {
                q: 'Do you store my research topics?',
                a: 'We retain session history so you can re-download reports. You can delete any session at any time from your dashboard.',
              },
              {
                q: 'What happens if I cancel?',
                a: 'You keep access until the end of your billing period, then revert to the Free plan. Your past reports remain accessible.',
              },
              {
                q: 'Is there a refund policy?',
                a: 'If you are unsatisfied, contact us within 7 days of your first payment for a full refund — no questions asked.',
              },
            ].map((faq) => (
              <div key={faq.q} className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold text-sm mb-1">{faq.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
