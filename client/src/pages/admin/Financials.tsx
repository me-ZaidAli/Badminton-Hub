import { useSessions } from "@/hooks/use-sessions";
import { useAllSignups } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, AlertCircle, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Financials() {
  const { data: sessions } = useSessions();
  const { data: allSignups, isLoading } = useAllSignups();

  const unpaidSignups = allSignups?.filter(s => s.paymentStatus === "UNPAID") || [];
  const paidSignups = allSignups?.filter(s => s.paymentStatus === "PAID") || [];

  const totalUnpaid = unpaidSignups.reduce((sum, s) => sum + (s.fee || 0), 0);
  const totalPaid = paidSignups.reduce((sum, s) => sum + (s.fee || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            Financials
          </h1>
          <p className="text-muted-foreground">Track payments and outstanding fees.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-border/50 bg-green-500/5 border-green-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">${(totalPaid / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{paidSignups.length} payments</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-orange-500/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">${(totalUnpaid / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">{unpaidSignups.length} unpaid</p>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sessions?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Unpaid Session Fees ({unpaidSignups.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
          ) : unpaidSignups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All fees are paid! Great job.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidSignups.map((signup) => (
                    <TableRow key={signup.id} data-testid={`row-unpaid-${signup.id}`}>
                      <TableCell className="font-medium">
                        {signup.player?.user?.fullName || "Unknown"}
                      </TableCell>
                      <TableCell>{signup.session?.title || "Session"}</TableCell>
                      <TableCell>
                        {signup.session?.date 
                          ? format(new Date(signup.session.date), "MMM d, yyyy")
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell className="font-bold">${((signup.fee || 0) / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                          UNPAID
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
