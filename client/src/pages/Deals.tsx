import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tag, Search, Plus, Pencil, Trash2, ExternalLink, Clock, Building2,
  Percent, Copy, Check, Loader2, ImageIcon, X, ShoppingBag, Gift,
  Calendar, AlertTriangle, MoreVertical, Eye, EyeOff,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format, isPast } from "date-fns";

function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

interface DiscountCodeItem {
  id: number;
  clubId: number;
  code: string;
  description: string | null;
  discountPercent: number | null;
  shopName: string | null;
  shopUrl: string | null;
  imageUrl: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdBy: number | null;
  createdAt: string;
  assignments?: Array<{ id: number; userId: number | null; appliesToAll: boolean; fullName: string | null }>;
}

interface MemberDiscountGroup {
  clubId: number;
  clubName: string;
  codes: Array<{
    codeId: number;
    code: string;
    description: string | null;
    discountPercent: number | null;
    shopName: string | null;
    shopUrl: string | null;
    imageUrl: string | null;
    validUntil: string | null;
    clubId: number;
    clubName: string | null;
  }>;
}

export default function Deals() {
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<number | null>(null);
  const [selectedAdminClub, setSelectedAdminClub] = useState<string>("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<DiscountCodeItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPercent, setFormPercent] = useState("");
  const [formShopName, setFormShopName] = useState("");
  const [formShopUrl, setFormShopUrl] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formValidUntil, setFormValidUntil] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formClubId, setFormClubId] = useState<string>("");
  const [formAppliesToAll, setFormAppliesToAll] = useState(true);

  const canManage = adminClubs && adminClubs.length > 0;
  const managedClubIds = useMemo(() => new Set(adminClubs?.map((c: any) => c.id) || []), [adminClubs]);

  const { data: memberDeals = [], isLoading: memberLoading } = useQuery<MemberDiscountGroup[]>({
    queryKey: ["/api/my-discount-codes"],
  });

  const adminClubId = selectedAdminClub === "all" ? adminClubs?.[0]?.id : Number(selectedAdminClub);
  const adminQueryUrl = adminClubId ? `/api/clubs/${adminClubId}/discount-codes` : null;

  const { data: adminDeals = [], isLoading: adminLoading } = useQuery<DiscountCodeItem[]>({
    queryKey: [adminQueryUrl],
    enabled: !!adminQueryUrl && activeTab === "manage",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", `/api/clubs/${data.clubId}/discount-codes`, data);
      return res.json();
    },
    onSuccess: (newCode: any) => {
      if (formAppliesToAll) {
        assignMutation.mutate({ codeId: newCode.id, appliesToAll: true, userIds: [] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
      toast({ title: "Deal Created", description: "New discount has been added." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const res = await apiRequest("PATCH", `/api/discount-codes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
      toast({ title: "Deal Updated", description: "Discount has been updated." });
      closeDialog();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/discount-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
      toast({ title: "Deal Deleted", description: "Discount has been removed." });
      setDeleteConfirmId(null);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ codeId, appliesToAll, userIds }: { codeId: number; appliesToAll: boolean; userIds: number[] }) => {
      const res = await apiRequest("POST", `/api/discount-codes/${codeId}/assign`, { appliesToAll, userIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-discount-codes"] });
      if (adminQueryUrl) queryClient.invalidateQueries({ queryKey: [adminQueryUrl] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingDeal(null);
    setFormCode("");
    setFormDescription("");
    setFormPercent("");
    setFormShopName("");
    setFormShopUrl("");
    setFormImageUrl("");
    setFormValidUntil("");
    setFormIsActive(true);
    setFormClubId("");
    setFormAppliesToAll(true);
  };

  const openCreate = () => {
    closeDialog();
    if (adminClubs && adminClubs.length > 0) {
      setFormClubId(String(adminClubs[0].id));
    }
    setDialogOpen(true);
  };

  const openEdit = (deal: DiscountCodeItem) => {
    setEditingDeal(deal);
    setFormCode(deal.code);
    setFormDescription(deal.description || "");
    setFormPercent(deal.discountPercent ? String(deal.discountPercent) : "");
    setFormShopName(deal.shopName || "");
    setFormShopUrl(deal.shopUrl || "");
    setFormImageUrl(deal.imageUrl || "");
    setFormValidUntil(deal.validUntil ? format(new Date(deal.validUntil), "yyyy-MM-dd") : "");
    setFormIsActive(deal.isActive);
    setFormClubId(String(deal.clubId));
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formCode.trim()) {
      toast({ title: "Error", description: "Code is required.", variant: "destructive" });
      return;
    }
    const payload: any = {
      code: formCode.trim().toUpperCase(),
    };
    if (formDescription.trim()) payload.description = formDescription.trim();
    if (formPercent) payload.discountPercent = parseInt(formPercent);
    if (formShopName.trim()) payload.shopName = formShopName.trim();
    if (formShopUrl.trim()) payload.shopUrl = formShopUrl.trim();
    if (formImageUrl.trim()) payload.imageUrl = formImageUrl.trim();
    if (formValidUntil) payload.validUntil = formValidUntil;
    if (editingDeal) {
      if (!formDescription.trim()) payload.description = null;
      if (!formPercent) payload.discountPercent = null;
      if (!formShopName.trim()) payload.shopName = null;
      if (!formShopUrl.trim()) payload.shopUrl = null;
      if (!formImageUrl.trim()) payload.imageUrl = null;
      if (!formValidUntil) payload.validUntil = null;
      payload.isActive = formIsActive;
      updateMutation.mutate({ id: editingDeal.id, ...payload });
    } else {
      payload.clubId = parseInt(formClubId);
      createMutation.mutate(payload);
    }
  };

  const copyCode = (code: string, id: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast({ title: "Copied!", description: `Code "${code}" copied to clipboard.` });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const allMemberCodes = useMemo(() => {
    return memberDeals.flatMap(g => g.codes.map(c => ({ ...c, clubName: g.clubName })));
  }, [memberDeals]);

  const filteredMemberCodes = useMemo(() => {
    if (!searchQuery.trim()) return allMemberCodes;
    const q = searchQuery.toLowerCase();
    return allMemberCodes.filter(c =>
      c.code.toLowerCase().includes(q) ||
      (c.description && c.description.toLowerCase().includes(q)) ||
      (c.shopName && c.shopName.toLowerCase().includes(q)) ||
      (c.clubName && c.clubName.toLowerCase().includes(q))
    );
  }, [allMemberCodes, searchQuery]);

  const filteredAdminDeals = useMemo(() => {
    if (!searchQuery.trim()) return adminDeals;
    const q = searchQuery.toLowerCase();
    return adminDeals.filter(d =>
      d.code.toLowerCase().includes(q) ||
      (d.description && d.description.toLowerCase().includes(q)) ||
      (d.shopName && d.shopName.toLowerCase().includes(q))
    );
  }, [adminDeals, searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-deals-title">
              <Tag className="h-6 w-6 text-primary" />
              Deals & Offers
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Exclusive discounts and vouchers from your clubs
            </p>
          </div>
          {canManage && (
            <Button onClick={openCreate} data-testid="button-add-deal">
              <Plus className="h-4 w-4 mr-1" />
              Add Deal
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals, shops, clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-deals"
          />
        </div>

        {canManage ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList data-testid="tabs-deals">
              <TabsTrigger value="browse" data-testid="tab-browse">
                <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                Browse
              </TabsTrigger>
              <TabsTrigger value="manage" data-testid="tab-manage">
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Manage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="browse" className="mt-4">
              <MemberDealsView
                codes={filteredMemberCodes}
                isLoading={memberLoading}
                copiedCode={copiedCode}
                onCopy={copyCode}
              />
            </TabsContent>

            <TabsContent value="manage" className="mt-4">
              <div className="space-y-4">
                {adminClubs && adminClubs.length > 1 && (
                  <Select value={selectedAdminClub} onValueChange={setSelectedAdminClub}>
                    <SelectTrigger className="w-64" data-testid="select-admin-club">
                      <SelectValue placeholder="Select club" />
                    </SelectTrigger>
                    <SelectContent>
                      {adminClubs.map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <AdminDealsView
                  deals={filteredAdminDeals}
                  isLoading={adminLoading}
                  onEdit={openEdit}
                  onDelete={setDeleteConfirmId}
                  onToggleActive={(deal) => updateMutation.mutate({ id: deal.id, isActive: !deal.isActive })}
                />
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <MemberDealsView
            codes={filteredMemberCodes}
            isLoading={memberLoading}
            copiedCode={copiedCode}
            onCopy={copyCode}
          />
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDeal ? "Edit Deal" : "Add New Deal"}</DialogTitle>
            <DialogDescription>
              {editingDeal ? "Update the discount or offer details." : "Create a new discount code or offer for your members."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingDeal && adminClubs && adminClubs.length > 1 && (
              <div className="space-y-1.5">
                <Label>Club</Label>
                <Select value={formClubId} onValueChange={setFormClubId}>
                  <SelectTrigger data-testid="select-form-club">
                    <SelectValue placeholder="Select club" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Code *</Label>
                <Input
                  placeholder="e.g. SUMMER25"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  data-testid="input-form-code"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  placeholder="e.g. 20"
                  value={formPercent}
                  onChange={(e) => setFormPercent(e.target.value)}
                  data-testid="input-form-percent"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Describe the offer..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                data-testid="input-form-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Shop / Brand Name</Label>
                <Input
                  placeholder="e.g. Yonex UK"
                  value={formShopName}
                  onChange={(e) => setFormShopName(e.target.value)}
                  data-testid="input-form-shop-name"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shop URL</Label>
                <Input
                  placeholder="https://..."
                  value={formShopUrl}
                  onChange={(e) => setFormShopUrl(e.target.value)}
                  data-testid="input-form-shop-url"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Image URL</Label>
              <Input
                placeholder="https://... (product or brand image)"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                data-testid="input-form-image-url"
              />
              {formImageUrl && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-border/50 h-32">
                  <img
                    src={formImageUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 bg-background/80"
                    onClick={() => setFormImageUrl("")}
                    data-testid="button-clear-image"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valid Until</Label>
                <Input
                  type="date"
                  value={formValidUntil}
                  onChange={(e) => setFormValidUntil(e.target.value)}
                  data-testid="input-form-valid-until"
                />
              </div>
              {editingDeal && (
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={formIsActive}
                      onCheckedChange={setFormIsActive}
                      data-testid="switch-form-active"
                    />
                    <Label className="text-sm">{formIsActive ? "Active" : "Inactive"}</Label>
                  </div>
                </div>
              )}
            </div>
            {!editingDeal && (
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  checked={formAppliesToAll}
                  onCheckedChange={setFormAppliesToAll}
                  data-testid="switch-form-applies-all"
                />
                <Label className="text-sm">Available to all club members</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-deal">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-deal"
            >
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingDeal ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Deal</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this deal? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberDealsView({ codes, isLoading, copiedCode, onCopy }: {
  codes: Array<any>;
  isLoading: boolean;
  copiedCode: number | null;
  onCopy: (code: string, id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (codes.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Gift className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold">No Deals Available</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            There are no active discounts or offers for your clubs right now. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {codes.map((deal) => {
        const isExpired = deal.validUntil && isPast(new Date(deal.validUntil));
        return (
          <Card
            key={deal.codeId}
            className={`overflow-hidden transition-shadow hover:shadow-md ${isExpired ? "opacity-60" : ""}`}
            data-testid={`card-deal-${deal.codeId}`}
          >
            {isSafeUrl(deal.imageUrl) && (
              <div className="relative h-36 bg-muted/30">
                <img
                  src={deal.imageUrl!}
                  alt={deal.shopName || deal.code}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                {deal.discountPercent && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-sm font-bold shadow-lg">
                    {deal.discountPercent}% OFF
                  </div>
                )}
              </div>
            )}
            <CardContent className={`${deal.imageUrl ? "pt-3" : "pt-5"} pb-4 px-4 space-y-3`}>
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  {deal.shopName && (
                    <p className="text-sm font-semibold text-foreground truncate">{deal.shopName}</p>
                  )}
                  {!deal.imageUrl && deal.discountPercent && (
                    <div className="flex items-center gap-1">
                      <Percent className="h-4 w-4 text-primary" />
                      <span className="text-xl font-bold text-primary">{deal.discountPercent}% OFF</span>
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  <Building2 className="h-3 w-3 mr-0.5" />
                  {deal.clubName}
                </Badge>
              </div>

              {deal.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{deal.description}</p>
              )}

              <div
                className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => onCopy(deal.code, deal.codeId)}
                data-testid={`button-copy-code-${deal.codeId}`}
              >
                <span className="font-mono text-sm font-bold tracking-wider flex-1">{deal.code}</span>
                {copiedCode === deal.codeId ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                {deal.validUntil ? (
                  <span className={`flex items-center gap-1 ${isExpired ? "text-red-500" : ""}`}>
                    <Calendar className="h-3 w-3" />
                    {isExpired ? "Expired" : `Until ${format(new Date(deal.validUntil), "dd MMM yyyy")}`}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    No expiry
                  </span>
                )}
                {isSafeUrl(deal.shopUrl) && (
                  <a
                    href={deal.shopUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-primary hover:underline"
                    data-testid={`link-shop-${deal.codeId}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                    Visit Shop
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function AdminDealsView({ deals, isLoading, onEdit, onDelete, onToggleActive }: {
  deals: DiscountCodeItem[];
  isLoading: boolean;
  onEdit: (deal: DiscountCodeItem) => void;
  onDelete: (id: number) => void;
  onToggleActive: (deal: DiscountCodeItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Tag className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold">No Deals Yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first discount or offer for your club members.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {deals.map((deal) => {
        const isExpired = deal.validUntil && isPast(new Date(deal.validUntil));
        const assignedTo = deal.assignments?.filter(a => a.appliesToAll) || [];
        const isGlobal = assignedTo.length > 0;
        return (
          <Card
            key={deal.id}
            className={`${!deal.isActive ? "opacity-50" : ""}`}
            data-testid={`card-admin-deal-${deal.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {isSafeUrl(deal.imageUrl) && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted/30 flex-shrink-0">
                    <img
                      src={deal.imageUrl!}
                      alt={deal.code}
                      className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-sm tracking-wider">{deal.code}</span>
                    {deal.discountPercent && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">{deal.discountPercent}% OFF</Badge>
                    )}
                    {!deal.isActive && (
                      <Badge variant="secondary" className="text-[10px]">
                        <EyeOff className="h-3 w-3 mr-0.5" />Inactive
                      </Badge>
                    )}
                    {isExpired && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle className="h-3 w-3 mr-0.5" />Expired
                      </Badge>
                    )}
                    {isGlobal && (
                      <Badge variant="outline" className="text-[10px] text-green-600 border-green-300">All Members</Badge>
                    )}
                  </div>
                  {deal.shopName && (
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">{deal.shopName}</p>
                  )}
                  {deal.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{deal.description}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    {deal.validUntil && (
                      <span className="flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        Until {format(new Date(deal.validUntil), "dd MMM yyyy")}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      Created {format(new Date(deal.createdAt), "dd MMM yyyy")}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-deal-menu-${deal.id}`}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onEdit(deal)} data-testid={`button-edit-deal-${deal.id}`}>
                      <Pencil className="h-3.5 w-3.5 mr-2" />Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleActive(deal)} data-testid={`button-toggle-deal-${deal.id}`}>
                      {deal.isActive ? <EyeOff className="h-3.5 w-3.5 mr-2" /> : <Eye className="h-3.5 w-3.5 mr-2" />}
                      {deal.isActive ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(deal.id)}
                      className="text-red-600"
                      data-testid={`button-delete-deal-${deal.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
