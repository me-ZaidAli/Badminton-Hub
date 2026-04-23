import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, Plus, Pencil, Trash2, Loader2, ShoppingBag, Package, AlertTriangle,
  PoundSterling, Clock, Building2, Image as ImageIcon, ChevronRight, ChevronLeft,
  Eye, Filter, Check, X, RefreshCw, MoreHorizontal, History,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ClubLite = { id: number; name: string };
type SummaryData = { totalOrders: number; pendingOrders: number; unpaidOrders: number; revenuePence: number; lowStockCount: number; newOrdersCount: number };
type Variation = { size?: string | null; color?: string | null; stock: number };
type AdminProduct = {
  id: number; clubId: number; ownerClubName: string; name: string; description: string | null;
  shortDescription: string | null; imageUrl: string | null; price: number | null;
  categoryName: string | null; sizes: string[] | null; genders: string[] | null;
  styles: string[] | null; tags: string[] | null; status: string; isFeatured: boolean;
  stock: number; lowStockThreshold: number; variations: Variation[]; assignedClubIds: number[];
  assignedClubNames: string[]; totalOrders: number; unitsOrdered: number; isLowStock: boolean;
  createdAt: string;
};
type AdminOrderRow = {
  id: number; clubId: number; productId: number; userId: number; quantity: number;
  size: string | null; gender: string | null; style: string | null; variationLabel: string | null;
  status: string; paymentStatus: string; notes: string | null; adminNotes: string | null;
  productName: string; productImage: string | null; productStock: number;
  userName: string; userEmail: string; userPhone: string | null; clubName: string;
  unitPrice: number; totalPrice: number; isNew: boolean;
  createdAt: string; updatedAt: string;
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "New", color: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400" },
  approved: { label: "Processing", color: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400" },
  ready: { label: "Ready for Collection", color: "bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400" },
  collected: { label: "Completed", color: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400" },
  cancelled: { label: "Cancelled", color: "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400" },
};

const ALL_STATUSES = ["pending", "approved", "ready", "collected", "cancelled"] as const;
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const GENDER_OPTIONS = ["Male", "Female", "Unisex"];

const formatPrice = (pence: number | null | undefined) => `£${(((pence || 0) / 100)).toFixed(2)}`;

function StatusBadge({ status }: { status: string }) {
  const info = STATUS_LABELS[status] || { label: status, color: "bg-slate-100 text-slate-700" };
  return <Badge variant="outline" className={cn("font-medium", info.color)} data-testid={`status-${status}`}>{info.label}</Badge>;
}

function PaymentBadge({ paymentStatus }: { paymentStatus: string }) {
  const isPaid = paymentStatus === "Paid";
  return (
    <Badge variant="outline" className={isPaid
      ? "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400"
      : "bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/30 dark:text-rose-400"} data-testid={`payment-${paymentStatus.toLowerCase()}`}>
      {isPaid ? <Check className="w-3 h-3 mr-1" /> : <X className="w-3 h-3 mr-1" />} {paymentStatus}
    </Badge>
  );
}

export default function MerchandiseAdmin() {
  const { toast } = useToast();
  const [tab, setTab] = useState<"products" | "orders">("products");
  const [clubFilter, setClubFilter] = useState<string>("all");

  // Mark seen on mount
  useEffect(() => {
    apiRequest("POST", "/api/admin/merchandise/mark-seen").then(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchandise/new-count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/merchandise/summary"] });
    }).catch(() => {});
  }, []);

  const clubsQ = useQuery<{ clubs: ClubLite[]; isGodMode: boolean }>({ queryKey: ["/api/admin/merchandise/clubs"] });
  const isGodMode = clubsQ.data?.isGodMode ?? false;
  const clubs = clubsQ.data?.clubs || [];

  const summaryQ = useQuery<SummaryData>({
    queryKey: ["/api/admin/merchandise/summary", clubFilter],
    queryFn: async () => {
      const url = `/api/admin/merchandise/summary${clubFilter !== "all" ? `?clubId=${clubFilter}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      return r.json();
    },
  });

  const invalidateAll = () =>
    queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/admin/merchandise") });

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-7 h-7 text-violet-500" /> Merchandise Manager
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isGodMode ? "GOD MODE • Manage products and orders across all clubs" : `Manage merchandise for ${clubs.length} club${clubs.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {clubs.length > 1 && (
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="w-[200px]" data-testid="filter-club">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clubs</SelectItem>
                {clubs.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={() => invalidateAll()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard icon={ShoppingBag} label="Total Orders" value={summaryQ.data?.totalOrders ?? 0} color="text-blue-500" bg="bg-blue-500/10" />
        <SummaryCard icon={Clock} label="Pending" value={summaryQ.data?.pendingOrders ?? 0} color="text-amber-500" bg="bg-amber-500/10" highlight={(summaryQ.data?.pendingOrders ?? 0) > 0} />
        <SummaryCard icon={X} label="Unpaid" value={summaryQ.data?.unpaidOrders ?? 0} color="text-rose-500" bg="bg-rose-500/10" highlight={(summaryQ.data?.unpaidOrders ?? 0) > 0} />
        <SummaryCard icon={PoundSterling} label="Revenue (Paid)" value={formatPrice(summaryQ.data?.revenuePence)} color="text-emerald-500" bg="bg-emerald-500/10" />
        <SummaryCard icon={AlertTriangle} label="Low Stock" value={summaryQ.data?.lowStockCount ?? 0} color="text-orange-500" bg="bg-orange-500/10" highlight={(summaryQ.data?.lowStockCount ?? 0) > 0} />
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="products" data-testid="tab-products"><Package className="w-4 h-4 mr-2" /> Products</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">
            <ShoppingBag className="w-4 h-4 mr-2" /> Orders
            {(summaryQ.data?.newOrdersCount ?? 0) > 0 && (
              <Badge className="ml-2 bg-rose-500 text-white border-0" data-testid="badge-new-orders">{summaryQ.data?.newOrdersCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <ProductsPanel clubs={clubs} isGodMode={isGodMode} clubFilter={clubFilter} onMutate={invalidateAll} />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersPanel clubs={clubs} isGodMode={isGodMode} clubFilter={clubFilter} onMutate={invalidateAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg, highlight }: { icon: any; label: string; value: any; color: string; bg: string; highlight?: boolean }) {
  return (
    <Card className={cn("transition-all hover-elevate", highlight && "ring-2 ring-offset-1 ring-current")} data-testid={`card-summary-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <div className={cn("p-1.5 rounded-md", bg)}><Icon className={cn("w-4 h-4", color)} /></div>
        </div>
        <div className={cn("text-2xl font-bold", highlight && color)}>{value}</div>
      </CardContent>
    </Card>
  );
}

