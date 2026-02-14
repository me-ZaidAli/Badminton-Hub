import { useRoute } from "wouter";
import { usePlayerSessionHistory, useUpdatePaymentStatus } from "@/hooks/use-admin";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, User, Calendar, DollarSign, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function PlayerProfile() {
  const [, params] = useRoute("/admin/players/:playerId");
  const playerId = params?.playerId ? Number(params.playerId) : null;
  const { data, isLoading } = usePlayerSessionHistory(playerId);
  const updatePayment = useUpdatePaymentStatus();
  const { toast } = useToast();

  const handleTogglePayment = (signup: any, newStatus: "PAID" | "UNPAID") => {
    updatePayment.mutate(
      { sessionId: signup.sessionId, signupId: signup.id, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: newStatus === "PAID" ? "Marked as Paid" : "Marked as Unpaid",
            description: "Payment status updated successfully."
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to update payment status.",
            variant: "destructive"
          });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading..." description="Fetching player data..." />
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!data?.player) {
    return (
      <div className="space-y-6">
        <PageHeader title="Player Not Found" description="The player profile could not be found." />
        <Link href="/admin/players">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Players
          </Button>
        </Link>
      </div>
    );
  }

  const { player, signups } = data;
  const totalPaid = signups?.filter((s: any) => s.paymentStatus === "PAID").reduce((sum: number, s: any) => sum + (s.fee || 0), 0) || 0;
  const totalUnpaid = signups?.filter((s: any) => s.paymentStatus === "UNPAID").reduce((sum: number, s: any) => sum + (s.fee || 0), 0) || 0;
  const sessionsAttended = signups?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/players">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <PageHeader 
          title={player.user?.fullName || "Player Profile"} 
          description="View player session history and payment status"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-4">
                <AvatarFallback className="text-2xl bg-primary/10">
                  {player.user?.fullName?.charAt(0) || <User className="h-8 w-8" />}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{player.user?.fullName || "Unknown"}</h2>
              <p className="text-sm text-muted-foreground">{player.user?.email}</p>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline">{player.grade || player.category || "C3"}</Badge>
                <Badge variant="secondary">{player.gender}</Badge>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>{player.rankingPoints || 1000} ranking points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg">
                <Calendar className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{sessionsAttended}</p>
                  <p className="text-sm text-muted-foreground">Sessions Attended</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-600">${(totalPaid / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-orange-500/10 rounded-lg">
                <AlertCircle className="h-8 w-8 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold text-orange-600">${(totalUnpaid / 100).toFixed(2)}</p>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Session History ({signups?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!signups || signups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No session history found for this player.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signups.map((signup: any) => (
                    <TableRow key={signup.id} data-testid={`row-session-${signup.id}`}>
                      <TableCell className="font-medium">
                        {signup.session?.title || "Session"}
                      </TableCell>
                      <TableCell>
                        {signup.session?.date 
                          ? format(new Date(signup.session.date), "MMM d, yyyy")
                          : "N/A"
                        }
                      </TableCell>
                      <TableCell className="font-bold">
                        ${((signup.fee || 0) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {signup.paymentStatus === "PAID" ? (
                          <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                            PAID
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                            UNPAID
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {signup.attendanceStatus === "ATTENDED" ? (
                          <Badge variant="secondary">Attended</Badge>
                        ) : (
                          <Badge variant="outline">Not Attended</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {signup.paymentStatus === "PAID" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleTogglePayment(signup, "UNPAID")}
                            disabled={updatePayment.isPending}
                            data-testid={`button-mark-unpaid-${signup.id}`}
                          >
                            {updatePayment.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark Unpaid"
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleTogglePayment(signup, "PAID")}
                            disabled={updatePayment.isPending}
                            data-testid={`button-mark-paid-${signup.id}`}
                          >
                            {updatePayment.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>
                        )}
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
