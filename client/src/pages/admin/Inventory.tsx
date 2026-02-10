import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useUser } from "@/hooks/use-auth";
import { useMyAdminClubs } from "@/hooks/use-clubs";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Package, Plus, Pencil, Loader2, ArrowLeft, ArrowDown, ArrowUp,
  ShoppingCart, Wrench, ClipboardList, Search, Box, TrendingUp, TrendingDown,
} from "lucide-react";
import { Link } from "wouter";

function formatPounds(pence: number): string {
  return "\u00A3" + (pence / 100).toFixed(2);
}

interface InventoryItem {
  id: number;
  clubId: number;
  name: string;
  supplier: string | null;
  unitPrice: number;
  stockAvailable: number;
  isSessionLinked: boolean;
  canBeSold: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
}

interface InventoryMovement {
  id: number;
  clubId: number;
  itemId: number;
  quantityDelta: number;
  unitPrice: number | null;
  totalAmount: number | null;
  movementType: "RECEIPT" | "USAGE" | "SALE" | "ADJUSTMENT";
  sessionId: number | null;
  buyerName: string | null;
  notes: string | null;
  createdById: number;
  createdAt: string;
  itemName: string;
  clubName: string;
  createdByName: string;
}

interface ExpenseEntry {
  id: number;
  clubId: number;
  name: string;
  amount: number;
  notes: string | null;
  createdById: number;
  createdAt: string;
  clubName: string;
  createdByName: string;
}

const MOVEMENT_LABELS: Record<string, string> = {
  RECEIPT: "Stock Received",
  USAGE: "Session Usage",
  SALE: "Sold",
  ADJUSTMENT: "Adjustment",
};

function getMovementBadge(type: string) {
  switch (type) {
    case "RECEIPT":
      return <Badge variant="default" data-testid={`badge-movement-${type}`}><ArrowDown className="w-3 h-3 mr-1" />{MOVEMENT_LABELS[type]}</Badge>;
    case "USAGE":
      return <Badge variant="secondary" data-testid={`badge-movement-${type}`}><Wrench className="w-3 h-3 mr-1" />{MOVEMENT_LABELS[type]}</Badge>;
    case "SALE":
      return <Badge variant="outline" data-testid={`badge-movement-${type}`}><ShoppingCart className="w-3 h-3 mr-1" />{MOVEMENT_LABELS[type]}</Badge>;
    case "ADJUSTMENT":
      return <Badge variant="secondary" data-testid={`badge-movement-${type}`}><Pencil className="w-3 h-3 mr-1" />{MOVEMENT_LABELS[type]}</Badge>;
    default:
      return <Badge>{type}</Badge>;
  }
}

