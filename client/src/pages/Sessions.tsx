import { useSessions, useCreateSession } from "@/hooks/use-sessions";
import { useUser } from "@/hooks/use-auth";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertSessionSchema } from "@shared/schema";
import { Plus, Users, MapPin, Calendar } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const CATEGORIES = [
  { value: "A", label: "Category A (Advanced)" },
  { value: "B", label: "Category B (Intermediate+)" },
  { value: "C", label: "Category C (Intermediate)" },
  { value: "D", label: "Category D (Beginner)" },
] as const;

// Helper for schema refinement if needed, usually direct import works
const createSessionSchema = insertSessionSchema.extend({
  date: z.coerce.date(), // ensure string dates are coerced
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Use HH:MM format"),
});

export default function Sessions() {
  const { data: user } = useUser();
  const { data: sessions, isLoading } = useSessions();
  const [, setLocation] = useLocation();
  const isOrganiser = ["OWNER", "ADMIN", "ORGANISER"].includes(user?.role || "");

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Sessions" 
        description="Book your spot for upcoming games."
        action={isOrganiser && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/admin/calendar")}
              data-testid="button-import-from-calendar"
            >
              <Calendar className="h-4 w-4 mr-2" /> Import from Calendar
            </Button>
            <CreateSessionDialog />
          </div>
        )}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading && [1,2,3].map(i => <div key={i} className="h-64 bg-muted/20 animate-pulse rounded-2xl" />)}
        
        {sessions?.map((session) => (
          <Link key={session.id} href={`/sessions/${session.id}`}>
            <Card className="h-full hover-card-effect cursor-pointer border-border/50 group overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-primary to-secondary" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Badge variant={session.matchMode === "COMPETITIVE" ? "destructive" : "secondary"}>
                    {session.matchMode}
                  </Badge>
                  <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                    {session.startTime}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {session.title}
                </h3>
                
                <div className="space-y-2 text-sm text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>{session.signupCount || 0} / {session.maxPlayers} Players</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{session.courtsAvailable} Courts Available</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border/50">
                  <span className="font-bold text-lg">
                    {format(new Date(session.date), "EEE, MMM d")}
                  </span>
                  <Button size="sm" variant="outline" className="group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                    Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CreateSessionDialog() {
  const [open, setOpen] = useState(false);
  const { mutate: create, isPending } = useCreateSession();
  
  const form = useForm<z.infer<typeof createSessionSchema>>({
    resolver: zodResolver(createSessionSchema),
    defaultValues: {
      title: "",
      startTime: "18:00",
      maxPlayers: 24,
      courtsAvailable: 4,
      matchMode: "SOCIAL",
      isPrivate: false,
      durationMinutes: 120,
      allowedCategories: ["A", "B", "C", "D"],
    }
  });

  function onSubmit(values: z.infer<typeof createSessionSchema>) {
    create(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" /> New Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Create New Session</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Friday Night Social" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ? format(new Date(field.value), "yyyy-MM-dd") : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="durationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="maxPlayers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Players</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="courtsAvailable"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Courts</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="matchMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SOCIAL">Social (Mixed)</SelectItem>
                      <SelectItem value="COMPETITIVE">Competitive (Ranked)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedCategories"
              render={() => (
                <FormItem>
                  <FormLabel>Allowed Categories</FormLabel>
                  <FormDescription>
                    Select which player categories can join this session.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {CATEGORIES.map((category) => (
                      <FormField
                        key={category.value}
                        control={form.control}
                        name="allowedCategories"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(category.value)}
                                onCheckedChange={(checked) => {
                                  const currentValue = (field.value || []) as string[];
                                  if (checked) {
                                    field.onChange([...currentValue, category.value]);
                                  } else {
                                    field.onChange(currentValue.filter(v => v !== category.value));
                                  }
                                }}
                                data-testid={`checkbox-category-${category.value}`}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              {category.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-create-session">
              {isPending ? "Creating..." : "Create Session"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
