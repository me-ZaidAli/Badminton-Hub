import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCreateClub } from "@/hooks/use-clubs";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";

const createClubSchema = z.object({
  name: z.string().min(3, "Club name must be at least 3 characters").max(50, "Club name must be less than 50 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

type CreateClubFormData = z.infer<typeof createClubSchema>;

export default function CreateClub() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const createClub = useCreateClub();

  const form = useForm<CreateClubFormData>({
    resolver: zodResolver(createClubSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  async function onSubmit(data: CreateClubFormData) {
    try {
      await createClub.mutateAsync(data);
      toast({
        title: "Club Created!",
        description: `Your club "${data.name}" has been created successfully. You are now the owner.`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create club",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-6"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle>Create a New Club</CardTitle>
                <CardDescription>
                  Start your own badminton club and invite players to join
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Club Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Downtown Badminton Club"
                          data-testid="input-club-name"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Choose a unique name for your club
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell players about your club, meeting times, skill levels, etc."
                          className="resize-none"
                          rows={4}
                          data-testid="input-club-description"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A brief description to help players find and learn about your club
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="flex-1"
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={createClub.isPending}
                    data-testid="button-create-club"
                  >
                    {createClub.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Club"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-medium mb-2">What happens next?</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• You become the owner of this club with full admin access</li>
            <li>• A player profile is automatically created for you</li>
            <li>• You can create sessions, manage matches, and invite players</li>
            <li>• Your club will appear on the public rankings page</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
