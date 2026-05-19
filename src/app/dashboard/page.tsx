import { requireAuth } from '@/lib/auth';
import { getUserResearchSessions } from '@/lib/research-sessions';
import { getUserSubscription, getUserFreeCredits } from '@/lib/subscriptions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, ExternalLink, ArrowLeft, Trash2, Zap, Crown } from 'lucide-react';
import Link from 'next/link';
import DeleteDialog from '@/components/DeleteDialog';
import parse from 'html-react-parser';

export default async function DashboardPage() {
  const user = await requireAuth();
  const sessions = await getUserResearchSessions(user.id);
  const subscription = await getUserSubscription(user.id);
  const freeCredits = await getUserFreeCredits(user.id);

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        {/* Subscription Banner */}
        {subscription ? (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {subscription.plan === 'power' && <Crown className="w-5 h-5 text-amber-500" />}
                  {subscription.plan === 'pro' && <Zap className="w-5 h-5 text-primary" />}
                  {subscription.plan === 'starter' && <FileText className="w-5 h-5 text-muted-foreground" />}
                  <div>
                    <p className="font-semibold capitalize">{subscription.plan} Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {subscription.sessionsLimit
                        ? `${subscription.sessionsUsed}/${subscription.sessionsLimit} sessions used this month`
                        : 'Unlimited sessions'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {subscription.plan !== 'power' && (
                    <Button asChild size="sm" variant="outline">
                      <Link href="/pricing">Upgrade</Link>
                    </Button>
                  )}
                  {subscription.stripeCustomerId && (
                    <form action="/api/portal" method="POST">
                      <Button size="sm" variant="ghost">
                        Manage Billing
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">Free Plan</p>
                    <p className="text-sm text-muted-foreground">
                      {freeCredits} free credits remaining
                    </p>
                  </div>
                </div>
                <Button asChild size="sm" variant="outline">
                  <Link href="/pricing">Upgrade</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Research Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Your research session history
            </p>
          </div>
          <Button asChild>
            <Link href="/research">
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Research
            </Link>
          </Button>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/5 mb-4">
                <FileText className="w-6 h-6 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2">Your research library is waiting</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-sm">
                Run your first report and it will appear here with full access to PDFs, source citations, and session history.
              </p>
              <Button asChild>
                <Link href="/research">Run your first report &rarr;</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessions.map((session) => (
              <Card key={session.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2">
                        {session.prompt}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                        <span>Depth: {session.depth}</span>
                        <span>Breadth: {session.breadth}</span>
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        session.status === 'completed'
                          ? 'default'
                          : session.status === 'pending'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {session.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {session.report ? parse(session.report.substring(0, 300) + '...') : 'No report generated'}
                    </div>
                    <div className="flex items-center gap-2">
                      {session.pdfUrl && (
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={session.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="w-3 h-3 mr-2" />
                            View Report
                          </a>
                        </Button>
                      )}
                      <DeleteDialog sessionId={session.id} sessionTitle={session.prompt} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
