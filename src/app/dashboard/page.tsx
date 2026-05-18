import { requireAuth } from '@/lib/auth';
import { getUserResearchSessions } from '@/lib/research-sessions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Calendar, ExternalLink, ArrowLeft, Trash2 } from 'lucide-react';
import Link from 'next/link';
import DeleteDialog from '@/components/DeleteDialog';
import parse from 'html-react-parser';

export default async function DashboardPage() {
  const user = await requireAuth();
  const sessions = await getUserResearchSessions(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Research Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Your research session history
            </p>
          </div>
          <Button asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              New Research
            </Link>
          </Button>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No research sessions yet</h3>
              <p className="text-muted-foreground text-center mb-6">
                Start your first deep research to see it appear here.
              </p>
              <Button asChild>
                <Link href="/">Start Research</Link>
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
                      {session.report && parse(session.report.substring(0, 300) + '...')}
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
