import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormField, FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Mail, Send, CheckCircle, Loader2, MessageSquare } from "lucide-react";
import type { Club } from "@shared/schema";

const contactFormSchema = z.object({
  senderName: z.string().min(1, "Name is required"),
  senderEmail: z.string().email("Please enter a valid email address"),
  clubId: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const { data: user } = useUser();
  const { toast } = useToast();

  const { data: clubs, isLoading: clubsLoading } = useQuery<Club[]>({
    queryKey: ["/api/clubs"],
  });

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      senderName: "",
      senderEmail: "",
      clubId: "",
      subject: "",
      message: "",
    },
    values: {
      senderName: user?.fullName ?? "",
      senderEmail: user?.email ?? "",
      clubId: "",
      subject: "",
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: ContactFormValues) => {
      const body: Record<string, unknown> = {
        senderName: values.senderName,
        senderEmail: values.senderEmail,
        subject: values.subject,
        message: values.message,
      };
      if (values.clubId && values.clubId !== "general") {
        body.clubId = parseInt(values.clubId, 10);
      }
      await apiRequest("POST", "/api/contact", body);
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      setSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(values: ContactFormValues) {
    mutation.mutate(values);
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4" data-testid="container-success">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" data-testid="icon-success" />
            </div>
            <CardTitle data-testid="text-success-title">Message Sent</CardTitle>
            <CardDescription data-testid="text-success-description">
              We'll get back to you shortly
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4" data-testid="container-contact-form">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" data-testid="icon-contact" />
            <CardTitle data-testid="text-form-title">Contact Us</CardTitle>
          </div>
          <CardDescription data-testid="text-form-description">
            Send us a message and we'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="form-contact">
              <FormField
                control={form.control}
                name="senderName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-sender-name">Sender Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Your full name"
                        data-testid="input-sender-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-sender-name" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="senderEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-sender-email">Sender Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" data-testid="icon-email" />
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          className="pl-9"
                          data-testid="input-sender-email"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage data-testid="error-sender-email" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clubId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-club">Club (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-club">
                          <SelectValue placeholder="Select a club or leave blank" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="general" data-testid="select-item-general">
                          General / Platform Enquiry
                        </SelectItem>
                        {clubsLoading && (
                          <SelectItem value="loading" disabled data-testid="select-item-loading">
                            Loading clubs...
                          </SelectItem>
                        )}
                        {clubs?.map((club) => (
                          <SelectItem
                            key={club.id}
                            value={String(club.id)}
                            data-testid={`select-item-club-${club.id}`}
                          >
                            {club.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage data-testid="error-club" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-subject">Subject</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="What is this about?"
                        data-testid="input-subject"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-subject" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel data-testid="label-message">Message</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us what you need help with..."
                        className="resize-none"
                        rows={5}
                        data-testid="input-message"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage data-testid="error-message" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={mutation.isPending}
                data-testid="button-submit"
              >
                {mutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" data-testid="icon-loading" />
                ) : (
                  <Send className="mr-2 h-4 w-4" data-testid="icon-send" />
                )}
                {mutation.isPending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
