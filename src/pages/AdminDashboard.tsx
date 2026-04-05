import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, orderBy,
  doc, setDoc, deleteDoc, addDoc, updateDoc
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Pencil, Trash2, ArrowLeft, Users, LayoutGrid, TrendingUp, Eye, EyeOff, Loader2, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";

const CHART_COLORS = ["hsl(24, 95%, 53%)", "hsl(150, 60%, 40%)", "hsl(45, 93%, 47%)", "hsl(200, 70%, 50%)"];

const firebaseConfig = {
  apiKey: "AIzaSyAIAQnTZkJh6YL5QT7O-BTeZRGyX49nbHc",
  authDomain: "food-service-aa0e5.firebaseapp.com",
  projectId: "food-service-aa0e5",
  storageBucket: "food-service-aa0e5.firebasestorage.app",
  messagingSenderId: "193496126694",
  appId: "1:193496126694:web:d07c6325f4fc9eada91727",
};

const secondaryApp = getApps().find(a => a.name === "secondary")
  || initializeApp(firebaseConfig, "secondary");
const secondaryAuth = getAuth(secondaryApp);

interface FirestoreStaff {
  uid: string;
  Name: string;
  Email: string;
  Role: string;
  StaffNumber: number;
}

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  type: "food" | "snack" | "drink";
  countable: boolean;
  quantity?: number;
  available: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  type: string;
  cartQuantity: number;
}

interface FirestoreOrder {
  id: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  paymentMethod: "online" | "cash";
  paymentStatus: "paid" | "pending";
  status: string;
  createdAt: any;
}

