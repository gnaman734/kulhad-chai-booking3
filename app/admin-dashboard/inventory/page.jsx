"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Plus, Edit, Trash2, PackageSearch, AlertTriangle, History, Link as LinkIcon, BarChart3 } from "lucide-react";
import { inventoryService, subscribeToInventory, subscribeToInventoryAlerts, subscribeToStockMovements } from "@/lib/database";
import { menuItemsService } from "@/lib/database";

export default function InventoryDashboard() {
  // Items tab state
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const [adjustDelta, setAdjustDelta] = useState(0);
  const [adjustReason, setAdjustReason] = useState("Manual adjustment");
  const [newItem, setNewItem] = useState({
    name: "",
    sku: "",
    category: "",
    unit: "pcs",
    reorderThreshold: 0,
    reorderQuantity: 0,
    quantityOnHand: 0,
    isActive: true
  });

  // Mappings tab state
  const [mappings, setMappings] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [isAddMappingOpen, setIsAddMappingOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({ menuItemId: "", inventoryItemId: "", unitsPerItem: 1 });

  // Alerts tab state
  const [alerts, setAlerts] = useState([]);

  // History tab state
  const [movements, setMovements] = useState([]);
  const [historyItemFilter, setHistoryItemFilter] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("all");

  // Reports tab state
  const [stockSummary, setStockSummary] = useState({});
  const [lowStockReport, setLowStockReport] = useState([]);
  const [usageReport, setUsageReport] = useState([]);

  useEffect(() => {
    loadItems();
    const unsubscribeItems = subscribeToInventory(async () => {
      await loadItems();
    });
    loadAlerts();
    const unsubscribeAlerts = subscribeToInventoryAlerts(async () => {
      await loadAlerts();
    });
    const unsubscribeMovements = subscribeToStockMovements(async () => {
      await loadMovements();
    });
    loadMenuItems();
    loadMappings();
    loadReports();
    return () => {
      unsubscribeItems?.();
      unsubscribeAlerts?.();
      unsubscribeMovements?.();
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const cats = new Set(items.map(i => i.category || "Uncategorized"));
    return ["all", ...Array.from(cats)];
  }, [items]);

  const loadItems = async () => {
    try {
      setLoadingItems(true);
      const data = await inventoryService.getAll({});
      setItems(data);
    } catch (err) {
      console.error("Failed to load inventory items:", err);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    let res = items;
    if (searchTerm) {
      res = res.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.sku?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (categoryFilter !== "all") {
      res = res.filter(i => (i.category || "Uncategorized") === categoryFilter);
    }
    if (lowStockOnly) {
      res = res.filter(i => i.reorderThreshold > 0 && i.quantityOnHand <= i.reorderThreshold);
    }
    setFilteredItems(res);
  }, [items, searchTerm, categoryFilter, lowStockOnly]);

  const addItem = async () => {
    if (!newItem.name) return;
    try {
      const payload = {
        ...newItem,
        reorderThreshold: Number(newItem.reorderThreshold) || 0,
        reorderQuantity: Number(newItem.reorderQuantity) || 0,
        quantityOnHand: Number(newItem.quantityOnHand) || 0,
      };
      const created = await inventoryService.create(payload);
      setItems(prev => [...prev, created]);
      setIsAddItemOpen(false);
      setNewItem({ name: "", sku: "", category: "", unit: "pcs", reorderThreshold: 0, reorderQuantity: 0, quantityOnHand: 0, isActive: true });
    } catch (err) {
      console.error("Failed to create inventory item:", err);
    }
  };

  const updateItem = async (id, updates) => {
    try {
      const updated = await inventoryService.update(id, updates);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } catch (err) {
      console.error("Failed to update inventory item:", err);
    }
  };

  const softDeleteItem = async (id) => {
    try {
      await inventoryService.softDelete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      console.error("Failed to delete inventory item:", err);
    }
  };

  const loadMenuItems = async () => {
    try {
      const data = await menuItemsService.getAll();
      setMenuItems(data);
    } catch (err) {
      console.error("Failed to load menu items:", err);
    }
  };

  const loadMappings = async () => {
    try {
      const data = await inventoryService.getMenuMappings();
      setMappings(data);
    } catch (err) {
      console.error("Failed to load mappings:", err);
    }
  };

  const addMapping = async () => {
    if (!newMapping.menuItemId || !newMapping.inventoryItemId) return;
    try {
      const created = await inventoryService.createMenuMapping({
        menuItemId: Number(newMapping.menuItemId),
        inventoryItemId: Number(newMapping.inventoryItemId),
        unitsPerItem: Number(newMapping.unitsPerItem) || 1
      });
      setMappings(prev => [...prev, created]);
      setIsAddMappingOpen(false);
      setNewMapping({ menuItemId: "", inventoryItemId: "", unitsPerItem: 1 });
    } catch (err) {
      console.error("Failed to create mapping:", err);
    }
  };

  const deleteMapping = async (id) => {
    try {
      await inventoryService.deleteMenuMapping(id);
      setMappings(prev => prev.filter(m => m.id !== id));
    } catch (err) {
      console.error("Failed to delete mapping:", err);
    }
  };

  const loadAlerts = async () => {
    try {
      const data = await inventoryService.getAlerts({ onlyOpen: true });
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts:", err);
    }
  };

  const acknowledgeAlert = async (id) => {
    try {
      await inventoryService.acknowledgeAlert(id);
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const loadMovements = async () => {
    try {
      const type = historyTypeFilter === "all" ? undefined : historyTypeFilter;
      const itemId = historyItemFilter ? Number(historyItemFilter) : undefined;
      const data = await inventoryService.getMovements({ itemId, type, limit: 50 });
      setMovements(data);
    } catch (err) {
      console.error("Failed to load stock movements:", err);
    }
  };

  useEffect(() => { loadMovements(); }, [historyItemFilter, historyTypeFilter]);

  const loadReports = async () => {
    try {
      const [summary, low, usage] = await Promise.all([
        inventoryService.getStockSummary(),
        inventoryService.getLowStockReport(),
        inventoryService.getUsageReport({})
      ]);
      setStockSummary(summary);
      setLowStockReport(low);
      setUsageReport(usage);
    } catch (err) {
      console.error("Failed to load reports:", err);
    }
  };

  const formatQty = (qty, unit) => `${qty}${unit ? ' ' + unit : ''}`;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <AdminSidebar />
        <div className="flex-1 p-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Inventory Management</h1>
                <p className="text-muted-foreground">Track stock, mappings, alerts, and reports in real-time</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="items" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="items" className="flex items-center gap-2"><PackageSearch className="h-4 w-4" />Items</TabsTrigger>
              <TabsTrigger value="mappings" className="flex items-center gap-2"><LinkIcon className="h-4 w-4" />Mappings</TabsTrigger>
              <TabsTrigger value="alerts" className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Alerts</TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2"><History className="h-4 w-4" />History</TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Reports</TabsTrigger>
            </TabsList>

            {/* Items Tab */}
            <TabsContent value="items" className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                    <PackageSearch className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{items.length}</div>
                    <p className="text-xs text-muted-foreground">Active inventory items</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{items.filter(i => i.reorderThreshold > 0 && i.quantityOnHand <= i.reorderThreshold && i.quantityOnHand > 0).length}</div>
                    <p className="text-xs text-muted-foreground">Items below threshold</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{items.filter(i => i.quantityOnHand <= 0).length}</div>
                    <p className="text-xs text-muted-foreground">Items with 0 quantity</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Categories</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{categoryOptions.filter(c => c !== "all").length}</div>
                    <p className="text-xs text-muted-foreground">Distinct categories</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters and Actions */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                      <Input placeholder="Search by name or SKU" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="w-full md:w-56">
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat === "all" ? "All Categories" : cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch id="lowStock" checked={lowStockOnly} onCheckedChange={setLowStockOnly} />
                      <Label htmlFor="lowStock">Low stock only</Label>
                    </div>
                    <div className="flex-0">
                      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Item
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Inventory Item</DialogTitle>
                          </DialogHeader>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Name *</Label>
                              <Input value={newItem.name} onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))} />
                            </div>
                            <div>
                              <Label>SKU</Label>
                              <Input value={newItem.sku} onChange={e => setNewItem(prev => ({ ...prev, sku: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Category</Label>
                              <Input value={newItem.category} onChange={e => setNewItem(prev => ({ ...prev, category: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Unit</Label>
                              <Input value={newItem.unit} onChange={e => setNewItem(prev => ({ ...prev, unit: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Reorder Threshold</Label>
                              <Input type="number" value={newItem.reorderThreshold} onChange={e => setNewItem(prev => ({ ...prev, reorderThreshold: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Reorder Quantity</Label>
                              <Input type="number" value={newItem.reorderQuantity} onChange={e => setNewItem(prev => ({ ...prev, reorderQuantity: e.target.value }))} />
                            </div>
                            <div>
                              <Label>Quantity On Hand</Label>
                              <Input type="number" value={newItem.quantityOnHand} onChange={e => setNewItem(prev => ({ ...prev, quantityOnHand: e.target.value }))} />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>Cancel</Button>
                            <Button onClick={addItem}>Add Item</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items List */}
              <Card>
                <CardHeader>
                  <CardTitle>Inventory Items ({filteredItems.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingItems ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-muted-foreground mt-2">Loading inventory...</p>
                    </div>
                  ) : filteredItems.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>On Hand</TableHead>
                          <TableHead>Reorder</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredItems.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-xs text-muted-foreground">{item.unit}</div>
                            </TableCell>
                            <TableCell>{item.sku || "-"}</TableCell>
                            <TableCell>{item.category || "Uncategorized"}</TableCell>
                            <TableCell>
                              {item.quantityOnHand <= 0 ? (
                                <Badge variant="destructive">Out of Stock</Badge>
                              ) : item.reorderThreshold > 0 && item.quantityOnHand <= item.reorderThreshold ? (
                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                                  Low: {formatQty(item.quantityOnHand, item.unit)}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  {formatQty(item.quantityOnHand, item.unit)}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{item.reorderThreshold > 0 ? `${item.reorderThreshold} → ${item.reorderQuantity}` : "-"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button size="sm" variant="secondary" onClick={() => { setAdjustItem(item); setAdjustDelta(1); setAdjustReason("Manual adjustment"); setIsAdjustOpen(true); }}>
                                  Adjust
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setEditingItem(item)}>
                                  <Edit className="h-3 w-3 mr-1" />Edit
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => softDeleteItem(item.id)} className="text-red-600">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <PackageSearch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No inventory items found</h3>
                      <p className="text-muted-foreground mb-4">Add your first inventory item to start tracking stock.</p>
                      <Button onClick={() => setIsAddItemOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Edit dialog */}
              <Dialog open={!!editingItem} onOpenChange={open => !open && setEditingItem(null)}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Inventory Item</DialogTitle>
                  </DialogHeader>
                  {editingItem && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={editingItem.name} onChange={e => setEditingItem(prev => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>SKU</Label>
                        <Input value={editingItem.sku || ""} onChange={e => setEditingItem(prev => ({ ...prev, sku: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Category</Label>
                        <Input value={editingItem.category || ""} onChange={e => setEditingItem(prev => ({ ...prev, category: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Input value={editingItem.unit || "pcs"} onChange={e => setEditingItem(prev => ({ ...prev, unit: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Reorder Threshold</Label>
                        <Input type="number" value={editingItem.reorderThreshold || 0} onChange={e => setEditingItem(prev => ({ ...prev, reorderThreshold: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <Label>Reorder Quantity</Label>
                        <Input type="number" value={editingItem.reorderQuantity || 0} onChange={e => setEditingItem(prev => ({ ...prev, reorderQuantity: Number(e.target.value) }))} />
                      </div>
                      <div>
                        <Label>Quantity On Hand</Label>
                        <Input type="number" value={editingItem.quantityOnHand || 0} onChange={e => setEditingItem(prev => ({ ...prev, quantityOnHand: Number(e.target.value) }))} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                    <Button onClick={() => {
                      if (!editingItem) return;
                      updateItem(editingItem.id, {
                        name: editingItem.name,
                        sku: editingItem.sku,
                        category: editingItem.category,
                        unit: editingItem.unit,
                        reorderThreshold: editingItem.reorderThreshold,
                        reorderQuantity: editingItem.reorderQuantity,
                        quantityOnHand: editingItem.quantityOnHand
                      });
                      setEditingItem(null);
                    }}>Save Changes</Button>
                  </div>
                </DialogContent>
              </Dialog>

              {/* Adjust stock dialog */}
              <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adjust Stock</DialogTitle>
                  </DialogHeader>
                  {adjustItem && (
                    <div className="space-y-4">
                      <div>
                        <Label>Item</Label>
                        <div className="text-sm font-medium">{adjustItem.name}</div>
                        <div className="text-xs text-muted-foreground">Current: {formatQty(adjustItem.quantityOnHand, adjustItem.unit)}</div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Quantity Change</Label>
                          <Input type="number" value={adjustDelta} onChange={e => setAdjustDelta(Number(e.target.value))} />
                          <p className="text-xs text-muted-foreground mt-1">Use positive to increase, negative to decrease.</p>
                        </div>
                        <div>
                          <Label>Reason</Label>
                          <Input value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
                        <Button onClick={async () => {
                          try {
                            if (!adjustItem || !adjustDelta) return;
                            await inventoryService.adjustStock(adjustItem.id, Number(adjustDelta), adjustReason);
                            setIsAdjustOpen(false);
                            setAdjustItem(null);
                            setAdjustDelta(0);
                            setAdjustReason("Manual adjustment");
                            await Promise.all([loadItems(), loadMovements(), loadAlerts()]);
                          } catch (err) {
                            console.error("Failed to adjust stock:", err);
                          }
                        }}>Apply</Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            {/* Mappings Tab */}
            <TabsContent value="mappings" className="space-y-6">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <CardTitle>Menu → Inventory Mappings ({mappings.length})</CardTitle>
                  <Dialog open={isAddMappingOpen} onOpenChange={setIsAddMappingOpen}>
                    <DialogTrigger asChild>
                      <Button><Plus className="h-4 w-4 mr-2" />Add Mapping</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Mapping</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Menu Item *</Label>
                          <Select value={newMapping.menuItemId} onValueChange={val => setNewMapping(prev => ({ ...prev, menuItemId: val }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {menuItems.map(mi => (
                                <SelectItem key={mi.id} value={String(mi.id)}>{mi.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Inventory Item *</Label>
                          <Select value={newMapping.inventoryItemId} onValueChange={val => setNewMapping(prev => ({ ...prev, inventoryItemId: val }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {items.map(ii => (
                                <SelectItem key={ii.id} value={String(ii.id)}>{ii.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Units Per Menu Item</Label>
                          <Input type="number" value={newMapping.unitsPerItem} onChange={e => setNewMapping(prev => ({ ...prev, unitsPerItem: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-6">
                        <Button variant="outline" onClick={() => setIsAddMappingOpen(false)}>Cancel</Button>
                        <Button onClick={addMapping}>Create</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {mappings.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Menu Item</TableHead>
                          <TableHead>Inventory Item</TableHead>
                          <TableHead>Units Per Item</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mappings.map(m => {
                          const mi = menuItems.find(x => x.id === m.menuItemId);
                          const ii = items.find(x => x.id === m.inventoryItemId);
                          return (
                            <TableRow key={m.id}>
                              <TableCell>{mi?.name || m.menuItemId}</TableCell>
                              <TableCell>{ii?.name || m.inventoryItemId}</TableCell>
                              <TableCell>{m.unitsPerItem}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" className="text-red-600" onClick={() => deleteMapping(m.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No mappings yet</h3>
                      <p className="text-muted-foreground mb-4">Create mappings to auto-consume stock when orders are placed.</p>
                      <Button onClick={() => setIsAddMappingOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Mapping</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Alerts Tab */}
            <TabsContent value="alerts" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Low Stock Alerts ({alerts.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {alerts.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Current Qty</TableHead>
                          <TableHead>Threshold</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {alerts.map(a => {
                          const ii = items.find(x => x.id === a.itemId);
                          return (
                            <TableRow key={a.id}>
                              <TableCell>{ii?.name || a.itemId}</TableCell>
                              <TableCell>{a.currentQty}</TableCell>
                              <TableCell>{a.threshold}</TableCell>
                              <TableCell>
                                <Button size="sm" variant="outline" onClick={() => acknowledgeAlert(a.id)}>Acknowledge</Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No active alerts</h3>
                      <p className="text-muted-foreground">Alerts appear automatically when stock falls below thresholds.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stock Movements</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-64">
                      <Label>Filter by Item</Label>
                      <Select value={historyItemFilter} onValueChange={setHistoryItemFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Items</SelectItem>
                          {items.map(ii => (
                            <SelectItem key={ii.id} value={String(ii.id)}>{ii.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-full md:w-64">
                      <Label>Type</Label>
                      <Select value={historyTypeFilter} onValueChange={setHistoryTypeFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="adjustment">Adjustment</SelectItem>
                          <SelectItem value="sale">Sale</SelectItem>
                          <SelectItem value="purchase">Purchase</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {movements.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Item</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Change</TableHead>
                          <TableHead>Before → After</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movements.map(m => {
                          const ii = items.find(x => x.id === m.itemId);
                          return (
                            <TableRow key={m.id}>
                              <TableCell>{new Date(m.createdAt).toLocaleString()}</TableCell>
                              <TableCell>{ii?.name || m.itemId}</TableCell>
                              <TableCell>{m.type}</TableCell>
                              <TableCell>{m.quantityChange}</TableCell>
                              <TableCell>{m.beforeQty} → {m.afterQty}</TableCell>
                              <TableCell>{m.sourceType ? `${m.sourceType}${m.sourceId ? ` #${m.sourceId}` : ""}` : "-"}</TableCell>
                              <TableCell className="max-w-[240px] truncate">{m.notes || "-"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-12">
                      <History className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No history for selected filters</h3>
                      <p className="text-muted-foreground">Try changing filters to see movements.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reports Tab */}
            <TabsContent value="reports" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Categories Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(stockSummary).map(([cat, data]) => (
                        <div key={cat} className="flex items-center justify-between">
                          <span className="font-medium">{cat}</span>
                          <div className="text-sm text-muted-foreground">Qty: {data.totalQty} • Low: {data.lowItems}</div>
                        </div>
                      ))}
                      {Object.keys(stockSummary).length === 0 && (
                        <p className="text-muted-foreground">No data available</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle>Low Stock Items ({lowStockReport.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lowStockReport.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>On Hand</TableHead>
                            <TableHead>Threshold</TableHead>
                            <TableHead>Reorder Qty</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lowStockReport.map(i => (
                            <TableRow key={i.id}>
                              <TableCell>{i.name}</TableCell>
                              <TableCell>{i.category || "Uncategorized"}</TableCell>
                              <TableCell>{i.quantityOnHand}</TableCell>
                              <TableCell>{i.reorderThreshold}</TableCell>
                              <TableCell>{i.reorderQuantity}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <p className="text-muted-foreground">No items are currently below threshold.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Report</CardTitle>
                </CardHeader>
                <CardContent>
                  {usageReport.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Total Used</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usageReport.map(row => {
                          const ii = items.find(x => x.id === row.itemId);
                          return (
                            <TableRow key={row.itemId}>
                              <TableCell>{ii?.name || row.itemId}</TableCell>
                              <TableCell>{row.totalUsed}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground">No usage data found.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}