import { useState } from "react";
import { useAnnouncements, useCreateAnnouncement } from "@/hooks/use-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Megaphone, Plus, Clock } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

const createAnnouncementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  visibleTo: z.enum(["ALL", "PLAYERS", "ADMINS"]),
});

export default function Announcements() {
  const { data: announcements, isLoading } = useAnnouncements();
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-orange-500" />
              Announcements
            </h1>
            <p className="text-muted-foreground">Post updates to club members.</p>
          </div>
        </div>
        <CreateAnnouncementDialog open={open} setOpen={setOpen} />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        ) : announcements?.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No announcements yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          announcements?.map((announcement) => (
            <Card key={announcement.id} className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{announcement.title}</CardTitle>
                  <Badge variant="outline">{announcement.visibleTo}</Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {format(new Date(announcement.createdAt), "MMM d, yyyy 'at' h:mm a")}
                  <span className="mx-1">by</span>
                  <span className="font-medium">{announcement.author?.fullName || "Admin"}</span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CreateAnnouncementDialog({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const { mutate: create, isPending } = useCreateAnnouncement();

  const form = useForm<z.infer<typeof createAnnouncementSchema>>({
    resolver: zodResolver(createAnnouncementSchema),
    defaultValues: {
      title: "",
      content: "",
      visibleTo: "ALL",
    },
  });

  function onSubmit(values: z.infer<typeof createAnnouncementSchema>) {
    create(values, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-announcement">
          <Plus className="h-4 w-4 mr-2" /> New Announcement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Announcement</DialogTitle>
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
                    <Input placeholder="Announcement title" {...field} data-testid="input-title" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Write your announcement..." 
                      rows={4}
                      {...field} 
                      data-testid="input-content"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="visibleTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Visible To</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-visibility">
                        <SelectValue placeholder="Select visibility" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ALL">Everyone</SelectItem>
                      <SelectItem value="PLAYERS">Players Only</SelectItem>
                      <SelectItem value="ADMINS">Admins Only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit">
              {isPending ? "Creating..." : "Post Announcement"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