/* ============================ PRODUCTS ============================ */

function ProductsPanel({ clubs, isGodMode, clubFilter, onMutate }: { clubs: ClubLite[]; isGodMode: boolean; clubFilter: string; onMutate: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const productsQ = useQuery<AdminProduct[]>({
    queryKey: ["/api/admin/merchandise/products", clubFilter],
    queryFn: async () => {
      const url = `/api/admin/merchandise/products${clubFilter !== "all" ? `?clubId=${clubFilter}` : ""}`;
      const r = await fetch(url, { credentials: "include" });
      return r.json();
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/merchandise/products/${id}`),
    onSuccess: () => { toast({ title: "Product deleted" }); setDeleteId(null); onMutate(); },
    onError: (e: any) => toast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let rows = productsQ.data || [];
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(p => p.name.toLowerCase().includes(s) || (p.categoryName || "").toLowerCase().includes(s) || p.ownerClubName.toLowerCase().includes(s));
    }
    if (statusFilter !== "all") rows = rows.filter(p => p.status === statusFilter);
    if (showLowOnly) rows = rows.filter(p => p.isLowStock);
    return rows;
  }, [productsQ.data, search, statusFilter, showLowOnly]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search products, category, club…" value={search} onChange={e => setSearch(e.target.value)} data-testid="input-search-products" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="filter-product-status"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="out_of_stock">Out of stock</SelectItem>
            <SelectItem value="discontinued">Discontinued</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={showLowOnly ? "default" : "outline"} onClick={() => setShowLowOnly(v => !v)} data-testid="button-low-stock-filter">
          <AlertTriangle className="w-4 h-4 mr-2" /> Low stock
        </Button>
        <Button onClick={() => setCreating(true)} data-testid="button-new-product">
          <Plus className="w-4 h-4 mr-2" /> New Product
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Owner club</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQ.isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
              )}
              {!productsQ.isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No products found</TableCell></TableRow>
              )}
              {filtered.map(p => (
                <TableRow key={p.id} className={cn(p.isLowStock && "bg-orange-50/50 dark:bg-orange-900/10")} data-testid={`row-product-${p.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate" data-testid={`text-product-name-${p.id}`}>{p.name}</div>
                        <div className="text-xs text-muted-foreground">{p.categoryName || "—"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.ownerClubName}</TableCell>
                  <TableCell className="text-sm">{p.assignedClubNames.length > 0 ? p.assignedClubNames.join(", ") : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell>{formatPrice(p.price)}</TableCell>
                  <TableCell>
                    <span className={cn("font-semibold", p.isLowStock && "text-orange-600 dark:text-orange-400")}>{p.stock}</span>
                    {p.isLowStock && <AlertTriangle className="w-3 h-3 inline ml-1 text-orange-500" />}
                    {(p.variations?.length || 0) > 0 && <div className="text-xs text-muted-foreground">{p.variations.length} variation{p.variations.length === 1 ? "" : "s"}</div>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={p.status === "active" ? "border-emerald-300 text-emerald-700" : ""}>{p.status}</Badge></TableCell>
                  <TableCell>{p.totalOrders} <span className="text-xs text-muted-foreground">({p.unitsOrdered} units)</span></TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(p)} data-testid={`button-edit-product-${p.id}`}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)} data-testid={`button-delete-product-${p.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {(creating || editing) && (
        <ProductDialog
          clubs={clubs} isGodMode={isGodMode} initial={editing} clubFilter={clubFilter}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); onMutate(); }}
        />
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this product?</DialogTitle>
            <DialogDescription>This will also delete all orders linked to this product. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMut.mutate(deleteId)} disabled={deleteMut.isPending} data-testid="button-confirm-delete-product">
              {deleteMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProductDialog({ clubs, isGodMode, initial, clubFilter, onClose, onSaved }: {
  clubs: ClubLite[]; isGodMode: boolean; initial: AdminProduct | null; clubFilter: string;
  onClose: () => void; onSaved: () => void;
}) {
  const { toast } = useToast();
  const defaultClub = initial?.clubId ?? (clubFilter !== "all" ? Number(clubFilter) : clubs[0]?.id) ?? 0;
  const [ownerClubId, setOwnerClubId] = useState<number>(defaultClub);
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription || "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [price, setPrice] = useState(initial ? String((initial.price ?? 0) / 100) : "");
  const [categoryName, setCategoryName] = useState(initial?.categoryName || "Other");
  const [sizes, setSizes] = useState<string[]>(initial?.sizes || []);
  const [genders, setGenders] = useState<string[]>(initial?.genders || ["Unisex"]);
  const [tags, setTags] = useState<string>((initial?.tags || []).join(", "));
  const [status, setStatus] = useState(initial?.status || "active");
  const [isFeatured, setIsFeatured] = useState(initial?.isFeatured || false);
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(String(initial?.lowStockThreshold ?? 5));
  const [variations, setVariations] = useState<Variation[]>(initial?.variations || []);
  const [assignedClubIds, setAssignedClubIds] = useState<number[]>(initial?.assignedClubIds || []);

  const handleImageFile = async (file: File) => {
    if (file.size > 1.5 * 1024 * 1024) { toast({ title: "Image too large", description: "Please use under 1.5 MB", variant: "destructive" }); return; }
    const reader = new FileReader();
    reader.onload = () => setImageUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        ownerClubId,
        name: name.trim(),
        description: description || null,
        shortDescription: shortDescription || null,
        imageUrl: imageUrl || null,
        price: price ? Math.round(parseFloat(price) * 100) : null,
        categoryName: categoryName || "Other",
        sizes, genders,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        status, isFeatured,
        stock: parseInt(stock) || 0,
        lowStockThreshold: parseInt(lowStockThreshold) || 0,
        variations,
        assignedClubIds,
      };
      if (initial) {
        const r = await apiRequest("PATCH", `/api/admin/merchandise/products/${initial.id}`, payload);
        return r.json();
      }
      const r = await apiRequest("POST", "/api/admin/merchandise/products", payload);
      return r.json();
    },
    onSuccess: () => { toast({ title: initial ? "Product updated" : "Product created" }); onSaved(); },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const toggleSize = (s: string) => setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const toggleGender = (g: string) => setGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const toggleAssignedClub = (id: number) => setAssignedClubIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit Product" : "Create Product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Owner Club</Label>
              <Select value={String(ownerClubId)} onValueChange={(v) => setOwnerClubId(Number(v))}>
                <SelectTrigger data-testid="select-owner-club"><SelectValue /></SelectTrigger>
                <SelectContent>{clubs.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="out_of_stock">Out of stock</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} data-testid="input-product-name" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Category</Label>
              <Input value={categoryName} onChange={e => setCategoryName(e.target.value)} data-testid="input-category" />
            </div>
            <div>
              <Label>Price (£)</Label>
              <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} data-testid="input-price" />
            </div>
          </div>

          <div>
            <Label>Short description</Label>
            <Input value={shortDescription} onChange={e => setShortDescription(e.target.value)} data-testid="input-short-desc" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} data-testid="input-description" />
          </div>

          <div>
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              {imageUrl && <img src={imageUrl} alt="" className="w-16 h-16 object-cover rounded border" />}
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://… or upload" className="flex-1" data-testid="input-image-url" />
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span><ImageIcon className="w-4 h-4 mr-2" />Upload</span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])} data-testid="input-image-file" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Total stock</Label>
              <Input type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} data-testid="input-stock" />
            </div>
            <div>
              <Label>Low stock alert at</Label>
              <Input type="number" min="0" value={lowStockThreshold} onChange={e => setLowStockThreshold(e.target.value)} data-testid="input-low-stock" />
            </div>
          </div>

          <div>
            <Label>Sizes</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {SIZE_OPTIONS.map(s => (
                <Button key={s} type="button" size="sm" variant={sizes.includes(s) ? "default" : "outline"} onClick={() => toggleSize(s)} data-testid={`toggle-size-${s}`}>{s}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label>Genders</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {GENDER_OPTIONS.map(g => (
                <Button key={g} type="button" size="sm" variant={genders.includes(g) ? "default" : "outline"} onClick={() => toggleGender(g)} data-testid={`toggle-gender-${g}`}>{g}</Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="New, Limited, Best Seller" data-testid="input-tags" />
          </div>

          <div className="border rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label className="m-0">Variations (optional, with own stock)</Label>
              <Button type="button" size="sm" variant="outline" onClick={() => setVariations(v => [...v, { size: "", color: "", stock: 0 }])} data-testid="button-add-variation">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
            {variations.length === 0 && <p className="text-xs text-muted-foreground">No variations. Total stock above will be used.</p>}
            {variations.map((v, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4"><Label className="text-xs">Size</Label><Input value={v.size || ""} onChange={e => setVariations(arr => arr.map((x, idx) => idx === i ? { ...x, size: e.target.value } : x))} data-testid={`input-var-size-${i}`} /></div>
                <div className="col-span-4"><Label className="text-xs">Colour</Label><Input value={v.color || ""} onChange={e => setVariations(arr => arr.map((x, idx) => idx === i ? { ...x, color: e.target.value } : x))} data-testid={`input-var-color-${i}`} /></div>
                <div className="col-span-3"><Label className="text-xs">Stock</Label><Input type="number" min="0" value={v.stock} onChange={e => setVariations(arr => arr.map((x, idx) => idx === i ? { ...x, stock: parseInt(e.target.value) || 0 } : x))} data-testid={`input-var-stock-${i}`} /></div>
                <div className="col-span-1"><Button type="button" variant="ghost" size="icon" onClick={() => setVariations(arr => arr.filter((_, idx) => idx !== i))} data-testid={`button-remove-variation-${i}`}><Trash2 className="w-4 h-4" /></Button></div>
              </div>
            ))}
          </div>

          {clubs.length > 1 && (
            <div className="border rounded-md p-3 space-y-2">
              <Label>Assign to additional clubs</Label>
              <p className="text-xs text-muted-foreground">{isGodMode ? "GOD MODE: assign to any club" : "You can only assign to clubs you manage"}</p>
              <div className="grid grid-cols-2 gap-2">
                {clubs.filter(c => c.id !== ownerClubId).map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={assignedClubIds.includes(c.id)} onCheckedChange={() => toggleAssignedClub(c.id)} data-testid={`check-club-${c.id}`} />
                    {c.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} data-testid="switch-featured" />
            <Label>Featured product</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => saveMut.mutate()} disabled={!name || !ownerClubId || saveMut.isPending} data-testid="button-save-product">
            {saveMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {initial ? "Save Changes" : "Create Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ ORDERS ============================ */

function OrdersPanel({ clubs, isGodMode, clubFilter, onMutate }: { clubs: ClubLite[]; isGodMode: boolean; clubFilter: string; onMutate: () => void }) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [openOrderId, setOpenOrderId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const params = new URLSearchParams();
  if (clubFilter !== "all") params.set("clubId", clubFilter);
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (paymentFilter !== "all") params.set("payment", paymentFilter);
  if (search) params.set("search", search);
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  params.set("sortBy", sortBy); params.set("sortDir", sortDir);
  params.set("page", String(page)); params.set("pageSize", String(pageSize));

  const ordersQ = useQuery<{ rows: AdminOrderRow[]; total: number }>({
    queryKey: ["/api/admin/merchandise/orders", params.toString()],
    queryFn: async () => {
      const r = await fetch(`/api/admin/merchandise/orders?${params.toString()}`, { credentials: "include" });
      return r.json();
    },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...patch }: any) => {
      const r = await apiRequest("PATCH", `/api/admin/merchandise/orders/${id}`, patch);
      return r.json();
    },
    onSuccess: () => { toast({ title: "Order updated" }); onMutate(); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/merchandise/orders/${id}`),
    onSuccess: () => { toast({ title: "Order deleted" }); setDeleteId(null); onMutate(); },
  });

  const bulkMut = useMutation({
    mutationFn: async (payload: any) => {
      const r = await apiRequest("POST", "/api/admin/merchandise/orders/bulk", payload);
      return r.json();
    },
    onSuccess: (d: any) => { toast({ title: `${d.count} order${d.count === 1 ? "" : "s"} updated` }); setSelected(new Set()); onMutate(); },
    onError: (e: any) => toast({ title: "Bulk action failed", description: e.message, variant: "destructive" }),
  });

  const allSelected = (ordersQ.data?.rows.length ?? 0) > 0 && (ordersQ.data?.rows.every(r => selected.has(r.id)) ?? false);
  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(ordersQ.data?.rows.map(r => r.id) || []));
  };

  const totalPages = Math.max(1, Math.ceil((ordersQ.data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by player, product, club, order id…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} data-testid="input-search-orders" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-[170px]" data-testid="filter-order-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={(v) => { setPaymentFilter(v); setPage(1); }}>
          <SelectTrigger className="w-full lg:w-[140px]" data-testid="filter-payment"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="Paid">Paid</SelectItem>
            <SelectItem value="Unpaid">Unpaid</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-full lg:w-auto" data-testid="filter-date-from" />
        <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-full lg:w-auto" data-testid="filter-date-to" />
      </div>

      {selected.size > 0 && (
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{selected.size} selected</span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ orderIds: Array.from(selected), action: "MARK_PAID" })} data-testid="button-bulk-paid">Mark Paid</Button>
            <Button size="sm" variant="outline" onClick={() => bulkMut.mutate({ orderIds: Array.from(selected), action: "MARK_UNPAID" })} data-testid="button-bulk-unpaid">Mark Unpaid</Button>
            <Select onValueChange={(v) => bulkMut.mutate({ orderIds: Array.from(selected), action: "SET_STATUS", nextStatus: v })}>
              <SelectTrigger className="w-[170px] h-8"><SelectValue placeholder="Set status" /></SelectTrigger>
              <SelectContent>
                {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="destructive" onClick={() => bulkMut.mutate({ orderIds: Array.from(selected), action: "DELETE" })} data-testid="button-bulk-delete"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}><X className="w-4 h-4" /></Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} data-testid="check-all-orders" /></TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortBy("id"); setSortDir(d => d === "asc" ? "desc" : "asc"); }}>#</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Variation</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer" onClick={() => { setSortBy("createdAt"); setSortDir(d => d === "asc" ? "desc" : "asc"); }}>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersQ.isLoading && (<TableRow><TableCell colSpan={12} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>)}
              {!ordersQ.isLoading && (ordersQ.data?.rows.length ?? 0) === 0 && (
                <TableRow><TableCell colSpan={12} className="text-center py-12 text-muted-foreground">No orders match these filters</TableCell></TableRow>
              )}
              {ordersQ.data?.rows.map(o => (
                <TableRow
                  key={o.id}
                  className={cn(
                    o.isNew && "bg-blue-50/50 dark:bg-blue-900/10",
                    o.paymentStatus === "Unpaid" && o.status !== "cancelled" && "border-l-4 border-l-rose-500",
                  )}
                  data-testid={`row-order-${o.id}`}
                >
                  <TableCell><Checkbox checked={selected.has(o.id)} onCheckedChange={() => setSelected(s => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} data-testid={`check-order-${o.id}`} /></TableCell>
                  <TableCell className="font-mono text-xs">#{o.id}{o.isNew && <Badge className="ml-1 bg-blue-500 text-white border-0 text-[10px] px-1 py-0">NEW</Badge>}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm" data-testid={`text-customer-name-${o.id}`}>{o.userName}</div>
                    <div className="text-xs text-muted-foreground" data-testid={`text-customer-email-${o.id}`}>{o.userEmail}</div>
                    {o.userPhone ? (
                      <a
                        href={`tel:${o.userPhone}`}
                        className="text-xs text-primary hover:underline"
                        data-testid={`text-customer-phone-${o.id}`}
                      >
                        {o.userPhone}
                      </a>
                    ) : (
                      <div className="text-xs text-muted-foreground/60 italic">No phone</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{o.clubName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {o.productImage && <img src={o.productImage} alt="" className="w-7 h-7 object-cover rounded" />}
                      <span className="text-sm">{o.productName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{o.variationLabel || [o.size, o.gender, o.style].filter(Boolean).join(" / ") || "—"}</TableCell>
                  <TableCell>{o.quantity}</TableCell>
                  <TableCell className="font-semibold">{formatPrice(o.totalPrice)}</TableCell>
                  <TableCell><PaymentBadge paymentStatus={o.paymentStatus} /></TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs whitespace-nowrap">{format(new Date(o.createdAt), "dd MMM yy, HH:mm")}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setOpenOrderId(o.id)} data-testid={`button-view-order-${o.id}`} title="View order"><Eye className="w-4 h-4" /></Button>
                      {o.paymentStatus === "Paid" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-[11px] font-semibold border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-400 dark:hover:bg-rose-900/20"
                          onClick={() => updateMut.mutate({ id: o.id, paymentStatus: "Unpaid" })}
                          disabled={updateMut.isPending}
                          data-testid={`button-mark-unpaid-${o.id}`}
                          title="Mark this order as unpaid"
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> Mark Unpaid
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-[11px] font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                          onClick={() => updateMut.mutate({ id: o.id, paymentStatus: "Paid" })}
                          disabled={updateMut.isPending}
                          data-testid={`button-mark-paid-${o.id}`}
                          title="Mark this order as paid"
                        >
                          <Check className="w-3.5 h-3.5 mr-1" /> Mark Paid
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(o.id)} data-testid={`button-delete-order-${o.id}`} title="Delete order"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{ordersQ.data?.total ?? 0} orders • Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} data-testid="button-prev-page"><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} data-testid="button-next-page"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>

      {openOrderId !== null && (
        <OrderDetailSheet orderId={openOrderId} onClose={() => setOpenOrderId(null)} onMutate={onMutate} />
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this order?</DialogTitle>
            <DialogDescription>If stock was already deducted, it will be restored. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && deleteMut.mutate(deleteId)} data-testid="button-confirm-delete-order">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderDetailSheet({ orderId, onClose, onMutate }: { orderId: number; onClose: () => void; onMutate: () => void }) {
  const { toast } = useToast();
  const detailQ = useQuery<any>({
    queryKey: ["/api/admin/merchandise/orders", orderId, "detail"],
    queryFn: async () => {
      const r = await fetch(`/api/admin/merchandise/orders/${orderId}`, { credentials: "include" });
      return r.json();
    },
  });
  const order = detailQ.data;

  const [editStatus, setEditStatus] = useState<string>("");
  const [editPayment, setEditPayment] = useState<string>("");
  const [editQty, setEditQty] = useState<string>("");
  const [editAdminNotes, setEditAdminNotes] = useState<string>("");
  const [changeNote, setChangeNote] = useState("");

  useEffect(() => {
    if (order) {
      setEditStatus(order.status);
      setEditPayment(order.paymentStatus);
      setEditQty(String(order.quantity));
      setEditAdminNotes(order.adminNotes || "");
    }
  }, [order?.id]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const patch: any = {};
      if (editStatus !== order.status) patch.status = editStatus;
      if (editPayment !== order.paymentStatus) patch.paymentStatus = editPayment;
      if (parseInt(editQty) !== order.quantity) patch.quantity = parseInt(editQty);
      if (editAdminNotes !== (order.adminNotes || "")) patch.adminNotes = editAdminNotes;
      if (changeNote) patch.note = changeNote;
      const r = await apiRequest("PATCH", `/api/admin/merchandise/orders/${orderId}`, patch);
      return r.json();
    },
    onSuccess: () => { toast({ title: "Order updated" }); detailQ.refetch(); onMutate(); setChangeNote(""); },
    onError: (e: any) => toast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Order #{orderId}</SheetTitle>
        </SheetHeader>
        {detailQ.isLoading || !order ? (
          <div className="py-12 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
        ) : (
          <div className="space-y-5 mt-4">
            <Card><CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-3">
                {order.productImage && <img src={order.productImage} alt="" className="w-14 h-14 object-cover rounded" />}
                <div className="flex-1">
                  <div className="font-semibold">{order.productName}</div>
                  <div className="text-sm text-muted-foreground">{order.clubName}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{formatPrice(order.totalPrice)}</div>
                  <div className="text-xs text-muted-foreground">{formatPrice(order.unitPrice)} × {order.quantity}</div>
                </div>
              </div>
            </CardContent></Card>

            <Card><CardContent className="p-4 space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Player</div>
              <div className="font-medium" data-testid="text-detail-customer-name">{order.userName}</div>
              <div className="text-sm text-muted-foreground" data-testid="text-detail-customer-email">{order.userEmail}</div>
              {order.userPhone ? (
                <a href={`tel:${order.userPhone}`} className="text-sm text-primary hover:underline block" data-testid="text-detail-customer-phone">
                  {order.userPhone}
                </a>
              ) : (
                <div className="text-sm text-muted-foreground/60 italic">No phone on file</div>
              )}
              {order.notes && <div className="text-sm mt-2 p-2 bg-muted rounded"><span className="font-medium">Note:</span> {order.notes}</div>}
              {order.variationLabel && <div className="text-sm mt-1">Variation: <span className="font-medium">{order.variationLabel}</span></div>}
            </CardContent></Card>

            <Card><CardContent className="p-4 space-y-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Edit</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Order Status</Label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger data-testid="select-edit-status"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s].label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Payment Status</Label>
                  <Select value={editPayment} onValueChange={setEditPayment}>
                    <SelectTrigger data-testid="select-edit-payment"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Paid">Paid</SelectItem>
                      <SelectItem value="Unpaid">Unpaid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <Input type="number" min="1" value={editQty} onChange={e => setEditQty(e.target.value)} data-testid="input-edit-qty" />
                </div>
                <div className="text-xs text-muted-foreground self-end pb-2">Stock available: <span className="font-semibold">{order.productStock}</span></div>
              </div>
              <div>
                <Label className="text-xs">Admin notes</Label>
                <Textarea rows={2} value={editAdminNotes} onChange={e => setEditAdminNotes(e.target.value)} data-testid="input-admin-notes" />
              </div>
              <div>
                <Label className="text-xs">Change note (optional)</Label>
                <Input value={changeNote} onChange={e => setChangeNote(e.target.value)} placeholder="e.g. Customer paid in cash" data-testid="input-change-note" />
              </div>
              <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="w-full" data-testid="button-save-order">
                {saveMut.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save changes
              </Button>
            </CardContent></Card>

            <Card><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4" />
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Status timeline</div>
              </div>
              {(!order.history || order.history.length === 0) ? (
                <p className="text-sm text-muted-foreground">No changes yet. Created {format(new Date(order.createdAt), "dd MMM yyyy 'at' HH:mm")}.</p>
              ) : (
                <ol className="space-y-2 border-l-2 border-border ml-2 pl-4">
                  {order.history.map((h: any) => (
                    <li key={h.id} className="relative">
                      <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                      <div className="text-sm">
                        {h.fromStatus && h.fromStatus !== h.toStatus ? (
                          <span><b>{STATUS_LABELS[h.fromStatus]?.label || h.fromStatus}</b> → <b>{STATUS_LABELS[h.toStatus]?.label || h.toStatus}</b></span>
                        ) : (
                          <span><b>{h.paymentChange ? `Payment marked ${h.paymentChange}` : (STATUS_LABELS[h.toStatus]?.label || h.toStatus)}</b></span>
                        )}
                      </div>
                      {h.note && <div className="text-xs text-muted-foreground">{h.note}</div>}
                      <div className="text-xs text-muted-foreground">{format(new Date(h.changedAt), "dd MMM yy, HH:mm")}</div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent></Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
