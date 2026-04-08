import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
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
  Search, Plus, Pencil, Trash2, Loader2, X, ShoppingBag,
  MoreVertical, Eye, EyeOff, Sparkles, Heart, ChevronLeft,
  ArrowRight, FolderOpen, GripVertical, ImageIcon, Package,
  Star, Flame, Check, ShoppingCart, Filter, Clock, Building2,
  Tag, Shirt, BadgeCheck, ChevronDown,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function isSafeUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch { return false; }
}

const GRADIENT_OPTIONS = [
  { value: "from-blue-500 to-indigo-600", label: "Royal Blue" },
  { value: "from-amber-500 to-orange-600", label: "Golden Amber" },
  { value: "from-emerald-500 to-teal-600", label: "Forest Green" },
  { value: "from-violet-500 to-purple-600", label: "Royal Violet" },
  { value: "from-red-500 to-rose-600", label: "Hot Red" },
  { value: "from-pink-500 to-rose-600", label: "Soft Pink" },
  { value: "from-sky-500 to-blue-600", label: "Sky Blue" },
  { value: "from-purple-500 to-fuchsia-600", label: "Neon Purple" },
  { value: "from-teal-500 to-emerald-600", label: "Cool Teal" },
  { value: "from-slate-500 to-zinc-600", label: "Dark Slate" },
  { value: "from-indigo-500 to-violet-600", label: "Deep Indigo" },
  { value: "from-orange-500 to-red-600", label: "Warm Sunset" },
];

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const GENDER_OPTIONS = ["Male", "Female", "Unisex"];
const TAG_OPTIONS = ["New", "Limited", "Best Seller", "Sale", "Exclusive", "Popular"];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "out_of_stock", label: "Out of Stock" },
  { value: "discontinued", label: "Discontinued" },
];
const ORDER_STATUS_OPTIONS = [
  { value: "pending", label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "approved", label: "Approved", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "ready", label: "Ready", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { value: "collected", label: "Collected", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

interface MerchCategory {
  id: number; clubId: number | null; name: string; emoji: string | null; gradient: string | null;
  imageUrl: string | null; sortOrder: number | null; isDefault: boolean; isActive: boolean; createdAt: string;
}
interface MerchProduct {
  id: number; clubId: number; categoryName: string | null; name: string; description: string | null;
  shortDescription: string | null; imageUrl: string | null; price: number | null;
  sizes: string[] | null; genders: string[] | null; styles: string[] | null;
  materials: string | null; specifications: string | null; tags: string[] | null;
  status: string; isFeatured: boolean; sortOrder: number; createdBy: number | null;
  createdAt: string; updatedAt: string;
}
interface MerchOrder {
  id: number; clubId: number; productId: number; userId: number;
  size: string | null; gender: string | null; style: string | null;
  quantity: number; notes: string | null; status: string; adminNotes: string | null;
  createdAt: string; updatedAt: string;
  productName?: string; productImage?: string | null; productCategory?: string | null;
  userName?: string;
}

function getOrderStatusInfo(status: string) {
  return ORDER_STATUS_OPTIONS.find(o => o.value === status) || ORDER_STATUS_OPTIONS[0];
}

export default function MerchandisePage() {
  const { data: user } = useUser();
  const { data: adminClubs } = useMyAdminClubs(!!user);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAdminClub, setSelectedAdminClub] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [savedProducts, setSavedProducts] = useState<Set<number>>(() => {
    try { const s = localStorage.getItem("saved_merch"); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  });

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MerchProduct | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<number | null>(null);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [orderingProduct, setOrderingProduct] = useState<MerchProduct | null>(null);
  const [detailProduct, setDetailProduct] = useState<MerchProduct | null>(null);
  const [editOrderDialogOpen, setEditOrderDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MerchOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [flippedCard, setFlippedCard] = useState<number | null>(null);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<MerchCategory | null>(null);
  const [deleteCatId, setDeleteCatId] = useState<number | null>(null);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formShortDesc, setFormShortDesc] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formCategoryName, setFormCategoryName] = useState("Other");
  const [formSizes, setFormSizes] = useState<string[]>([]);
  const [formGenders, setFormGenders] = useState<string[]>(["Unisex"]);
  const [formStyles, setFormStyles] = useState("");
  const [formMaterials, setFormMaterials] = useState("");
  const [formSpecs, setFormSpecs] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formStatus, setFormStatus] = useState("active");
  const [formFeatured, setFormFeatured] = useState(false);
  const [formClubId, setFormClubId] = useState<string>("");

  const [orderSize, setOrderSize] = useState("");
  const [orderGender, setOrderGender] = useState("");
  const [orderStyle, setOrderStyle] = useState("");
  const [orderQty, setOrderQty] = useState("1");
  const [orderNotes, setOrderNotes] = useState("");

  const [catFormName, setCatFormName] = useState("");
  const [catFormEmoji, setCatFormEmoji] = useState("🛍️");
  const [catFormGradient, setCatFormGradient] = useState("from-purple-500 to-fuchsia-600");
  const [catFormImageUrl, setCatFormImageUrl] = useState("");
  const [catFormSortOrder, setCatFormSortOrder] = useState("99");

  const [editOrderStatus, setEditOrderStatus] = useState("");
  const [editOrderSize, setEditOrderSize] = useState("");
  const [editOrderGender, setEditOrderGender] = useState("");
  const [editOrderStyle, setEditOrderStyle] = useState("");
  const [editOrderQty, setEditOrderQty] = useState("1");
  const [editOrderNotes, setEditOrderNotes] = useState("");
  const [editOrderAdminNotes, setEditOrderAdminNotes] = useState("");

  const canManage = adminClubs && adminClubs.length > 0;
  const adminClubId = selectedAdminClub ? Number(selectedAdminClub) : adminClubs?.[0]?.id;

  const { data: categories = [], isLoading: catsLoading } = useQuery<MerchCategory[]>({ queryKey: ["/api/merchandise-categories"] });
  const { data: allCategories = [] } = useQuery<MerchCategory[]>({ queryKey: ["/api/merchandise-categories/all"], enabled: activeTab === "categories" && !!canManage });
  const { data: products = [], isLoading: productsLoading } = useQuery<MerchProduct[]>({ queryKey: ["/api/merchandise/products"] });
  const { data: myOrders = [] } = useQuery<MerchOrder[]>({ queryKey: ["/api/merchandise/my-orders"] });
  const adminProductsUrl = adminClubId ? `/api/clubs/${adminClubId}/merchandise/products` : null;
  const { data: adminProducts = [] } = useQuery<MerchProduct[]>({ queryKey: [adminProductsUrl], enabled: !!adminProductsUrl && activeTab === "products" });
  const adminOrdersUrl = adminClubId ? `/api/clubs/${adminClubId}/merchandise/orders` : null;
  const { data: adminOrders = [] } = useQuery<MerchOrder[]>({ queryKey: [adminOrdersUrl], enabled: !!adminOrdersUrl && activeTab === "orders" });

  const seedDefaultsMut = useMutation({
    mutationFn: async () => { const r = await apiRequest("POST", "/api/merchandise-categories/seed-defaults"); return r.json(); },
    onSuccess: (d: any) => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories"] }); queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories/all"] }); toast({ title: d.seeded ? "Categories Seeded" : "Already Seeded", description: d.message }); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const createProductMut = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", `/api/clubs/${data.clubId}/merchandise/products`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise/products"] }); if (adminProductsUrl) queryClient.invalidateQueries({ queryKey: [adminProductsUrl] }); toast({ title: "Product Created" }); closeProductDialog(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateProductMut = useMutation({
    mutationFn: async ({ id, ...data }: any) => { const r = await apiRequest("PATCH", `/api/merchandise/products/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise/products"] }); if (adminProductsUrl) queryClient.invalidateQueries({ queryKey: [adminProductsUrl] }); toast({ title: "Product Updated" }); closeProductDialog(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteProductMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/merchandise/products/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise/products"] }); if (adminProductsUrl) queryClient.invalidateQueries({ queryKey: [adminProductsUrl] }); toast({ title: "Product Deleted" }); setDeleteProductId(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const createOrderMut = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/merchandise/orders", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise/my-orders"] }); if (adminOrdersUrl) queryClient.invalidateQueries({ queryKey: [adminOrdersUrl] }); toast({ title: "Request Sent ✅", description: "Your order request has been submitted." }); closeOrderDialog(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateOrderMut = useMutation({
    mutationFn: async ({ id, ...data }: any) => { const r = await apiRequest("PATCH", `/api/merchandise/orders/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise/my-orders"] }); if (adminOrdersUrl) queryClient.invalidateQueries({ queryKey: [adminOrdersUrl] }); toast({ title: "Order Updated" }); setEditOrderDialogOpen(false); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteOrderMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/merchandise/orders/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise/my-orders"] }); if (adminOrdersUrl) queryClient.invalidateQueries({ queryKey: [adminOrdersUrl] }); toast({ title: "Order Deleted" }); setDeleteOrderId(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const createCatMut = useMutation({
    mutationFn: async (data: any) => { const r = await apiRequest("POST", "/api/merchandise-categories", data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories"] }); queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories/all"] }); toast({ title: "Category Created" }); closeCatDialog(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateCatMut = useMutation({
    mutationFn: async ({ id, ...data }: any) => { const r = await apiRequest("PATCH", `/api/merchandise-categories/${id}`, data); return r.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories"] }); queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories/all"] }); toast({ title: "Category Updated" }); closeCatDialog(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteCatMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/merchandise-categories/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories"] }); queryClient.invalidateQueries({ queryKey: ["/api/merchandise-categories/all"] }); toast({ title: "Category Deleted" }); setDeleteCatId(null); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const closeProductDialog = () => { setProductDialogOpen(false); setEditingProduct(null); setFormName(""); setFormDesc(""); setFormShortDesc(""); setFormImageUrl(""); setFormPrice(""); setFormCategoryName("Other"); setFormSizes([]); setFormGenders(["Unisex"]); setFormStyles(""); setFormMaterials(""); setFormSpecs(""); setFormTags([]); setFormStatus("active"); setFormFeatured(false); setFormClubId(""); };
  const closeOrderDialog = () => { setOrderDialogOpen(false); setOrderingProduct(null); setOrderSize(""); setOrderGender(""); setOrderStyle(""); setOrderQty("1"); setOrderNotes(""); };
  const closeCatDialog = () => { setCatDialogOpen(false); setEditingCat(null); setCatFormName(""); setCatFormEmoji("🛍️"); setCatFormGradient("from-purple-500 to-fuchsia-600"); setCatFormImageUrl(""); setCatFormSortOrder("99"); };

  const openCreateProduct = () => { closeProductDialog(); if (adminClubs?.length) setFormClubId(String(adminClubs[0].id)); setProductDialogOpen(true); };
  const openEditProduct = (p: MerchProduct) => { setEditingProduct(p); setFormName(p.name); setFormDesc(p.description || ""); setFormShortDesc(p.shortDescription || ""); setFormImageUrl(p.imageUrl || ""); setFormPrice(p.price ? String(p.price) : ""); setFormCategoryName(p.categoryName || "Other"); setFormSizes(p.sizes || []); setFormGenders(p.genders || ["Unisex"]); setFormStyles((p.styles || []).join(", ")); setFormMaterials(p.materials || ""); setFormSpecs(p.specifications || ""); setFormTags(p.tags || []); setFormStatus(p.status); setFormFeatured(p.isFeatured); setFormClubId(String(p.clubId)); setProductDialogOpen(true); };
  const openOrderProduct = (p: MerchProduct) => { setOrderingProduct(p); if (p.sizes && p.sizes.length > 0) setOrderSize(p.sizes[0]); if (p.genders && p.genders.length > 0) setOrderGender(p.genders[0]); if (p.styles && p.styles.length > 0) setOrderStyle(p.styles[0]); setOrderDialogOpen(true); };
  const openEditOrder = (o: MerchOrder) => { setEditingOrder(o); setEditOrderStatus(o.status); setEditOrderSize(o.size || ""); setEditOrderGender(o.gender || ""); setEditOrderStyle(o.style || ""); setEditOrderQty(String(o.quantity)); setEditOrderNotes(o.notes || ""); setEditOrderAdminNotes(o.adminNotes || ""); setEditOrderDialogOpen(true); };

  const handleSaveProduct = () => {
    if (!formName.trim()) { toast({ title: "Error", description: "Name is required.", variant: "destructive" }); return; }
    const payload: any = { name: formName.trim(), description: formDesc.trim() || null, shortDescription: formShortDesc.trim() || null, imageUrl: formImageUrl.trim() || null, categoryName: formCategoryName, sizes: formSizes, genders: formGenders, styles: formStyles.split(",").map(s => s.trim()).filter(Boolean), materials: formMaterials.trim() || null, specifications: formSpecs.trim() || null, tags: formTags, status: formStatus, isFeatured: formFeatured };
    if (formPrice) payload.price = parseInt(formPrice);
    if (editingProduct) { updateProductMut.mutate({ id: editingProduct.id, ...payload }); }
    else { payload.clubId = parseInt(formClubId); createProductMut.mutate(payload); }
  };
  const handleSubmitOrder = () => {
    if (!orderingProduct) return;
    createOrderMut.mutate({ productId: orderingProduct.id, size: orderSize || null, gender: orderGender || null, style: orderStyle || null, quantity: parseInt(orderQty) || 1, notes: orderNotes.trim() || null });
  };
  const handleSaveOrder = () => {
    if (!editingOrder) return;
    updateOrderMut.mutate({ id: editingOrder.id, status: editOrderStatus, size: editOrderSize || null, gender: editOrderGender || null, style: editOrderStyle || null, quantity: parseInt(editOrderQty) || 1, notes: editOrderNotes || null, adminNotes: editOrderAdminNotes || null });
  };
  const handleSaveCategory = () => {
    if (!catFormName.trim()) { toast({ title: "Error", description: "Name is required.", variant: "destructive" }); return; }
    const payload: any = { name: catFormName.trim(), emoji: catFormEmoji.trim() || "🛍️", gradient: catFormGradient, sortOrder: parseInt(catFormSortOrder) || 99 };
    if (catFormImageUrl.trim()) payload.imageUrl = catFormImageUrl.trim();
    if (editingCat) { if (!catFormImageUrl.trim()) payload.imageUrl = null; updateCatMut.mutate({ id: editingCat.id, ...payload }); }
    else createCatMut.mutate(payload);
  };

  const toggleSaved = useCallback((id: number) => {
    setSavedProducts(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); localStorage.setItem("saved_merch", JSON.stringify([...next])); return next; });
  }, []);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: products.length };
    products.forEach(p => { const cat = p.categoryName || "Other"; counts[cat] = (counts[cat] || 0) + 1; });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let prods = products;
    if (selectedCategory && selectedCategory !== "all") prods = prods.filter(p => (p.categoryName || "Other") === selectedCategory);
    if (filterCategory !== "all") prods = prods.filter(p => (p.categoryName || "Other") === filterCategory);
    if (filterGender !== "all") prods = prods.filter(p => p.genders && p.genders.includes(filterGender));
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); prods = prods.filter(p => p.name.toLowerCase().includes(q) || (p.description && p.description.toLowerCase().includes(q)) || (p.shortDescription && p.shortDescription.toLowerCase().includes(q))); }
    return prods;
  }, [products, selectedCategory, filterCategory, filterGender, searchQuery]);

  const findCat = useCallback((name: string | null) => {
    const n = name || "Other";
    return categories.find(c => c.name === n) || { id: 0, name: n, emoji: "🛍️", gradient: "from-purple-500 to-fuchsia-600", imageUrl: null, clubId: null, sortOrder: 99, isDefault: false, isActive: true, createdAt: "" };
  }, [categories]);

  if (selectedCategory === null && activeTab === "browse") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent" data-testid="text-merch-title">Club Merchandise</h1>
                <p className="text-sm text-muted-foreground mt-1">Premium gear from your clubs</p>
              </div>
              {canManage && (
                <Button onClick={() => { setActiveTab("products"); setSelectedCategory("all"); }} variant="outline" size="sm" data-testid="button-manage-merch">
                  <Pencil className="h-3.5 w-3.5 mr-1" />Manage
                </Button>
              )}
            </div>
          </motion.div>

          {(productsLoading || catsLoading) ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary/60" /></div>
          ) : categories.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card className="border-dashed border-2"><CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                  <Package className="h-16 w-16 text-muted-foreground/30 mb-4" /></motion.div>
                <h3 className="text-xl font-bold">No Categories Yet</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">{canManage ? "Set up merchandise categories to get started. Go to Manage → Categories." : "No merchandise categories yet. Check back later!"}</p>
                {canManage && <Button onClick={() => { setActiveTab("categories"); setSelectedCategory("all"); }} className="mt-4 bg-gradient-to-r from-primary to-violet-600" data-testid="button-setup-merch-cats"><Plus className="h-4 w-4 mr-1" />Set Up Categories</Button>}
              </CardContent></Card>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <button className="relative w-full h-40 sm:h-48 rounded-3xl overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg hover:shadow-xl transition-shadow group cursor-pointer" onClick={() => setSelectedCategory("all")} data-testid="button-merch-cat-all">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                  <motion.div className="absolute top-3 right-3 text-4xl sm:text-5xl opacity-30 group-hover:opacity-50 transition-opacity" animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>🛍️</motion.div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                    <div className="flex items-center gap-2 mb-1"><ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5 text-white/90" /><span className="text-white font-bold text-base sm:text-lg">All Items</span></div>
                    <p className="text-white/70 text-xs sm:text-sm">{products.length} products available</p>
                  </div>
                  <div className="absolute top-3 left-3"><div className="backdrop-blur-sm bg-white/15 rounded-full px-2.5 py-1 flex items-center gap-1"><Sparkles className="h-3 w-3 text-white/90" /><span className="text-white text-[10px] font-semibold uppercase tracking-wider">Browse</span></div></div>
                </button>
              </motion.div>
              {categories.map((cat, index) => {
                const count = categoryCounts[cat.name] || 0;
                return (
                  <motion.div key={cat.id} initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.4, delay: (index + 1) * 0.08 }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <button className={`relative w-full h-40 sm:h-48 rounded-3xl overflow-hidden bg-gradient-to-br ${cat.gradient || "from-purple-500 to-fuchsia-600"} shadow-lg hover:shadow-xl transition-shadow group cursor-pointer`} onClick={() => setSelectedCategory(cat.name)} data-testid={`button-merch-cat-${cat.id}`}>
                      {isSafeUrl(cat.imageUrl) && <img src={cat.imageUrl!} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-opacity" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                      <motion.div className="absolute top-3 right-3 text-4xl sm:text-5xl opacity-30 group-hover:opacity-50 transition-opacity" animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: (index + 1) * 0.3 }}>{cat.emoji || "🛍️"}</motion.div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                        <span className="text-white font-bold text-base sm:text-lg">{cat.name}</span>
                        <p className="text-white/70 text-xs sm:text-sm">{count} item{count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="absolute top-3 left-3"><div className="backdrop-blur-sm bg-white/15 rounded-full px-2.5 py-1 flex items-center gap-1"><Sparkles className="h-3 w-3 text-white/90" /><span className="text-white text-[10px] font-semibold uppercase tracking-wider">Explore</span></div></div>
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}

          {myOrders.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" />My Orders</h2>
              <div className="space-y-2">
                {myOrders.slice(0, 5).map((order) => {
                  const si = getOrderStatusInfo(order.status);
                  return (
                    <Card key={order.id} className="rounded-2xl border border-border/30" data-testid={`card-my-order-${order.id}`}>
                      <CardContent className="p-3 flex items-center gap-3">
                        {isSafeUrl(order.productImage) ? <img src={order.productImage!} alt="" className="w-10 h-10 rounded-xl object-cover" /> : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center"><Package className="h-5 w-5 text-primary" /></div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{order.productName || "Product"}</p>
                          <p className="text-[10px] text-muted-foreground">{[order.size, order.gender, `x${order.quantity}`].filter(Boolean).join(" · ")}</p>
                        </div>
                        <Badge className={`text-[10px] ${si.color} border-0`}>{si.label}</Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {canManage ? (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                {activeTab === "browse" && (
                  <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-merch-cats"><ChevronLeft className="h-4 w-4" />Categories</motion.button>
                )}
                <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent" data-testid="text-merch-title">
                  {activeTab === "products" ? "Manage Products" : activeTab === "orders" ? "Manage Orders" : activeTab === "categories" ? "Manage Categories" : selectedCategory && selectedCategory !== "all" ? selectedCategory : "All Items"}
                </motion.h1>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <TabsList className="bg-muted/50 backdrop-blur-sm" data-testid="tabs-merch">
                  <TabsTrigger value="browse" data-testid="tab-merch-browse"><ShoppingBag className="h-3.5 w-3.5 mr-1" />Browse</TabsTrigger>
                  <TabsTrigger value="products" data-testid="tab-merch-products"><Package className="h-3.5 w-3.5 mr-1" />Products</TabsTrigger>
                  <TabsTrigger value="orders" data-testid="tab-merch-orders"><ShoppingCart className="h-3.5 w-3.5 mr-1" />Orders</TabsTrigger>
                  <TabsTrigger value="categories" data-testid="tab-merch-categories"><FolderOpen className="h-3.5 w-3.5 mr-1" />Categories</TabsTrigger>
                </TabsList>
                {activeTab === "products" && <Button onClick={openCreateProduct} size="sm" className="bg-gradient-to-r from-primary to-violet-600 shadow-md" data-testid="button-add-product"><Plus className="h-4 w-4 mr-1" />Add Product</Button>}
                {activeTab === "categories" && <Button onClick={() => { closeCatDialog(); setCatDialogOpen(true); }} size="sm" className="bg-gradient-to-r from-primary to-violet-600 shadow-md" data-testid="button-add-merch-cat"><Plus className="h-4 w-4 mr-1" />Add Category</Button>}
              </div>
            </div>

            <TabsContent value="browse" className="mt-4 space-y-4">
              <StickySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              <BrowseFilters categories={categories} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterGender={filterGender} setFilterGender={setFilterGender} />
              <ProductGrid products={filteredProducts} isLoading={productsLoading} findCat={findCat} savedProducts={savedProducts} toggleSaved={toggleSaved} onOrder={openOrderProduct} flippedCard={flippedCard} setFlippedCard={setFlippedCard} setDetailProduct={setDetailProduct} />
            </TabsContent>

            <TabsContent value="products" className="mt-4 space-y-4">
              <StickySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
              {adminClubs && adminClubs.length > 1 && (
                <Select value={selectedAdminClub || String(adminClubs[0]?.id)} onValueChange={setSelectedAdminClub}><SelectTrigger className="w-64 backdrop-blur-sm bg-card/50" data-testid="select-merch-admin-club"><SelectValue placeholder="Select club" /></SelectTrigger><SelectContent>{adminClubs.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select>
              )}
              <AdminProductsList products={adminProducts.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))} isLoading={productsLoading} findCat={findCat} onEdit={openEditProduct} onDelete={setDeleteProductId} onToggle={(p) => updateProductMut.mutate({ id: p.id, status: p.status === "active" ? "draft" : "active" })} />
            </TabsContent>

            <TabsContent value="orders" className="mt-4 space-y-4">
              {adminClubs && adminClubs.length > 1 && (
                <Select value={selectedAdminClub || String(adminClubs[0]?.id)} onValueChange={setSelectedAdminClub}><SelectTrigger className="w-64 backdrop-blur-sm bg-card/50"><SelectValue placeholder="Select club" /></SelectTrigger><SelectContent>{adminClubs.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select>
              )}
              <AdminOrdersList orders={adminOrders} onEdit={openEditOrder} onDelete={setDeleteOrderId} />
            </TabsContent>

            <TabsContent value="categories" className="mt-4 space-y-4">
              <CategoryManagement categories={allCategories} onEdit={(c) => { setEditingCat(c); setCatFormName(c.name); setCatFormEmoji(c.emoji || "🛍️"); setCatFormGradient(c.gradient || "from-purple-500 to-fuchsia-600"); setCatFormImageUrl(c.imageUrl || ""); setCatFormSortOrder(String(c.sortOrder ?? 99)); setCatDialogOpen(true); }} onDelete={setDeleteCatId} onToggleActive={(c) => updateCatMut.mutate({ id: c.id, isActive: !c.isActive })} onSeedDefaults={() => seedDefaultsMut.mutate()} isSeedingDefaults={seedDefaultsMut.isPending} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-back-merch-cats"><ChevronLeft className="h-4 w-4" />Categories</motion.button>
              <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-purple-600 bg-clip-text text-transparent">{selectedCategory && selectedCategory !== "all" ? selectedCategory : "All Items"}</motion.h1>
            </div>
            <StickySearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
            <BrowseFilters categories={categories} filterCategory={filterCategory} setFilterCategory={setFilterCategory} filterGender={filterGender} setFilterGender={setFilterGender} />
            <ProductGrid products={filteredProducts} isLoading={productsLoading} findCat={findCat} savedProducts={savedProducts} toggleSaved={toggleSaved} onOrder={openOrderProduct} flippedCard={flippedCard} setFlippedCard={setFlippedCard} setDetailProduct={setDetailProduct} />
          </>
        )}
      </div>

      {/* Product Create/Edit Dialog */}
      <Dialog open={productDialogOpen} onOpenChange={(o) => { if (!o) closeProductDialog(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle><DialogDescription>{editingProduct ? "Update product details." : "Create a new merchandise product."}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            {!editingProduct && adminClubs && adminClubs.length > 1 && (
              <div className="space-y-1.5"><Label>Club</Label><Select value={formClubId} onValueChange={setFormClubId}><SelectTrigger data-testid="select-prod-club"><SelectValue placeholder="Select club" /></SelectTrigger><SelectContent>{adminClubs.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            )}
            <div className="space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. Club Training Jersey" value={formName} onChange={(e) => setFormName(e.target.value)} data-testid="input-prod-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Category</Label><Select value={formCategoryName} onValueChange={setFormCategoryName}><SelectTrigger data-testid="select-prod-cat"><SelectValue /></SelectTrigger><SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}><span className="flex items-center gap-2"><span>{c.emoji}</span><span>{c.name}</span></span></SelectItem>)}{categories.length === 0 && <SelectItem value="Other">Other</SelectItem>}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label>Price (pence)</Label><Input type="number" min={0} placeholder="e.g. 2500" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} data-testid="input-prod-price" /></div>
            </div>
            <div className="space-y-1.5"><Label>Short Description</Label><Input placeholder="Brief tagline..." value={formShortDesc} onChange={(e) => setFormShortDesc(e.target.value)} maxLength={200} data-testid="input-prod-short-desc" /></div>
            <div className="space-y-1.5"><Label>Full Description</Label><Textarea placeholder="Detailed description..." value={formDesc} onChange={(e) => setFormDesc(e.target.value)} rows={3} data-testid="input-prod-desc" /></div>
            <div className="space-y-1.5"><Label>Image URL</Label><Input placeholder="https://..." value={formImageUrl} onChange={(e) => setFormImageUrl(e.target.value)} data-testid="input-prod-image" />
              {isSafeUrl(formImageUrl) && <div className="relative mt-2 rounded-2xl overflow-hidden border border-border/50 h-32"><img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /><Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 bg-background/80" onClick={() => setFormImageUrl("")}><X className="h-3 w-3" /></Button></div>}
            </div>
            <div className="space-y-1.5"><Label>Sizes</Label><div className="flex flex-wrap gap-1.5">{SIZE_OPTIONS.map(s => <button key={s} type="button" onClick={() => setFormSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${formSizes.includes(s) ? "bg-primary text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`} data-testid={`button-size-${s}`}>{s}</button>)}</div></div>
            <div className="space-y-1.5"><Label>Genders</Label><div className="flex flex-wrap gap-1.5">{GENDER_OPTIONS.map(g => <button key={g} type="button" onClick={() => setFormGenders(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${formGenders.includes(g) ? "bg-primary text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`} data-testid={`button-gender-${g}`}>{g}</button>)}</div></div>
            <div className="space-y-1.5"><Label>Styles / Variants (comma separated)</Label><Input placeholder="e.g. Classic, Pro, Slim Fit" value={formStyles} onChange={(e) => setFormStyles(e.target.value)} data-testid="input-prod-styles" /></div>
            <div className="space-y-1.5"><Label>Materials</Label><Input placeholder="e.g. 100% Polyester" value={formMaterials} onChange={(e) => setFormMaterials(e.target.value)} data-testid="input-prod-materials" /></div>
            <div className="space-y-1.5"><Label>Specifications</Label><Textarea placeholder="Additional specs or details..." value={formSpecs} onChange={(e) => setFormSpecs(e.target.value)} rows={2} data-testid="input-prod-specs" /></div>
            <div className="space-y-1.5"><Label>Tags</Label><div className="flex flex-wrap gap-1.5">{TAG_OPTIONS.map(t => <button key={t} type="button" onClick={() => setFormTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${formTags.includes(t) ? "bg-gradient-to-r from-primary to-violet-600 text-white" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`} data-testid={`button-tag-${t}`}>{t}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Status</Label><Select value={formStatus} onValueChange={setFormStatus}><SelectTrigger data-testid="select-prod-status"><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-end gap-2"><Switch checked={formFeatured} onCheckedChange={setFormFeatured} data-testid="switch-prod-featured" /><Label className="text-sm pb-0.5">Featured</Label></div>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeProductDialog}>Cancel</Button><Button onClick={handleSaveProduct} disabled={createProductMut.isPending || updateProductMut.isPending} className="bg-gradient-to-r from-primary to-violet-600" data-testid="button-save-product">{(createProductMut.isPending || updateProductMut.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editingProduct ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Request Dialog */}
      <Dialog open={orderDialogOpen} onOpenChange={(o) => { if (!o) closeOrderDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Order Request</DialogTitle><DialogDescription>Request {orderingProduct?.name}. No payment required at this stage.</DialogDescription></DialogHeader>
          {orderingProduct && (
            <div className="space-y-4">
              {isSafeUrl(orderingProduct.imageUrl) && <div className="rounded-2xl overflow-hidden h-40"><img src={orderingProduct.imageUrl!} alt={orderingProduct.name} className="w-full h-full object-cover" /></div>}
              <div><h3 className="font-bold text-lg">{orderingProduct.name}</h3>{orderingProduct.price && <p className="text-primary font-semibold">£{(orderingProduct.price / 100).toFixed(2)}</p>}</div>
              {orderingProduct.sizes && orderingProduct.sizes.length > 0 && <div className="space-y-1.5"><Label>Size</Label><div className="flex flex-wrap gap-1.5">{orderingProduct.sizes.map(s => <button key={s} type="button" onClick={() => setOrderSize(s)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${orderSize === s ? "bg-primary text-white shadow-md" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`} data-testid={`button-order-size-${s}`}>{s}</button>)}</div></div>}
              {orderingProduct.genders && orderingProduct.genders.length > 1 && <div className="space-y-1.5"><Label>Gender</Label><div className="flex flex-wrap gap-1.5">{orderingProduct.genders.map(g => <button key={g} type="button" onClick={() => setOrderGender(g)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${orderGender === g ? "bg-primary text-white shadow-md" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`} data-testid={`button-order-gender-${g}`}>{g}</button>)}</div></div>}
              {orderingProduct.styles && orderingProduct.styles.length > 0 && <div className="space-y-1.5"><Label>Style / Variant</Label><Select value={orderStyle} onValueChange={setOrderStyle}><SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger><SelectContent>{orderingProduct.styles.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>}
              <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min={1} max={50} value={orderQty} onChange={(e) => setOrderQty(e.target.value)} data-testid="input-order-qty" /></div>
              <div className="space-y-1.5"><Label>Notes / Preferences</Label><Textarea placeholder="Any special requests..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} rows={2} data-testid="input-order-notes" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={closeOrderDialog}>Cancel</Button><Button onClick={handleSubmitOrder} disabled={createOrderMut.isPending} className="bg-gradient-to-r from-primary to-violet-600" data-testid="button-submit-order">{createOrderMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Submit Request</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Edit Order Dialog */}
      <Dialog open={editOrderDialogOpen} onOpenChange={(o) => { if (!o) setEditOrderDialogOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Order</DialogTitle><DialogDescription>Update order #{editingOrder?.id} details and status.</DialogDescription></DialogHeader>
          {editingOrder && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-muted/30 text-sm"><p className="font-semibold">{editingOrder.productName || "Product"}</p><p className="text-muted-foreground text-xs">Ordered by {editingOrder.userName || `User #${editingOrder.userId}`}</p></div>
              <div className="space-y-1.5"><Label>Status</Label><Select value={editOrderStatus} onValueChange={setEditOrderStatus}><SelectTrigger data-testid="select-edit-order-status"><SelectValue /></SelectTrigger><SelectContent>{ORDER_STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Size</Label><Input value={editOrderSize} onChange={(e) => setEditOrderSize(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Gender</Label><Input value={editOrderGender} onChange={(e) => setEditOrderGender(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Style</Label><Input value={editOrderStyle} onChange={(e) => setEditOrderStyle(e.target.value)} /></div>
                <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min={1} value={editOrderQty} onChange={(e) => setEditOrderQty(e.target.value)} /></div>
              </div>
              <div className="space-y-1.5"><Label>Customer Notes</Label><Textarea value={editOrderNotes} onChange={(e) => setEditOrderNotes(e.target.value)} rows={2} /></div>
              <div className="space-y-1.5"><Label>Admin Notes</Label><Textarea placeholder="Internal notes..." value={editOrderAdminNotes} onChange={(e) => setEditOrderAdminNotes(e.target.value)} rows={2} data-testid="input-admin-notes" /></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setEditOrderDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveOrder} disabled={updateOrderMut.isPending} className="bg-gradient-to-r from-primary to-violet-600" data-testid="button-save-order">{updateOrderMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Update</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={(o) => { if (!o) closeCatDialog(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle><DialogDescription>{editingCat ? "Update category details." : "Create a new merchandise category."}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3"><div className="col-span-2 space-y-1.5"><Label>Name *</Label><Input placeholder="e.g. Accessories" value={catFormName} onChange={(e) => setCatFormName(e.target.value)} data-testid="input-merch-cat-name" /></div><div className="space-y-1.5"><Label>Emoji</Label><Input placeholder="🛍️" value={catFormEmoji} onChange={(e) => setCatFormEmoji(e.target.value)} className="text-center text-lg" data-testid="input-merch-cat-emoji" /></div></div>
            <div className="space-y-1.5"><Label>Colour Theme</Label><Select value={catFormGradient} onValueChange={setCatFormGradient}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{GRADIENT_OPTIONS.map(g => <SelectItem key={g.value} value={g.value}><span className="flex items-center gap-2"><span className={`inline-block w-4 h-4 rounded-full bg-gradient-to-r ${g.value}`} /><span>{g.label}</span></span></SelectItem>)}</SelectContent></Select><div className={`mt-2 h-12 rounded-xl bg-gradient-to-r ${catFormGradient} flex items-center justify-center`}><span className="text-white text-lg">{catFormEmoji} {catFormName || "Preview"}</span></div></div>
            <div className="space-y-1.5"><Label>Image URL (optional)</Label><Input placeholder="https://..." value={catFormImageUrl} onChange={(e) => setCatFormImageUrl(e.target.value)} data-testid="input-merch-cat-image" /></div>
            <div className="space-y-1.5"><Label>Sort Order</Label><Input type="number" min={0} value={catFormSortOrder} onChange={(e) => setCatFormSortOrder(e.target.value)} /><p className="text-[10px] text-muted-foreground">Lower numbers appear first</p></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={closeCatDialog}>Cancel</Button><Button onClick={handleSaveCategory} disabled={createCatMut.isPending || updateCatMut.isPending} className="bg-gradient-to-r from-primary to-violet-600" data-testid="button-save-merch-cat">{(createCatMut.isPending || updateCatMut.isPending) && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editingCat ? "Update" : "Create"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <Dialog open={detailProduct !== null} onOpenChange={(o) => { if (!o) setDetailProduct(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {detailProduct && (
            <>
              <DialogHeader><DialogTitle>{detailProduct.name}</DialogTitle></DialogHeader>
              {isSafeUrl(detailProduct.imageUrl) && <div className="rounded-2xl overflow-hidden h-52"><img src={detailProduct.imageUrl!} alt={detailProduct.name} className="w-full h-full object-cover" /></div>}
              <div className="space-y-4">
                {detailProduct.price && <p className="text-2xl font-black text-primary">£{(detailProduct.price / 100).toFixed(2)}</p>}
                {detailProduct.tags && detailProduct.tags.length > 0 && <div className="flex flex-wrap gap-1.5">{detailProduct.tags.map(t => <Badge key={t} className="bg-gradient-to-r from-primary/10 to-violet-500/10 text-primary border-primary/20 text-[10px]">{t}</Badge>)}</div>}
                {detailProduct.description && <p className="text-sm text-muted-foreground leading-relaxed">{detailProduct.description}</p>}
                {detailProduct.sizes && detailProduct.sizes.length > 0 && <div><p className="text-xs font-semibold mb-1">Available Sizes</p><div className="flex flex-wrap gap-1.5">{detailProduct.sizes.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}</div></div>}
                {detailProduct.genders && detailProduct.genders.length > 0 && <div><p className="text-xs font-semibold mb-1">Genders</p><div className="flex flex-wrap gap-1.5">{detailProduct.genders.map(g => <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>)}</div></div>}
                {detailProduct.styles && detailProduct.styles.length > 0 && <div><p className="text-xs font-semibold mb-1">Styles</p><div className="flex flex-wrap gap-1.5">{detailProduct.styles.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}</div></div>}
                {detailProduct.materials && <div><p className="text-xs font-semibold mb-1">Materials</p><p className="text-xs text-muted-foreground">{detailProduct.materials}</p></div>}
                {detailProduct.specifications && <div><p className="text-xs font-semibold mb-1">Specifications</p><p className="text-xs text-muted-foreground whitespace-pre-wrap">{detailProduct.specifications}</p></div>}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setDetailProduct(null)}>Close</Button><Button onClick={() => { setDetailProduct(null); openOrderProduct(detailProduct); }} className="bg-gradient-to-r from-primary to-violet-600" data-testid="button-detail-order"><ShoppingCart className="h-4 w-4 mr-1" />Order</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmations */}
      <Dialog open={deleteProductId !== null} onOpenChange={(o) => { if (!o) setDeleteProductId(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Product</DialogTitle><DialogDescription>Are you sure? This will also remove all associated orders.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteProductId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteProductId && deleteProductMut.mutate(deleteProductId)} disabled={deleteProductMut.isPending}>{deleteProductMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={deleteOrderId !== null} onOpenChange={(o) => { if (!o) setDeleteOrderId(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Order</DialogTitle><DialogDescription>Are you sure you want to delete this order?</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteOrderId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteOrderId && deleteOrderMut.mutate(deleteOrderId)} disabled={deleteOrderMut.isPending}>{deleteOrderMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={deleteCatId !== null} onOpenChange={(o) => { if (!o) setDeleteCatId(null); }}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>Delete Category</DialogTitle><DialogDescription>Products in this category will be moved to "Other".</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setDeleteCatId(null)}>Cancel</Button><Button variant="destructive" onClick={() => deleteCatId && deleteCatMut.mutate(deleteCatId)} disabled={deleteCatMut.isPending}>{deleteCatMut.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Delete</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function StickySearchBar({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (v: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="sticky top-0 z-20 pt-1 pb-2 bg-gradient-to-b from-background via-background to-transparent">
      <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" /><Input placeholder="Search merchandise..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-11 pr-10 h-12 rounded-2xl border-border/40 bg-card/80 backdrop-blur-lg shadow-sm focus:shadow-md focus:border-primary/50 transition-all text-sm" data-testid="input-search-merch" />{searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" data-testid="button-clear-merch-search"><X className="h-4 w-4" /></button>}</div>
    </motion.div>
  );
}

function BrowseFilters({ categories, filterCategory, setFilterCategory, filterGender, setFilterGender }: { categories: MerchCategory[]; filterCategory: string; setFilterCategory: (v: string) => void; filterGender: string; setFilterGender: (v: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
      {[{ id: "all", label: "All" }, ...categories.map(c => ({ id: c.name, label: c.name }))].map(chip => (
        <motion.button key={chip.id} whileTap={{ scale: 0.95 }} onClick={() => setFilterCategory(chip.id)} className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${filterCategory === chip.id ? "bg-gradient-to-r from-primary to-violet-600 text-white shadow-md shadow-primary/25" : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground backdrop-blur-sm"}`} data-testid={`chip-merch-cat-${chip.id}`}>{chip.label}</motion.button>
      ))}
      <div className="w-px bg-border/40 mx-1" />
      {["all", ...GENDER_OPTIONS].map(g => (
        <motion.button key={g} whileTap={{ scale: 0.95 }} onClick={() => setFilterGender(g)} className={`shrink-0 px-3 py-2 rounded-full text-xs font-semibold transition-all duration-200 ${filterGender === g ? "bg-gradient-to-r from-primary to-violet-600 text-white shadow-md" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`} data-testid={`chip-merch-gender-${g}`}>{g === "all" ? "All Genders" : g}</motion.button>
      ))}
    </motion.div>
  );
}

function ProductGrid({ products, isLoading, findCat, savedProducts, toggleSaved, onOrder, flippedCard, setFlippedCard, setDetailProduct }: { products: MerchProduct[]; isLoading: boolean; findCat: (n: string | null) => MerchCategory; savedProducts: Set<number>; toggleSaved: (id: number) => void; onOrder: (p: MerchProduct) => void; flippedCard: number | null; setFlippedCard: (id: number | null) => void; setDetailProduct: (p: MerchProduct | null) => void }) {
  if (isLoading) return <div className="flex items-center justify-center py-20"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader2 className="h-10 w-10 text-primary/60" /></motion.div></div>;
  if (products.length === 0) return <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}><Card className="border-dashed border-2 rounded-3xl"><CardContent className="flex flex-col items-center justify-center py-20 text-center"><motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}><Package className="h-16 w-16 text-muted-foreground/30 mb-4" /></motion.div><h3 className="text-xl font-bold">No products found</h3><p className="text-sm text-muted-foreground mt-2 max-w-sm">Try adjusting your search or filters.</p></CardContent></Card></motion.div>;

  const featured = products.filter(p => p.isFeatured);
  const regular = products.filter(p => !p.isFeatured);

  return (
    <div className="space-y-5">
      {featured.length > 0 && featured.map(p => {
        const cat = findCat(p.categoryName);
        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Card className="overflow-hidden rounded-3xl border-0 shadow-xl relative group cursor-pointer" onClick={() => setDetailProduct(p)} data-testid={`card-featured-product-${p.id}`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${cat.gradient || "from-purple-500 to-fuchsia-600"} opacity-90`} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              {isSafeUrl(p.imageUrl) && <div className="absolute inset-0"><img src={p.imageUrl!} alt={p.name} className="w-full h-full object-cover opacity-40 mix-blend-overlay" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /></div>}
              <CardContent className="relative z-10 p-6 sm:p-8 text-white">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2"><div className="backdrop-blur-sm bg-white/15 rounded-full px-3 py-1 flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-amber-300" /><span className="text-[11px] font-bold uppercase tracking-wider">Featured</span></div></div>
                  <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); toggleSaved(p.id); }} className="backdrop-blur-sm bg-white/15 rounded-full p-2 hover:bg-white/25 transition-colors" data-testid={`button-save-featured-${p.id}`}><Heart className={`h-4 w-4 ${savedProducts.has(p.id) ? "fill-red-400 text-red-400" : "text-white/80"}`} /></motion.button>
                </div>
                <div className="space-y-3">
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{p.name}</h2>
                  {p.price && <span className="text-3xl font-black">£{(p.price / 100).toFixed(2)}</span>}
                  {p.shortDescription && <p className="text-white/80 text-sm max-w-md">{p.shortDescription}</p>}
                  {p.tags && p.tags.length > 0 && <div className="flex gap-1.5">{p.tags.map(t => <Badge key={t} className="bg-white/15 backdrop-blur-sm border-white/20 text-white text-[10px]">{t}</Badge>)}</div>}
                </div>
                <div className="flex items-center gap-3 mt-6">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={(e) => { e.stopPropagation(); onOrder(p); }} className="flex items-center gap-2 bg-white text-gray-900 font-semibold rounded-2xl px-5 py-3 text-sm shadow-lg hover:shadow-xl transition-all" data-testid={`button-order-featured-${p.id}`}><ShoppingCart className="h-4 w-4" />Order Now</motion.button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

      <AnimatePresence mode="popLayout">
        <div className="grid gap-4 sm:grid-cols-2">
          {regular.map((p, index) => {
            const cat = findCat(p.categoryName);
            const isFlipped = flippedCard === p.id;
            return (
              <motion.div key={p.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.35, delay: index * 0.05 }} layout>
                <div style={{ perspective: "1000px" }}>
                  <motion.div className="relative w-full" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}>
                    <div className={isFlipped ? "pointer-events-none" : ""} style={{ backfaceVisibility: "hidden" }}>
                      <Card className="overflow-hidden rounded-3xl border border-border/30 bg-card/80 backdrop-blur-lg shadow-md hover:shadow-lg transition-all duration-300" data-testid={`card-product-${p.id}`}>
                        {isSafeUrl(p.imageUrl) ? (
                          <div className="relative h-40 overflow-hidden cursor-pointer" onClick={() => setDetailProduct(p)}>
                            <img src={p.imageUrl!} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                            {p.tags && p.tags.length > 0 && <div className="absolute top-3 left-3 flex gap-1">{p.tags.slice(0, 2).map(t => <Badge key={t} className="bg-gradient-to-r from-primary to-violet-600 text-white border-0 text-[9px] shadow-md">{t}</Badge>)}</div>}
                            {p.price && <div className={`absolute top-3 right-3 bg-gradient-to-r ${cat.gradient} text-white rounded-2xl px-3 py-1.5 text-sm font-black shadow-lg`}>£{(p.price / 100).toFixed(2)}</div>}
                          </div>
                        ) : (
                          <div className={`relative h-24 bg-gradient-to-br ${cat.gradient || "from-purple-500 to-fuchsia-600"} overflow-hidden cursor-pointer`} onClick={() => setDetailProduct(p)}>
                            <div className="absolute inset-0 flex items-center justify-center opacity-30 text-white text-4xl">{cat.emoji || "🛍️"}</div>
                            {p.price && <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-sm text-white rounded-2xl px-3 py-1.5 text-sm font-black">£{(p.price / 100).toFixed(2)}</div>}
                            {p.tags && p.tags.length > 0 && <div className="absolute top-3 left-3 flex gap-1">{p.tags.slice(0, 2).map(t => <Badge key={t} className="bg-white/20 text-white border-0 text-[9px]">{t}</Badge>)}</div>}
                          </div>
                        )}
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-0.5"><h3 className="font-bold text-sm truncate">{p.name}</h3>{p.shortDescription && <p className="text-xs text-muted-foreground line-clamp-1">{p.shortDescription}</p>}<Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full">{cat.emoji} {cat.name}</Badge></div>
                            <div className="flex gap-1 shrink-0">
                              <motion.button whileTap={{ scale: 0.85 }} onClick={(e) => { e.stopPropagation(); toggleSaved(p.id); }} className="p-1.5 rounded-full hover:bg-muted/80 transition-colors" data-testid={`button-save-${p.id}`}><Heart className={`h-3.5 w-3.5 transition-colors ${savedProducts.has(p.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} /></motion.button>
                              <motion.button whileTap={{ scale: 0.85 }} onClick={() => setFlippedCard(isFlipped ? null : p.id)} className="p-1.5 rounded-full hover:bg-muted/80 transition-colors" data-testid={`button-flip-${p.id}`}><Eye className="h-3.5 w-3.5 text-muted-foreground" /></motion.button>
                            </div>
                          </div>
                          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onOrder(p)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-violet-600 text-white rounded-2xl px-4 py-2.5 text-sm font-semibold shadow-md hover:shadow-lg transition-all" data-testid={`button-order-${p.id}`}><ShoppingCart className="h-4 w-4" />Order</motion.button>
                        </CardContent>
                      </Card>
                    </div>
                    <div className={`absolute top-0 left-0 w-full ${isFlipped ? "" : "pointer-events-none"}`} style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <Card className="overflow-hidden rounded-3xl border border-border/30 bg-card/95 backdrop-blur-xl shadow-lg h-full">
                        <div className={`h-2 bg-gradient-to-r ${cat.gradient || "from-purple-500 to-fuchsia-600"}`} />
                        <CardContent className="p-5 space-y-3">
                          <div className="flex items-start justify-between"><div><h3 className="font-bold text-lg">{p.name}</h3>{p.price && <p className="text-xl font-black text-primary">£{(p.price / 100).toFixed(2)}</p>}</div><motion.button whileTap={{ scale: 0.85 }} onClick={() => setFlippedCard(null)} className="p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors" data-testid={`button-flip-back-${p.id}`}><X className="h-4 w-4" /></motion.button></div>
                          {p.description && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{p.description}</p>}
                          <div className="space-y-1.5 text-xs">
                            {p.sizes && p.sizes.length > 0 && <div className="flex items-center gap-1.5 flex-wrap"><span className="font-semibold">Sizes:</span>{p.sizes.map(s => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}</div>}
                            {p.genders && p.genders.length > 0 && <div className="flex items-center gap-1.5"><span className="font-semibold">Gender:</span><span className="text-muted-foreground">{p.genders.join(", ")}</span></div>}
                            {p.materials && <div><span className="font-semibold">Materials: </span><span className="text-muted-foreground">{p.materials}</span></div>}
                          </div>
                          <motion.button whileTap={{ scale: 0.95 }} onClick={() => onOrder(p)} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-violet-600 text-white rounded-2xl py-2.5 text-sm font-semibold shadow-md" data-testid={`button-order-back-${p.id}`}><ShoppingCart className="h-4 w-4" />Order</motion.button>
                        </CardContent>
                      </Card>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}

function AdminProductsList({ products, isLoading, findCat, onEdit, onDelete, onToggle }: { products: MerchProduct[]; isLoading: boolean; findCat: (n: string | null) => MerchCategory; onEdit: (p: MerchProduct) => void; onDelete: (id: number) => void; onToggle: (p: MerchProduct) => void }) {
  if (isLoading) return <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (products.length === 0) return <Card className="border-dashed border-2 rounded-3xl"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><Package className="h-12 w-12 text-muted-foreground/40 mb-3" /><h3 className="text-lg font-semibold">No Products Yet</h3><p className="text-sm text-muted-foreground mt-1">Create your first merchandise product.</p></CardContent></Card>;
  return (
    <div className="space-y-3">
      {products.map((p, index) => {
        const cat = findCat(p.categoryName);
        return (
          <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
            <Card className={`rounded-2xl border border-border/30 overflow-hidden ${p.status !== "active" ? "opacity-50" : ""}`} data-testid={`card-admin-product-${p.id}`}>
              <CardContent className="p-4"><div className="flex items-start gap-3">
                {isSafeUrl(p.imageUrl) ? <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted/30 flex-shrink-0 shadow-sm"><img src={p.imageUrl!} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} /></div> : <div className={`w-14 h-14 rounded-xl flex-shrink-0 bg-gradient-to-br ${cat.gradient} flex items-center justify-center shadow-sm`}><span className="text-xl">{cat.emoji}</span></div>}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-sm">{p.name}</span>{p.price && <Badge className="bg-gradient-to-r from-primary to-violet-600 text-white border-0 text-[10px]">£{(p.price / 100).toFixed(2)}</Badge>}<Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 rounded-full">{cat.emoji} {cat.name}</Badge>{p.isFeatured && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[9px]"><Star className="h-3 w-3 mr-0.5" />Featured</Badge>}{p.status !== "active" && <Badge variant="secondary" className="text-[10px]">{STATUS_OPTIONS.find(s => s.value === p.status)?.label || p.status}</Badge>}</div>
                  {p.shortDescription && <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.shortDescription}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">{p.sizes && p.sizes.length > 0 && <span>Sizes: {p.sizes.join(", ")}</span>}{p.tags && p.tags.length > 0 && <span>Tags: {p.tags.join(", ")}</span>}</div>
                </div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl" data-testid={`button-product-menu-${p.id}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 rounded-xl"><DropdownMenuItem onClick={() => onEdit(p)} data-testid={`button-edit-product-${p.id}`}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => onToggle(p)} data-testid={`button-toggle-product-${p.id}`}>{p.status === "active" ? <><EyeOff className="h-3.5 w-3.5 mr-2" />Draft</> : <><Eye className="h-3.5 w-3.5 mr-2" />Activate</>}</DropdownMenuItem><DropdownMenuItem onClick={() => onDelete(p.id)} className="text-red-600" data-testid={`button-delete-product-${p.id}`}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              </div></CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function AdminOrdersList({ orders, onEdit, onDelete }: { orders: MerchOrder[]; onEdit: (o: MerchOrder) => void; onDelete: (id: number) => void }) {
  if (orders.length === 0) return <Card className="border-dashed border-2 rounded-3xl"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-3" /><h3 className="text-lg font-semibold">No Orders Yet</h3><p className="text-sm text-muted-foreground mt-1">Orders will appear here when members request items.</p></CardContent></Card>;
  return (
    <div className="space-y-2">
      {orders.map((o, index) => {
        const si = getOrderStatusInfo(o.status);
        return (
          <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
            <Card className="rounded-2xl border border-border/30" data-testid={`card-admin-order-${o.id}`}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {isSafeUrl(o.productImage) ? <img src={o.productImage!} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center flex-shrink-0"><Package className="h-6 w-6 text-primary" /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-sm">{o.productName || "Product"}</span><Badge className={`text-[10px] border-0 ${si.color}`}>{si.label}</Badge></div>
                    <p className="text-xs text-muted-foreground">{o.userName || `User #${o.userId}`}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">{o.size && <span>Size: {o.size}</span>}{o.gender && <span>• {o.gender}</span>}<span>• Qty: {o.quantity}</span><span>• {format(new Date(o.createdAt), "dd MMM yyyy")}</span></div>
                    {o.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic truncate">"{o.notes}"</p>}
                  </div>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl" data-testid={`button-order-menu-${o.id}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44 rounded-xl"><DropdownMenuItem onClick={() => onEdit(o)} data-testid={`button-edit-order-${o.id}`}><Pencil className="h-3.5 w-3.5 mr-2" />Edit / Update</DropdownMenuItem>{o.status !== "approved" && <DropdownMenuItem onClick={() => onEdit({ ...o, status: "approved" })} data-testid={`button-approve-order-${o.id}`}><BadgeCheck className="h-3.5 w-3.5 mr-2" />Approve</DropdownMenuItem>}{o.status !== "ready" && <DropdownMenuItem onClick={() => onEdit({ ...o, status: "ready" })}><Check className="h-3.5 w-3.5 mr-2" />Mark Ready</DropdownMenuItem>}{o.status !== "collected" && <DropdownMenuItem onClick={() => onEdit({ ...o, status: "collected" })}><ShoppingBag className="h-3.5 w-3.5 mr-2" />Mark Collected</DropdownMenuItem>}<DropdownMenuItem onClick={() => onDelete(o.id)} className="text-red-600" data-testid={`button-delete-order-${o.id}`}><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function CategoryManagement({ categories, onEdit, onDelete, onToggleActive, onSeedDefaults, isSeedingDefaults }: { categories: MerchCategory[]; onEdit: (c: MerchCategory) => void; onDelete: (id: number) => void; onToggleActive: (c: MerchCategory) => void; onSeedDefaults: () => void; isSeedingDefaults: boolean }) {
  const hasDefaults = categories.some(c => c.isDefault);
  return (
    <div className="space-y-4">
      {!hasDefaults && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Card className="border-dashed border-2 border-primary/30 bg-primary/5 rounded-2xl"><CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap"><div className="space-y-1"><h3 className="font-semibold text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Quick Start</h3><p className="text-xs text-muted-foreground">Seed default categories (Apparel, Equipment, Accessories, Footwear, Training Gear) to get started.</p></div><Button onClick={onSeedDefaults} disabled={isSeedingDefaults} size="sm" className="bg-gradient-to-r from-primary to-violet-600 shadow-md" data-testid="button-seed-merch-defaults">{isSeedingDefaults ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}Seed Defaults</Button></CardContent></Card></motion.div>
      )}
      {categories.length === 0 && <Card className="border-dashed border-2 rounded-3xl"><CardContent className="flex flex-col items-center justify-center py-16 text-center"><FolderOpen className="h-12 w-12 text-muted-foreground/40 mb-3" /><h3 className="text-lg font-semibold">No Categories</h3><p className="text-sm text-muted-foreground mt-1">Create categories or seed defaults.</p></CardContent></Card>}
      <div className="space-y-2">
        {categories.map((cat, index) => (
          <motion.div key={cat.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
            <Card className={`rounded-2xl border border-border/30 overflow-hidden ${!cat.isActive ? "opacity-50" : ""}`} data-testid={`card-merch-cat-${cat.id}`}>
              <CardContent className="p-3 sm:p-4"><div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                <div className={`w-12 h-12 rounded-xl flex-shrink-0 bg-gradient-to-br ${cat.gradient || "from-purple-500 to-fuchsia-600"} flex items-center justify-center shadow-sm overflow-hidden relative`}>{isSafeUrl(cat.imageUrl) && <img src={cat.imageUrl!} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-60" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />}<span className="text-xl relative z-10">{cat.emoji || "🛍️"}</span></div>
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-sm">{cat.name}</span>{cat.isDefault && <Badge variant="outline" className="text-[9px] h-4 px-1.5 rounded-full text-primary border-primary/30">Default</Badge>}{!cat.isActive && <Badge variant="secondary" className="text-[10px]"><EyeOff className="h-3 w-3 mr-0.5" />Hidden</Badge>}</div><div className="text-[10px] text-muted-foreground mt-0.5">Order: {cat.sortOrder ?? 0}</div></div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-xl" data-testid={`button-merch-cat-menu-${cat.id}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-40 rounded-xl"><DropdownMenuItem onClick={() => onEdit(cat)}><Pencil className="h-3.5 w-3.5 mr-2" />Edit</DropdownMenuItem><DropdownMenuItem onClick={() => onToggleActive(cat)}>{cat.isActive ? <><EyeOff className="h-3.5 w-3.5 mr-2" />Hide</> : <><Eye className="h-3.5 w-3.5 mr-2" />Show</>}</DropdownMenuItem>{!cat.isDefault && <DropdownMenuItem onClick={() => onDelete(cat.id)} className="text-red-600"><Trash2 className="h-3.5 w-3.5 mr-2" />Delete</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu>
              </div></CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
