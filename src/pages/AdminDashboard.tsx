import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Pencil, Trash2, ArrowLeft, Users, Package, LayoutGrid, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { FoodType } from "@/lib/types";

const CHART_COLORS = ["hsl(24, 95%, 53%)", "hsl(150, 60%, 40%)", "hsl(45, 93%, 47%)", "hsl(200, 70%, 50%)"];

const AdminDashboard = () => {
  const { menu, orders, staff, addMenuItem, updateMenuItem, addStaff, removeStaff } = useStore();
  const [activeTab, setActiveTab] = useState("dashboard");

  // New item form state
  const [newItem, setNewItem] = useState({ name: "", price: 0, type: "food" as FoodType, quantity: 0 });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: 0, quantity: 0, active: true });

  // Staff form
  const [newStaff, setNewStaff] = useState({ name: "", staffId: "", password: "", active: true });

  // Sales data
  const salesByType = [
    { name: "Food", value: orders.reduce((s, o) => s + o.items.filter(i => i.type === "food").reduce((a, i) => a + i.price * i.cartQuantity, 0), 0) },
    { name: "Snacks", value: orders.reduce((s, o) => s + o.items.filter(i => i.type === "snack").reduce((a, i) => a + i.price * i.cartQuantity, 0), 0) },
    { name: "Drinks", value: orders.reduce((s, o) => s + o.items.filter(i => i.type === "drink").reduce((a, i) => a + i.price * i.cartQuantity, 0), 0) },
  ];

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  const handleAddItem = () => {
    if (!newItem.name || newItem.price <= 0) return;
    addMenuItem({ ...newItem, active: true });
    setNewItem({ name: "", price: 0, type: "food", quantity: 0 });
  };

  const handleEditSave = (id: string) => {
    updateMenuItem(id, editForm);
    setEditingItem(null);
  };

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.staffId || !newStaff.password) return;
    addStaff(newStaff);
    setNewStaff({ name: "", staffId: "", password: "", active: true });
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: TrendingUp },
    { id: "inventory", label: "Add Inventory", icon: Plus },
    { id: "menu", label: "Manage Menu", icon: LayoutGrid },
    { id: "staff", label: "Staff", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading font-700 text-xl text-foreground">Admin Panel</h1>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-65px)] bg-card border-r border-border p-4 hidden md:block">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tabs */}
        <div className="md:hidden w-full">
          <div className="flex border-b border-border overflow-x-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-1 min-w-fit px-4 py-3 text-xs font-medium transition-colors ${
                  activeTab === item.id
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 p-6 md:block hidden">
          <AdminContent
            activeTab={activeTab}
            menu={menu}
            orders={orders}
            staff={staff}
            salesByType={salesByType}
            totalRevenue={totalRevenue}
            newItem={newItem}
            setNewItem={setNewItem}
            handleAddItem={handleAddItem}
            editingItem={editingItem}
            setEditingItem={setEditingItem}
            editForm={editForm}
            setEditForm={setEditForm}
            handleEditSave={handleEditSave}
            updateMenuItem={updateMenuItem}
            newStaff={newStaff}
            setNewStaff={setNewStaff}
            handleAddStaff={handleAddStaff}
            removeStaff={removeStaff}
          />
        </main>
      </div>

      {/* Mobile content */}
      <main className="md:hidden p-4">
        <AdminContent
          activeTab={activeTab}
          menu={menu}
          orders={orders}
          staff={staff}
          salesByType={salesByType}
          totalRevenue={totalRevenue}
          newItem={newItem}
          setNewItem={setNewItem}
          handleAddItem={handleAddItem}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          editForm={editForm}
          setEditForm={setEditForm}
          handleEditSave={handleEditSave}
          updateMenuItem={updateMenuItem}
          newStaff={newStaff}
          setNewStaff={setNewStaff}
          handleAddStaff={handleAddStaff}
          removeStaff={removeStaff}
        />
      </main>
    </div>
  );
};

