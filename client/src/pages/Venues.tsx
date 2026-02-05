import { useState } from "react";
import { useClubs } from "@/hooks/use-clubs";
import { useUser } from "@/hooks/use-auth";
import { useVenues, useCreateVenue, useUpdateVenue, useDeleteVenue } from "@/hooks/use-venues";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, MapPin, Pencil, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { Venue } from "@shared/schema";

const venueFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().optional(),
  postcode: z.string().optional(),
  googleMapsUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  isDefault: z.boolean().optional(),
});

type VenueFormValues = z.infer<typeof venueFormSchema>;

export default function Venues() {
  const { data: user } = useUser();
  const { data: clubs } = useClubs();
  const { toast } = useToast();
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);

  const ownedClubs = clubs?.filter(club => club.ownerId === user?.id) || [];
  const adminClubs = ["OWNER", "ADMIN"].includes(user?.role || "") ? clubs : ownedClubs;
  const clubId = selectedClubId ?? adminClubs?.[0]?.id ?? null;

  const { data: venues, isLoading } = useVenues(clubId);
  const createVenueMutation = useCreateVenue(clubId!);
  const updateVenueMutation = useUpdateVenue(clubId);
  const deleteVenueMutation = useDeleteVenue(clubId);

  const form = useForm<VenueFormValues>({
    resolver: zodResolver(venueFormSchema),
    defaultValues: {
      name: "",
      address: "",
      city: "",
      postcode: "",
      googleMapsUrl: "",
      isDefault: false,
    },
  });

  const handleCreate = (values: VenueFormValues) => {
    createVenueMutation.mutate(
      {
        name: values.name,
        address: values.address,
        city: values.city || null,
        postcode: values.postcode || null,
        googleMapsUrl: values.googleMapsUrl || null,
        isDefault: values.isDefault || false,
      },
      {
        onSuccess: () => {
          toast({ title: "Venue created successfully" });
          setCreateOpen(false);
          form.reset();
        },
        onError: (error: Error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  const handleUpdate = (values: VenueFormValues) => {
    if (!editingVenue) return;
    updateVenueMutation.mutate(
      {
        venueId: editingVenue.id,
        updates: {
          name: values.name,
          address: values.address,
          city: values.city || null,
          postcode: values.postcode || null,
          googleMapsUrl: values.googleMapsUrl || null,
          isDefault: values.isDefault || false,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Venue updated successfully" });
          setEditingVenue(null);
          form.reset();
        },
        onError: (error: Error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteVenue) return;
    deleteVenueMutation.mutate(deleteVenue.id, {
      onSuccess: () => {
        toast({ title: "Venue deleted successfully" });
        setDeleteVenue(null);
      },
      onError: (error: Error) => {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      },
    });
  };

  const openEditDialog = (venue: Venue) => {
    setEditingVenue(venue);
    form.reset({
      name: venue.name,
      address: venue.address,
      city: venue.city || "",
      postcode: venue.postcode || "",
      googleMapsUrl: venue.googleMapsUrl || "",
      isDefault: venue.isDefault,
    });
  };

  if (!adminClubs?.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="Venues" description="Manage your club venues." />
        <Card className="border-border/50">
          <CardContent className="py-8 text-center text-muted-foreground">
            You need to own or manage a club to access venue management.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Venues"
        description="Manage locations where your club holds sessions."
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-venue">
                <Plus className="h-4 w-4 mr-2" /> Add Venue
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Venue</DialogTitle>
                <DialogDescription>Add a new location for your club sessions.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Community Sports Centre" {...field} data-testid="input-venue-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Sports Lane" {...field} data-testid="input-venue-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="London" {...field} data-testid="input-venue-city" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postcode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postcode</FormLabel>
                          <FormControl>
                            <Input placeholder="SW1A 1AA" {...field} data-testid="input-venue-postcode" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="googleMapsUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Google Maps URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://maps.google.com/..." {...field} data-testid="input-venue-maps-url" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isDefault"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-venue-default"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Set as default venue</FormLabel>
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit" disabled={createVenueMutation.isPending} data-testid="button-create-venue">
                      {createVenueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Create Venue
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      />

      {adminClubs.length > 1 && (
        <Card className="border-border/50">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-muted-foreground">Select Club:</span>
              <Select value={clubId?.toString()} onValueChange={(v) => setSelectedClubId(Number(v))}>
                <SelectTrigger className="w-64" data-testid="select-club">
                  <SelectValue placeholder="Select a club" />
                </SelectTrigger>
                <SelectContent>
                  {adminClubs.map((club) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Club Venues
          </CardTitle>
          <CardDescription>Locations where sessions are held.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !venues?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No venues configured yet. Add your first venue above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Postcode</TableHead>
                    <TableHead>Maps</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venues.map((venue) => (
                    <TableRow key={venue.id} data-testid={`row-venue-${venue.id}`}>
                      <TableCell className="font-medium">{venue.name}</TableCell>
                      <TableCell>{venue.address}</TableCell>
                      <TableCell>{venue.city || "-"}</TableCell>
                      <TableCell>{venue.postcode || "-"}</TableCell>
                      <TableCell>
                        {venue.googleMapsUrl ? (
                          <a
                            href={venue.googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" /> View
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {venue.isDefault ? (
                          <Badge variant="secondary">Default</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(venue)}
                            data-testid={`button-edit-venue-${venue.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteVenue(venue)}
                            data-testid={`button-delete-venue-${venue.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingVenue} onOpenChange={(open) => !open && setEditingVenue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-venue-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-venue-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-venue-city" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="postcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postcode</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-venue-postcode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="googleMapsUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps URL</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-venue-maps-url" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isDefault"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-edit-venue-default"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Set as default venue</FormLabel>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={updateVenueMutation.isPending} data-testid="button-save-venue">
                  {updateVenueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteVenue} onOpenChange={(open) => !open && setDeleteVenue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Venue</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteVenue?.name}"? Sessions using this venue will be unlinked but not deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVenue(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteVenueMutation.isPending}
              data-testid="button-confirm-delete-venue"
            >
              {deleteVenueMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