// ── Staff Section ──
function StaffSection() {
  const [staffList, setStaffList] = useState<FirestoreStaff[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "BILLING">("STAFF");
  const [showPw, setShowPw] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const fetchStaff = async () => {
    setLoadingList(true);
    try {
      const snap = await getDocs(query(collection(db, "Staff"), orderBy("StaffNumber", "asc")));
      setStaffList(snap.docs.filter(d => ["STAFF", "BILLING"].includes(d.data().Role)).map(d => ({ uid: d.id, ...d.data() } as FirestoreStaff)));
    } catch (e) { console.error(e); }
    finally { setLoadingList(false); }
  };

  useEffect(() => { fetchStaff(); }, []);

  const nextStaffNumber = staffList.length + 1;

  const getAuthError = (code: string) => {
    switch (code) {
      case "auth/email-already-in-use": return "This email is already registered.";
      case "auth/invalid-email": return "Invalid email address.";
      case "auth/weak-password": return "Password must be at least 6 characters.";
      default: return "Failed to create staff. Try again.";
    }
  };

  const handleCreate = async () => {
    setFormError(""); setFormSuccess("");
    if (!name || !email || !password) { setFormError("All fields are required."); return; }
    if (password.length < 6) { setFormError("Password must be at least 6 characters."); return; }
    setCreating(true);
    try {
      const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), password);
      const uid = credential.user.uid;
      await secondaryAuth.signOut();
      const adminId = getAuth().currentUser?.uid || "unknown_admin";
      await setDoc(doc(db, "Staff", uid), {
        Email: email.trim(), Name: name.trim(), Role: role,
        StaffNumber: nextStaffNumber, Password: password,
        CreatedAt: new Date(), CreatedBy: adminId,
      });
      setFormSuccess(`Staff #${nextStaffNumber} "${name}" created!`);
      setName(""); setEmail(""); setPassword("");
      fetchStaff();
    } catch (err: any) { setFormError(getAuthError(err.code)); }
    finally { setCreating(false); }
  };

  const handleDelete = async (uid: string, name: string) => {
    if (!confirm(`Delete staff "${name}"?`)) return;
    try { await deleteDoc(doc(db, "Staff", uid)); fetchStaff(); }
    catch (err: any) { alert("Failed: " + err.message); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="font-heading font-700 text-2xl">Staff Management</h2>
      <Card className="p-6 space-y-4 max-w-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-600">Add New Staff</h3>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full font-mono font-600">Staff #{nextStaffNumber}</span>
        </div>
        <div>
          <Label>Role</Label>
          <div className="flex gap-3 mt-2">
            <button onClick={() => setRole("STAFF")}
              className={`flex-1 py-2 rounded-lg border text-sm font-600 transition-colors ${role === "STAFF" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
              Staff
            </button>
            <button onClick={() => setRole("BILLING")}
              className={`flex-1 py-2 rounded-lg border text-sm font-600 transition-colors ${role === "BILLING" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
              Billing
            </button>
          </div>
        </div>
        <div><Label>Full Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ravi Kumar" className="mt-1" /></div>
        <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@example.com" className="mt-1" /></div>
        <div>
          <Label>Password</Label>
          <div className="relative mt-1">
            <Input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" className="pr-10" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {formError && <p className="text-destructive text-sm">{formError}</p>}
        {formSuccess && <p className="text-accent text-sm">{formSuccess}</p>}
        <Button className="w-full" onClick={handleCreate} disabled={creating}>
          {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Staff
        </Button>
      </Card>
      <div className="space-y-3 max-w-lg">
        <h3 className="font-heading font-600">Staff List</h3>
        {loadingList ? <p className="text-muted-foreground text-sm">Loading...</p> :
          staffList.length === 0 ? <p className="text-muted-foreground text-sm">No staff members yet.</p> :
            staffList.map(s => (
              <Card key={s.uid} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-600">{s.Name}</p>
                  <p className="text-sm text-muted-foreground">{s.Email} · Staff #{s.StaffNumber} · <span className={`font-600 ${s.Role === "BILLING" ? "text-warning" : "text-accent"}`}>{s.Role}</span></p>
                </div>
                <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDelete(s.uid, s.Name)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </Card>
            ))}
      </div>
    </div>
  );
}

// ── Orders Section ──
function OrdersSection() {
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FirestoreOrder | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "Orders"), orderBy("createdAt", "desc")));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOrder)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, []);

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="font-heading font-700 text-2xl">Orders</h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading orders...</div>
      ) : orders.length === 0 ? (
        <Card className="p-12 text-center">
          <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No orders yet.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orders.map(order => (
            <Card
              key={order.id}
              className="p-4 flex items-center justify-between cursor-pointer hover:border-primary transition-colors"
              onClick={() => setSelected(order)}
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-heading font-700">{order.orderId}</p>
                  <Badge variant={order.paymentMethod === "online" ? "default" : "secondary"}>
                    {order.paymentMethod === "online" ? "📱 Online" : "💵 Cash"}
                  </Badge>
                  <Badge variant={order.paymentStatus === "paid" ? "default" : "destructive"} className="text-xs">
                    {order.paymentStatus === "paid" ? "Paid" : "Pending"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length > 1 ? "s" : ""} · {formatTime(order.createdAt)}
                </p>
              </div>
              <p className="font-heading font-700 text-primary text-lg">₹{order.total}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Order — {selected?.orderId}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge variant={selected.paymentMethod === "online" ? "default" : "secondary"}>
                  {selected.paymentMethod === "online" ? "📱 Online" : "💵 Cash"}
                </Badge>
                <Badge variant={selected.paymentStatus === "paid" ? "default" : "destructive"}>
                  {selected.paymentStatus === "paid" ? "✅ Paid" : "⏳ Pending"}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">{formatTime(selected.createdAt)}</p>

              <div className="space-y-2">
                <p className="font-600 text-sm">Items:</p>
                {selected.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm bg-secondary rounded-lg px-3 py-2">
                    <span>{item.name} × {item.cartQuantity}</span>
                    <span className="font-600">₹{item.price * item.cartQuantity}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="font-heading font-700">Total</span>
                <span className="font-heading font-800 text-primary text-xl">₹{selected.total}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main AdminDashboard ──
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuItems, setMenuItems] = useState<InventoryItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [newItem, setNewItem] = useState({ name: "", price: 0, type: "food" as "food" | "snack" | "drink", countable: true, quantity: 0 });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [editForm, setEditForm] = useState({ name: "", price: 0, countable: true, quantity: 0 });

  const fetchInventory = async () => {
    setLoadingMenu(true);
    try {
      const snap = await getDocs(query(collection(db, "Inventory"), orderBy("createdAt", "desc")));
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (e) { console.error(e); }
    finally { setLoadingMenu(false); }
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleAddItem = async () => {
    setAddError(""); setAddSuccess("");
    if (!newItem.name || newItem.price <= 0) { setAddError("Please enter a valid name and price."); return; }
    if (newItem.countable && newItem.quantity <= 0) { setAddError("Please enter a valid quantity."); return; }
    setAdding(true);
    try {
      await addDoc(collection(db, "Inventory"), {
        name: newItem.name.trim(), price: newItem.price, type: newItem.type,
        countable: newItem.countable, quantity: newItem.countable ? newItem.quantity : null,
        available: true, createdAt: new Date(),
      });
      setAddSuccess(`"${newItem.name}" added!`);
      setNewItem({ name: "", price: 0, type: "food", countable: true, quantity: 0 });
      fetchInventory();
    } catch { setAddError("Failed to add. Try again."); }
    finally { setAdding(false); }
  };

  const handleToggleAvailable = async (item: InventoryItem) => {
    try {
      await updateDoc(doc(db, "Inventory", item.id), { available: !item.available });
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
    } catch (e) { console.error(e); }
  };

  const handleEditSave = async (id: string) => {
    try {
      await updateDoc(doc(db, "Inventory", id), {
        name: editForm.name, price: editForm.price,
        countable: editForm.countable, quantity: editForm.countable ? editForm.quantity : null,
      });
      fetchInventory();
    } catch (e) { console.error(e); }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteDoc(doc(db, "Inventory", id)); fetchInventory(); }
    catch (e) { console.error(e); }
  };

  const typeEmoji = { food: "🍛", snack: "🍿", drink: "🥤" };

  const navItems = [
    { id: "dashboard", label: "Dashboard",     icon: TrendingUp },
    { id: "inventory", label: "Add Inventory", icon: Plus },
    { id: "menu",      label: "Manage Menu",   icon: LayoutGrid },
    { id: "orders",    label: "Orders",        icon: ShoppingBag },
    { id: "staff",     label: "Staff",         icon: Users },
  ];

  const renderContent = () => {
    if (activeTab === "dashboard") return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-heading font-700 text-2xl">Sales Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6"><p className="text-muted-foreground text-sm">Menu Items</p><p className="text-3xl font-heading font-700">{menuItems.length}</p></Card>
        </div>
      </div>
    );

    if (activeTab === "inventory") return (
      <div className="space-y-6 animate-fade-in max-w-lg">
        <h2 className="font-heading font-700 text-2xl">Add Inventory</h2>
        <Card className="p-6 space-y-5">
          <div><Label>Food Name</Label><Input className="mt-1" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Chicken Biryani" /></div>
          <div><Label>Amount (₹)</Label><Input className="mt-1" type="number" value={newItem.price || ""} onChange={(e) => setNewItem({ ...newItem, price: Number(e.target.value) })} placeholder="0" /></div>
          <div>
            <Label>Type</Label>
            <Select value={newItem.type} onValueChange={(v: any) => setNewItem({ ...newItem, type: v })}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food">🍛 Food</SelectItem>
                <SelectItem value="snack">🍿 Snack</SelectItem>
                <SelectItem value="drink">🥤 Drink</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Countable or Uncountable?</Label>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setNewItem({ ...newItem, countable: true })}
                className={`flex-1 py-2 rounded-lg border text-sm font-600 transition-colors ${newItem.countable ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                Countable
              </button>
              <button onClick={() => setNewItem({ ...newItem, countable: false, quantity: 0 })}
                className={`flex-1 py-2 rounded-lg border text-sm font-600 transition-colors ${!newItem.countable ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>
                Uncountable
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {newItem.countable ? "Has limited quantity (e.g. Biryani, Juice)" : "No stock limit (e.g. Tea, Water)"}
            </p>
          </div>
          {newItem.countable && (
            <div className="animate-fade-in"><Label>Quantity</Label><Input className="mt-1" type="number" value={newItem.quantity || ""} onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })} placeholder="e.g. 50" /></div>
          )}
          {addError && <p className="text-destructive text-sm">{addError}</p>}
          {addSuccess && <p className="text-accent text-sm font-600">{addSuccess}</p>}
          <Button className="w-full" onClick={handleAddItem} disabled={adding}>
            {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Add to Inventory
          </Button>
        </Card>
      </div>
    );

    if (activeTab === "menu") return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="font-heading font-700 text-2xl">Manage Menu</h2>
        {loadingMenu ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
        ) : menuItems.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No items yet. Add from <strong>Add Inventory</strong> tab.</p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {menuItems.map((item) => (
              <Card key={item.id} className={`p-4 flex items-center justify-between transition-opacity ${!item.available ? "opacity-50" : ""}`}>
                <div>
                  <p className="font-600">{typeEmoji[item.type]} {item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    ₹{item.price} · {item.type}
                    {item.countable ? ` · Qty: ${item.quantity}` : " · Uncountable"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <Switch checked={item.available} onCheckedChange={() => handleToggleAvailable(item)} />
                    <span className={`text-xs font-600 ${item.available ? "text-accent" : "text-destructive"}`}>
                      {item.available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditForm({ name: item.name, price: item.price, countable: item.countable, quantity: item.quantity ?? 0 })}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Edit {item.name}</DialogTitle></DialogHeader>
                      <div className="space-y-4">
                        <div><Label>Name</Label><Input className="mt-1" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
                        <div><Label>Price (₹)</Label><Input className="mt-1" type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })} /></div>
                        <div>
                          <Label>Countable or Uncountable?</Label>
                          <div className="flex gap-3 mt-2">
                            <button onClick={() => setEditForm({ ...editForm, countable: true })}
                              className={`flex-1 py-2 rounded-lg border text-sm font-600 ${editForm.countable ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                              Countable
                            </button>
                            <button onClick={() => setEditForm({ ...editForm, countable: false, quantity: 0 })}
                              className={`flex-1 py-2 rounded-lg border text-sm font-600 ${!editForm.countable ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                              Uncountable
                            </button>
                          </div>
                        </div>
                        {editForm.countable && (
                          <div><Label>Quantity</Label><Input className="mt-1" type="number" value={editForm.quantity} onChange={(e) => setEditForm({ ...editForm, quantity: Number(e.target.value) })} /></div>
                        )}
                        <Button className="w-full" onClick={() => handleEditSave(item.id)}>Save Changes</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteItem(item.id, item.name)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    );

    if (activeTab === "orders") return <OrdersSection />;
    if (activeTab === "staff") return <StaffSection />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
        <h1 className="font-heading font-700 text-xl text-foreground">Admin Panel</h1>
      </header>
      <div className="flex">
        <aside className="w-64 min-h-[calc(100vh-65px)] bg-card border-r border-border p-4 hidden md:block">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>
                <item.icon className="w-4 h-4" />{item.label}
              </button>
            ))}
          </nav>
        </aside>
        <div className="md:hidden w-full border-b border-border flex overflow-x-auto">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex-1 min-w-fit px-4 py-3 text-xs font-medium transition-colors ${activeTab === item.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
              {item.label}
            </button>
          ))}
        </div>
        <main className="flex-1 p-6 hidden md:block">{renderContent()}</main>
      </div>
      <main className="md:hidden p-4">{renderContent()}</main>
    </div>
  );
};

export default AdminDashboard;