function AdminContent({ activeTab, menu, orders, staff, salesByType, totalRevenue, newItem, setNewItem, handleAddItem, editingItem, setEditingItem, editForm, setEditForm, handleEditSave, updateMenuItem, newStaff, setNewStaff, handleAddStaff, removeStaff }: any) {
  if (activeTab === "dashboard") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-heading font-700 text-2xl">Sales Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <p className="text-muted-foreground text-sm">Total Revenue</p>
            <p className="text-3xl font-heading font-700 text-primary">₹{totalRevenue}</p>
          </Card>
          <Card className="p-6">
            <p className="text-muted-foreground text-sm">Total Orders</p>
            <p className="text-3xl font-heading font-700">{orders.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-muted-foreground text-sm">Menu Items</p>
            <p className="text-3xl font-heading font-700">{menu.length}</p>
          </Card>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="font-heading font-600 mb-4">Sales by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={salesByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card className="p-6">
            <h3 className="font-heading font-600 mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={salesByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {salesByType.map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  }

  if (activeTab === "inventory") {
    return (
      <div className="space-y-6 animate-fade-in max-w-lg">
        <h2 className="font-heading font-700 text-2xl">Add Inventory</h2>
        <Card className="p-6 space-y-4">
          <div>
            <Label>Food Name</Label>
            <Input value={newItem.name} onChange={(e: any) => setNewItem({ ...newItem, name: e.target.value })} placeholder="Enter item name" />
          </div>
          <div>
            <Label>Price (₹)</Label>
            <Input type="number" value={newItem.price || ""} onChange={(e: any) => setNewItem({ ...newItem, price: Number(e.target.value) })} placeholder="0" />
          </div>
          <div>
            <Label>Food Type</Label>
            <Select value={newItem.type} onValueChange={(v: any) => setNewItem({ ...newItem, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
                <SelectItem value="drink">Drink</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Quantity</Label>
            <Input type="number" value={newItem.quantity || ""} onChange={(e: any) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} placeholder="0" />
          </div>
          <Button className="w-full" onClick={handleAddItem}>
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </Card>
      </div>
    );
  }

  if (activeTab === "menu") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-heading font-700 text-2xl">Manage Menu</h2>
        <div className="grid gap-3">
          {menu.map((item: any) => (
            <Card key={item.id} className={`p-4 flex items-center justify-between ${!item.active ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-600">{item.name}</p>
                  <p className="text-sm text-muted-foreground">₹{item.price} · {item.type} · Qty: {item.quantity}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={item.active}
                  onCheckedChange={(checked: boolean) => updateMenuItem(item.id, { active: checked })}
                />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingItem(item.id);
                        setEditForm({ name: item.name, price: item.price, quantity: item.quantity, active: item.active });
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit {item.name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={editForm.name} onChange={(e: any) => setEditForm({ ...editForm, name: e.target.value })} />
                      </div>
                      <div>
                        <Label>Price</Label>
                        <Input type="number" value={editForm.price} onChange={(e: any) => setEditForm({ ...editForm, price: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label>Quantity</Label>
                        <Input type="number" value={editForm.quantity} onChange={(e: any) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} />
                      </div>
                      <Button onClick={() => handleEditSave(item.id)} className="w-full">Save Changes</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (activeTab === "staff") {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-heading font-700 text-2xl">Staff Management</h2>
        <Card className="p-6 space-y-4 max-w-lg">
          <h3 className="font-heading font-600">Add New Staff</h3>
          <div>
            <Label>Name</Label>
            <Input value={newStaff.name} onChange={(e: any) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Staff name" />
          </div>
          <div>
            <Label>Staff ID</Label>
            <Input value={newStaff.staffId} onChange={(e: any) => setNewStaff({ ...newStaff, staffId: e.target.value })} placeholder="e.g., STF001" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={newStaff.password} onChange={(e: any) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Password" />
          </div>
          <Button onClick={handleAddStaff} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Create Staff
          </Button>
        </Card>

        {staff.length > 0 && (
          <div className="grid gap-3">
            <h3 className="font-heading font-600">Current Staff</h3>
            {staff.map((s: any) => (
              <Card key={s.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-600">{s.name}</p>
                  <p className="text-sm text-muted-foreground">ID: {s.staffId}</p>
                </div>
                <Button variant="destructive" size="icon" onClick={() => removeStaff(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default AdminDashboard;
