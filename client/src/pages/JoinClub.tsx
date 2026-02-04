import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Club } from "@shared/schema";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Users, Check, Loader2 } from "lucide-react";

const joinClubSchema = z.object({
  gender: z.enum(["MALE", "FEMALE"], {
    required_error: "Please select your gender",
  }),
});

type JoinClubForm = z.infer<typeof joinClubSchema>;

export default function JoinClub() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<JoinClubForm>({
    resolver: zodResolver(joinClubSchema),
    defaultValues: {
      gender: undefined,
    },
  });

  const { data: club, isLoading: clubLoading } = useQuery<Club>({
    queryKey: ["/api/clubs", id],
    queryFn: async () => {
      const res = await fetch(`/api/clubs/${id}`);
      if (!res.ok) throw new Error("Club not found");
      return res.json();
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async (data: { clubId: number; gender: string }) => {
      const res = await apiRequest("POST", "/api/clubs/join", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to join club");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Join request submitted",
        description: "The club admin will review your request.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/pending-approval");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JoinClubForm) => {
    if (!id) return;
    joinMutation.mutate({ 
      clubId: Number(id),
      gender: data.gender
    });
  };

  if (clubLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!club) {
    return (
      <div className="space-y-8">
        <PageHeader title="Club Not Found" description="This club doesn't exist." />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <PageHeader 
        title={`Join ${club.name}`} 
        description="Submit a request to join this club."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Club Details
          </CardTitle>
          <CardDescription>
            {club.description || "A great place to play badminton and meet fellow players."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="MALE">Male</SelectItem>
                        <SelectItem value="FEMALE">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">What happens next?</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Your request will be sent to the club admin
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Once approved, you'll have access to the club
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    You can sign up for sessions and track rankings
                  </li>
                </ul>
              </div>

              <Button 
                type="submit"
                className="w-full"
                disabled={joinMutation.isPending}
                data-testid="button-submit-join"
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Join Request"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