export default function Inventory() {
  const { toast } = useToast();
  const { data: user } = useUser();
  const { data: adminClubs = [] } = useMyAdminClubs();
  const [selectedClubId, setSelectedClubId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("items");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [receiveDialog, setReceiveDialog] = useState<InventoryItem | null>(null);
  const [adjustDialog, setAdjustDialog] = useState<InventoryItem | null>(null);
  const [sellDialog, setSellDialog] = useState<InventoryItem | null>(null);
  const [usageDialog, setUsageDialog] = useState<InventoryItem | null>(null);

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);

  const [itemForm, setItemForm] = useState({
    name: "", supplier: "", unitPrice: "", stockAvailable: "0",
    isSessionLinked: false, canBeSold: false, notes: "",
  });
  const [receiveForm, setReceiveForm] = useState({ quantity: "", unitPrice: "", notes: "" });
  const [adjustForm, setAdjustForm] = useState({ quantityDelta: "", notes: "" });
  const [sellForm, setSellForm] = useState({ quantity: "", unitPrice: "", buyerName: "", notes: "" });
  const [usageForm, setUsageForm] = useState({ sessionId: "", quantity: "", notes: "" });
  const [expenseForm, setExpenseForm] = useState({ name: "", amount: "", notes: "" });

  const itemsQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    return `/api/inventory/items${params.toString() ? `?${params}` : ""}`;
  }, [selectedClubId]);

  const movementsQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    return `/api/inventory/movements${params.toString() ? `?${params}` : ""}`;
  }, [selectedClubId]);

  const expensesQueryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (selectedClubId !== "all") params.append("clubId", selectedClubId);
    return `/api/expenses${params.toString() ? `?${params}` : ""}`;
  }, [selectedClubId]);

  const { data: items = [], isLoading: loadingItems } = useQuery<InventoryItem[]>({ queryKey: [itemsQueryUrl] });
  const { data: movements = [], isLoading: loadingMovements } = useQuery<InventoryMovement[]>({ queryKey: [movementsQueryUrl] });
  const { data: expensesList = [], isLoading: loadingExpenses } = useQuery<ExpenseEntry[]>({ queryKey: [expensesQueryUrl] });

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i => i.name.toLowerCase().includes(q) || (i.supplier || "").toLowerCase().includes(q));
  }, [items, searchQuery]);

  const createItem = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/inventory/items", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/inventory") });
      toast({ title: "Item Created", description: "Inventory item has been added." });
      setShowAddItem(false);
      resetItemForm();
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to create item", variant: "destructive" }); },
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: any) => { await apiRequest("PATCH", `/api/inventory/items/${id}`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/inventory") });
      toast({ title: "Item Updated" });
      setEditingItem(null);
      resetItemForm();
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to update item", variant: "destructive" }); },
  });

  const receiveStock = useMutation({
    mutationFn: async ({ itemId, ...data }: any) => { await apiRequest("POST", `/api/inventory/items/${itemId}/receive`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/inventory") });
      toast({ title: "Stock Received", description: "Stock has been added to inventory." });
      setReceiveDialog(null);
      setReceiveForm({ quantity: "", unitPrice: "", notes: "" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to receive stock", variant: "destructive" }); },
  });

  const adjustStock = useMutation({
    mutationFn: async ({ itemId, ...data }: any) => { await apiRequest("POST", `/api/inventory/items/${itemId}/adjust`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/inventory") });
      toast({ title: "Stock Adjusted" });
      setAdjustDialog(null);
      setAdjustForm({ quantityDelta: "", notes: "" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to adjust stock", variant: "destructive" }); },
  });

  const sellItem = useMutation({
    mutationFn: async ({ itemId, ...data }: any) => { await apiRequest("POST", `/api/inventory/items/${itemId}/sell`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/inventory") });
      toast({ title: "Item Sold", description: "Sale recorded and stock deducted." });
      setSellDialog(null);
      setSellForm({ quantity: "", unitPrice: "", buyerName: "", notes: "" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to sell item", variant: "destructive" }); },
  });

  const recordUsage = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/inventory/session-usage", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/inventory") });
      toast({ title: "Usage Recorded", description: "Session usage has been logged." });
      setUsageDialog(null);
      setUsageForm({ sessionId: "", quantity: "", notes: "" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to record usage", variant: "destructive" }); },
  });

  const createExpense = useMutation({
    mutationFn: async (data: any) => { await apiRequest("POST", "/api/expenses", data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/expenses") });
      toast({ title: "Expense Added" });
      setShowAddExpense(false);
      setExpenseForm({ name: "", amount: "", notes: "" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to add expense", variant: "destructive" }); },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...data }: any) => { await apiRequest("PATCH", `/api/expenses/${id}`, data); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/expenses") });
      toast({ title: "Expense Updated" });
      setEditingExpense(null);
      setExpenseForm({ name: "", amount: "", notes: "" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to update expense", variant: "destructive" }); },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/expenses/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => typeof q.queryKey[0] === "string" && (q.queryKey[0] as string).startsWith("/api/expenses") });
      toast({ title: "Expense Deleted" });
    },
    onError: (err: any) => { toast({ title: "Error", description: err.message || "Failed to delete expense", variant: "destructive" }); },
  });

  function resetItemForm() {
    setItemForm({ name: "", supplier: "", unitPrice: "", stockAvailable: "0", isSessionLinked: false, canBeSold: false, notes: "" });
  }

  function openEditItem(item: InventoryItem) {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      supplier: item.supplier || "",
      unitPrice: String(item.unitPrice),
      stockAvailable: String(item.stockAvailable),
      isSessionLinked: item.isSessionLinked,
      canBeSold: item.canBeSold,
      notes: item.notes || "",
    });
  }

  function openEditExpense(expense: ExpenseEntry) {
    setEditingExpense(expense);
    setExpenseForm({ name: expense.name, amount: String(expense.amount), notes: expense.notes || "" });
  }

  const defaultClubId = adminClubs.length === 1 ? adminClubs[0].id : null;
  const effectiveClubId = selectedClubId !== "all" ? Number(selectedClubId) : defaultClubId;

  const totalStockValue = useMemo(() => items.reduce((sum, i) => sum + i.stockAvailable * i.unitPrice, 0), [items]);
  const totalExpensesAmount = useMemo(() => expensesList.reduce((sum, e) => sum + e.amount, 0), [expensesList]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin">
          <Button variant="ghost" size="icon" data-testid="button-back-admin">
            <ArrowLeft />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-inventory-title">Inventory & Expenses</h1>
          <p className="text-sm text-muted-foreground">Manage stock, track usage, and record expenses</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedClubId} onValueChange={setSelectedClubId}>
          <SelectTrigger className="w-[200px]" data-testid="select-club-filter">
            <SelectValue placeholder="All Clubs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clubs</SelectItem>
            {adminClubs.map((c: any) => (
              <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-inventory"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-items">{items.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
            <Box className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-value">{formatPounds(totalStockValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-expenses">{formatPounds(totalExpensesAmount)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-inventory">
          <TabsTrigger value="items" data-testid="tab-items">Items</TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">Stock Log</TabsTrigger>
          <TabsTrigger value="expenses" data-testid="tab-expenses">Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { resetItemForm(); setShowAddItem(true); }} data-testid="button-add-item">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </div>

          {loadingItems ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : filteredItems.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No inventory items found</CardContent></Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                      <TableCell>
                        <div className="font-medium" data-testid={`text-item-name-${item.id}`}>{item.name}</div>
                        {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{item.supplier || "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatPounds(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.stockAvailable <= 5 ? "text-red-500 font-bold" : "font-medium"} data-testid={`text-stock-${item.id}`}>
                          {item.stockAvailable}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.isSessionLinked && <Badge variant="secondary">Session</Badge>}
                          {item.canBeSold && <Badge variant="outline">Sellable</Badge>}
                          {!item.isActive && <Badge variant="destructive">Inactive</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end flex-wrap gap-1">
                          <Button size="sm" variant="outline" onClick={() => { setReceiveForm({ quantity: "", unitPrice: String(item.unitPrice), notes: "" }); setReceiveDialog(item); }} data-testid={`button-receive-${item.id}`}>
                            <ArrowDown className="w-3 h-3 mr-1" /> Receive
                          </Button>
                          {item.canBeSold && (
                            <Button size="sm" variant="outline" onClick={() => { setSellForm({ quantity: "1", unitPrice: String(item.unitPrice), buyerName: "", notes: "" }); setSellDialog(item); }} data-testid={`button-sell-${item.id}`}>
                              <ShoppingCart className="w-3 h-3 mr-1" /> Sell
                            </Button>
                          )}
                          {item.isSessionLinked && (
                            <Button size="sm" variant="outline" onClick={() => { setUsageForm({ sessionId: "", quantity: "1", notes: "" }); setUsageDialog(item); }} data-testid={`button-usage-${item.id}`}>
                              <Wrench className="w-3 h-3 mr-1" /> Use
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setAdjustForm({ quantityDelta: "", notes: "" }); setAdjustDialog(item); }} data-testid={`button-adjust-${item.id}`}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openEditItem(item)} data-testid={`button-edit-${item.id}`}>
                            <ClipboardList className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          {loadingMovements ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : movements.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No stock movements recorded</CardContent></Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map(m => (
                    <TableRow key={m.id} data-testid={`row-movement-${m.id}`}>
                      <TableCell className="text-sm">{format(new Date(m.createdAt), "dd MMM yyyy HH:mm")}</TableCell>
                      <TableCell className="font-medium">{m.itemName}</TableCell>
                      <TableCell>{getMovementBadge(m.movementType)}</TableCell>
                      <TableCell className="text-right">
                        <span className={m.quantityDelta > 0 ? "text-green-600" : "text-red-500"}>
                          {m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{m.totalAmount ? formatPounds(m.totalAmount) : "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.buyerName && <span>Buyer: {m.buyerName} </span>}
                        {m.sessionId && <span>Session #{m.sessionId} </span>}
                        {m.notes && <span>{m.notes}</span>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{m.createdByName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setExpenseForm({ name: "", amount: "", notes: "" }); setShowAddExpense(true); }} data-testid="button-add-expense">
              <Plus className="w-4 h-4 mr-2" /> Add Expense
            </Button>
          </div>

          {loadingExpenses ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : expensesList.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No expenses recorded</CardContent></Card>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expensesList.map(e => (
                    <TableRow key={e.id} data-testid={`row-expense-${e.id}`}>
                      <TableCell className="text-sm">{format(new Date(e.createdAt), "dd MMM yyyy")}</TableCell>
                      <TableCell className="font-medium" data-testid={`text-expense-name-${e.id}`}>{e.name}</TableCell>
                      <TableCell className="text-sm">{e.clubName}</TableCell>
                      <TableCell className="text-right font-medium">{formatPounds(e.amount)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.notes || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.createdByName}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditExpense(e)} data-testid={`button-edit-expense-${e.id}`}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => deleteExpense.mutate(e.id)} data-testid={`button-delete-expense-${e.id}`}>
                            <TrendingDown className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add / Edit Item Dialog */}
      <Dialog open={showAddItem || !!editingItem} onOpenChange={(o) => { if (!o) { setShowAddItem(false); setEditingItem(null); resetItemForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Inventory Item"}</DialogTitle>
            <DialogDescription>{editingItem ? "Update the item details" : "Create a new inventory item for your club"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingItem && adminClubs.length > 1 && (
              <div>
                <Label>Club</Label>
                <Select value={selectedClubId !== "all" ? selectedClubId : ""} onValueChange={v => setSelectedClubId(v)}>
                  <SelectTrigger data-testid="select-item-club"><SelectValue placeholder="Select club" /></SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Item Name</Label>
              <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Shuttle Tubes" data-testid="input-item-name" />
            </div>
            <div>
              <Label>Supplier / Source</Label>
              <Input value={itemForm.supplier} onChange={e => setItemForm(f => ({ ...f, supplier: e.target.value }))} placeholder="e.g., Yonex" data-testid="input-item-supplier" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Unit Price (pence)</Label>
                <Input type="number" value={itemForm.unitPrice} onChange={e => setItemForm(f => ({ ...f, unitPrice: e.target.value }))} placeholder="0" data-testid="input-item-price" />
              </div>
              {!editingItem && (
                <div>
                  <Label>Initial Stock</Label>
                  <Input type="number" value={itemForm.stockAvailable} onChange={e => setItemForm(f => ({ ...f, stockAvailable: e.target.value }))} placeholder="0" data-testid="input-item-stock" />
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={itemForm.isSessionLinked} onCheckedChange={v => setItemForm(f => ({ ...f, isSessionLinked: v }))} data-testid="switch-session-linked" />
                <Label>Linked to Sessions</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={itemForm.canBeSold} onCheckedChange={v => setItemForm(f => ({ ...f, canBeSold: v }))} data-testid="switch-can-sell" />
                <Label>Can Be Sold</Label>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" data-testid="input-item-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddItem(false); setEditingItem(null); resetItemForm(); }}>Cancel</Button>
            <Button
              disabled={createItem.isPending || updateItem.isPending}
              data-testid="button-save-item"
              onClick={() => {
                const clubId = editingItem?.clubId || effectiveClubId;
                if (!clubId) { toast({ title: "Select a club", variant: "destructive" }); return; }
                if (!itemForm.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
                if (editingItem) {
                  updateItem.mutate({
                    id: editingItem.id,
                    name: itemForm.name,
                    supplier: itemForm.supplier || null,
                    unitPrice: Number(itemForm.unitPrice) || 0,
                    isSessionLinked: itemForm.isSessionLinked,
                    canBeSold: itemForm.canBeSold,
                    notes: itemForm.notes || null,
                  });
                } else {
                  createItem.mutate({
                    clubId,
                    name: itemForm.name,
                    supplier: itemForm.supplier || undefined,
                    unitPrice: Number(itemForm.unitPrice) || 0,
                    stockAvailable: Number(itemForm.stockAvailable) || 0,
                    isSessionLinked: itemForm.isSessionLinked,
                    canBeSold: itemForm.canBeSold,
                    notes: itemForm.notes || undefined,
                  });
                }
              }}
            >
              {(createItem.isPending || updateItem.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingItem ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Stock Dialog */}
      <Dialog open={!!receiveDialog} onOpenChange={(o) => { if (!o) setReceiveDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Receive Stock - {receiveDialog?.name}</DialogTitle>
            <DialogDescription>Add new stock to this inventory item</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={receiveForm.quantity} onChange={e => setReceiveForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" data-testid="input-receive-qty" />
            </div>
            <div>
              <Label>Unit Price (pence)</Label>
              <Input type="number" value={receiveForm.unitPrice} onChange={e => setReceiveForm(f => ({ ...f, unitPrice: e.target.value }))} data-testid="input-receive-price" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={receiveForm.notes} onChange={e => setReceiveForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-receive-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialog(null)}>Cancel</Button>
            <Button
              disabled={receiveStock.isPending}
              data-testid="button-confirm-receive"
              onClick={() => {
                const qty = Number(receiveForm.quantity);
                const price = Number(receiveForm.unitPrice);
                if (!qty || qty < 1) { toast({ title: "Enter a valid quantity", variant: "destructive" }); return; }
                receiveStock.mutate({ itemId: receiveDialog!.id, quantity: qty, unitPrice: price, notes: receiveForm.notes || undefined });
              }}
            >
              {receiveStock.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Receive Stock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog open={!!adjustDialog} onOpenChange={(o) => { if (!o) setAdjustDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {adjustDialog?.name}</DialogTitle>
            <DialogDescription>Current stock: {adjustDialog?.stockAvailable}. Enter positive to add, negative to remove.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantity Change</Label>
              <Input type="number" value={adjustForm.quantityDelta} onChange={e => setAdjustForm(f => ({ ...f, quantityDelta: e.target.value }))} placeholder="e.g., -2 or +5" data-testid="input-adjust-qty" />
            </div>
            <div>
              <Label>Reason (required)</Label>
              <Input value={adjustForm.notes} onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))} placeholder="Reason for adjustment" data-testid="input-adjust-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustDialog(null)}>Cancel</Button>
            <Button
              disabled={adjustStock.isPending}
              data-testid="button-confirm-adjust"
              onClick={() => {
                const delta = Number(adjustForm.quantityDelta);
                if (!delta || !adjustForm.notes.trim()) { toast({ title: "Quantity and reason required", variant: "destructive" }); return; }
                adjustStock.mutate({ itemId: adjustDialog!.id, quantityDelta: delta, notes: adjustForm.notes });
              }}
            >
              {adjustStock.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adjust
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sell Item Dialog */}
      <Dialog open={!!sellDialog} onOpenChange={(o) => { if (!o) setSellDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell - {sellDialog?.name}</DialogTitle>
            <DialogDescription>Stock available: {sellDialog?.stockAvailable}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quantity</Label>
              <Input type="number" value={sellForm.quantity} onChange={e => setSellForm(f => ({ ...f, quantity: e.target.value }))} data-testid="input-sell-qty" />
            </div>
            <div>
              <Label>Sell Price per Unit (pence)</Label>
              <Input type="number" value={sellForm.unitPrice} onChange={e => setSellForm(f => ({ ...f, unitPrice: e.target.value }))} data-testid="input-sell-price" />
            </div>
            <div>
              <Label>Buyer Name</Label>
              <Input value={sellForm.buyerName} onChange={e => setSellForm(f => ({ ...f, buyerName: e.target.value }))} placeholder="Name of buyer" data-testid="input-sell-buyer" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={sellForm.notes} onChange={e => setSellForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-sell-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialog(null)}>Cancel</Button>
            <Button
              disabled={sellItem.isPending}
              data-testid="button-confirm-sell"
              onClick={() => {
                const qty = Number(sellForm.quantity);
                const price = Number(sellForm.unitPrice);
                if (!qty || qty < 1) { toast({ title: "Enter quantity", variant: "destructive" }); return; }
                if (!sellForm.buyerName.trim()) { toast({ title: "Enter buyer name", variant: "destructive" }); return; }
                sellItem.mutate({ itemId: sellDialog!.id, quantity: qty, unitPrice: price, buyerName: sellForm.buyerName, notes: sellForm.notes || undefined });
              }}
            >
              {sellItem.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Sale
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Usage Dialog */}
      <Dialog open={!!usageDialog} onOpenChange={(o) => { if (!o) setUsageDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Session Usage - {usageDialog?.name}</DialogTitle>
            <DialogDescription>Stock available: {usageDialog?.stockAvailable}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Session ID</Label>
              <Input type="number" value={usageForm.sessionId} onChange={e => setUsageForm(f => ({ ...f, sessionId: e.target.value }))} placeholder="Session ID" data-testid="input-usage-session" />
            </div>
            <div>
              <Label>Quantity Used</Label>
              <Input type="number" value={usageForm.quantity} onChange={e => setUsageForm(f => ({ ...f, quantity: e.target.value }))} data-testid="input-usage-qty" />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={usageForm.notes} onChange={e => setUsageForm(f => ({ ...f, notes: e.target.value }))} data-testid="input-usage-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUsageDialog(null)}>Cancel</Button>
            <Button
              disabled={recordUsage.isPending}
              data-testid="button-confirm-usage"
              onClick={() => {
                const sessionId = Number(usageForm.sessionId);
                const qty = Number(usageForm.quantity);
                if (!sessionId || !qty || qty < 1) { toast({ title: "Session ID and quantity required", variant: "destructive" }); return; }
                recordUsage.mutate({ sessionId, itemId: usageDialog!.id, quantity: qty, notes: usageForm.notes || undefined });
              }}
            >
              {recordUsage.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Record Usage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Expense Dialog */}
      <Dialog open={showAddExpense || !!editingExpense} onOpenChange={(o) => { if (!o) { setShowAddExpense(false); setEditingExpense(null); setExpenseForm({ name: "", amount: "", notes: "" }); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Add Expense"}</DialogTitle>
            <DialogDescription>{editingExpense ? "Update expense details" : "Record a new club expense"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingExpense && adminClubs.length > 1 && (
              <div>
                <Label>Club</Label>
                <Select value={selectedClubId !== "all" ? selectedClubId : ""} onValueChange={v => setSelectedClubId(v)}>
                  <SelectTrigger data-testid="select-expense-club"><SelectValue placeholder="Select club" /></SelectTrigger>
                  <SelectContent>
                    {adminClubs.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Description</Label>
              <Input value={expenseForm.name} onChange={e => setExpenseForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Net replacement" data-testid="input-expense-name" />
            </div>
            <div>
              <Label>Amount (pence)</Label>
              <Input type="number" value={expenseForm.amount} onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" data-testid="input-expense-amount" />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} className="resize-none" data-testid="input-expense-notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddExpense(false); setEditingExpense(null); }}>Cancel</Button>
            <Button
              disabled={createExpense.isPending || updateExpense.isPending}
              data-testid="button-save-expense"
              onClick={() => {
                const clubId = editingExpense?.clubId || effectiveClubId;
                if (!clubId) { toast({ title: "Select a club", variant: "destructive" }); return; }
                if (!expenseForm.name.trim()) { toast({ title: "Description required", variant: "destructive" }); return; }
                const amount = Number(expenseForm.amount);
                if (!amount || amount < 1) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
                if (editingExpense) {
                  updateExpense.mutate({ id: editingExpense.id, name: expenseForm.name, amount, notes: expenseForm.notes || null });
                } else {
                  createExpense.mutate({ clubId, name: expenseForm.name, amount, notes: expenseForm.notes || undefined });
                }
              }}
            >
              {(createExpense.isPending || updateExpense.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingExpense ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
