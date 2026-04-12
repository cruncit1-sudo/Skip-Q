import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, orderBy, where,
  doc, setDoc, deleteDoc, addDoc, updateDoc, getDoc
} from "firebase/firestore";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Pencil, Trash2, ArrowLeft, Users, LayoutGrid, TrendingUp, Eye, EyeOff, Loader2, ShoppingBag, LogOut, Gift } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

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
  CreatedBy?: string;
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
  served?: boolean;
  status: string;
  shopName?: string;
  subtotal?: number;
  discount?: number;
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
      const adminId = getAuth().currentUser?.uid;
      const snap = await getDocs(query(collection(db, "Staff"), orderBy("StaffNumber", "asc")));
      let fetched = snap.docs.map(d => ({ uid: d.id, ...d.data() } as FirestoreStaff));
      fetched = fetched.filter(d => ["STAFF", "BILLING"].includes(d.Role) && d.CreatedBy === adminId);
      setStaffList(fetched);
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
      
      const currentAdmin = getAuth().currentUser;
      const adminId = currentAdmin?.uid || "unknown_admin";
      const adminEmail = currentAdmin?.email || "unknown_email";
      
      await setDoc(doc(db, "Staff", uid), {
        Email: email.trim(), Name: name.trim(), Role: role,
        StaffNumber: nextStaffNumber, Password: password,
        CreatedAt: new Date(), CreatedBy: adminId, CreatedByEmail: adminEmail
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
function OrdersSection({ shop }: { shop: any }) {
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<FirestoreOrder | null>(null);

  const fetchOrders = async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "Orders"), where("shopId", "==", shop.id)));
      const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOrder));
      fetched.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return timeB - timeA;
      });
      setOrders(fetched);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [shop]);

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
                {order.shopName && (
                  <p className="text-xs font-600 text-foreground mb-1">🏪 {order.shopName}</p>
                )}
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

              {selected.discount ? (
                <div className="flex justify-between text-sm text-accent">
                  <span>Discount</span>
                  <span>-₹{selected.discount}</span>
                </div>
              ) : null}

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

// ── Dashboard Section ──
function DashboardSection({ menuItemsCount, shop, onToggleShop }: { menuItemsCount: number, shop: any, onToggleShop: () => void }) {
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "Orders"), where("shopId", "==", shop.id)));
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOrder)));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [shop]);

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const onlineRevenue = orders.filter(o => o.paymentMethod === "online").reduce((sum, o) => sum + (o.total || 0), 0);
  const cashRevenue = orders.filter(o => o.paymentMethod === "cash").reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingOrders = orders.filter(o => !o.served).length;

  const pieData = [
    { name: "Online", value: onlineRevenue },
    { name: "Cash", value: cashRevenue }
  ].filter(d => d.value > 0);

  const last7DaysData = (() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      days[dateStr] = 0;
    }
    orders.forEach(o => {
      if (!o.createdAt) return;
      const d = o.createdAt.toDate ? o.createdAt.toDate() : new Date(o.createdAt);
      const dateStr = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
      if (days[dateStr] !== undefined) {
        days[dateStr] += o.total || 0;
      }
    });
    return Object.keys(days).map(date => ({ date, amount: days[date] }));
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-heading font-700 text-2xl">Sales Dashboard</h2>
          {shop && (
            <Badge variant="outline" className="px-3 py-1 text-sm font-600 text-primary border-primary bg-primary/10">
              🏪 {shop.name}
            </Badge>
          )}
          {shop && (
            <div className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-xl border border-border">
              <span className="text-sm font-600">{shop.isOpen !== false ? "🟢 Open" : "🔴 Closed"}</span>
              <Switch checked={shop.isOpen !== false} onCheckedChange={onToggleShop} />
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>Refresh</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-6 border-l-4 border-l-primary">
              <p className="text-muted-foreground text-sm font-600">Total Revenue</p>
              <p className="text-3xl font-heading font-800 text-foreground mt-2">₹{totalRevenue}</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-accent">
              <p className="text-muted-foreground text-sm font-600">Total Orders</p>
              <p className="text-3xl font-heading font-800 text-foreground mt-2">{orders.length}</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-warning">
              <p className="text-muted-foreground text-sm font-600">Pending Orders</p>
              <p className="text-3xl font-heading font-800 text-foreground mt-2">{pendingOrders}</p>
            </Card>
            <Card className="p-6 border-l-4 border-l-secondary-foreground">
              <p className="text-muted-foreground text-sm font-600">Menu Items</p>
              <p className="text-3xl font-heading font-800 text-foreground mt-2">{menuItemsCount}</p>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-heading font-600 mb-6 text-lg">Revenue (Last 7 Days)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7DaysData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `₹${val}`} />
                    <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(val) => [`₹${val}`, "Revenue"]} />
                    <Bar dataKey="amount" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="font-heading font-600 mb-6 text-lg">Revenue by Payment Method</h3>
              {pieData.length > 0 ? (
                <div className="h-64 flex flex-col">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-4">
                    {pieData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm font-500">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}></span>
                        {entry.name}: ₹{entry.value}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground text-sm">No revenue data yet.</p>
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

// ── Offers Section ──
function OffersSection({ shop, setShop, menuItems }: { shop: any, setShop: any, menuItems: InventoryItem[] }) {
  const [offer, setOffer] = useState({
    title: "", percentage: 0, minAmount: 0, validUntil: "", eligibleItems: []
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!offer.title || offer.percentage <= 0 || offer.minAmount <= 0 || !offer.validUntil) {
      alert("Please fill all required fields correctly.");
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "Shop", shop.id), { offer });
      setShop({ ...shop, offer });
      alert("Offer saved successfully!");
      setOffer({ title: "", percentage: 0, minAmount: 0, validUntil: "", eligibleItems: [] });
    } catch (e) { console.error(e); alert("Failed to save offer."); } 
    finally { setSaving(false); }
  };

  const handleRemove = async () => {
    if (!confirm("Are you sure you want to remove this offer?")) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "Shop", shop.id), { offer: null });
      setShop({ ...shop, offer: null });
      setOffer({ title: "", percentage: 0, minAmount: 0, validUntil: "", eligibleItems: [] });
    } catch (e) { console.error(e); } 
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h2 className="font-heading font-700 text-2xl">Manage Offers</h2>
      
      {shop?.offer && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="font-heading font-600 text-lg">Saved Offer</h3>
          <Card className="p-4 border border-primary bg-primary/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-heading font-700 text-primary flex items-center gap-2">
                <Gift className="w-5 h-5" /> {shop.offer.title}
              </p>
              <p className="text-sm font-600 mt-1">{shop.offer.percentage}% OFF <span className="text-muted-foreground font-400">on orders above ₹{shop.offer.minAmount}</span></p>
              <p className="text-xs text-muted-foreground mt-1">Valid on: {shop.offer.validUntil}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" size="sm" onClick={() => setOffer(shop.offer)} disabled={saving} className="flex-1 sm:flex-none">
                <Pencil className="w-4 h-4 mr-2"/> Edit
              </Button>
              <Button variant="destructive" size="sm" onClick={handleRemove} disabled={saving} className="flex-1 sm:flex-none">
                <Trash2 className="w-4 h-4 mr-2"/> Delete
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6 space-y-5">
        <h3 className="font-heading font-600 text-lg border-b border-border pb-2">
          {offer.title && shop?.offer?.title === offer.title ? "Edit Offer Details" : shop?.offer ? "Replace Current Offer" : "Create New Offer"}
        </h3>
        <div><Label>Offer Title</Label><Input className="mt-1" value={offer.title} onChange={(e) => setOffer({...offer, title: e.target.value})} placeholder="e.g. Diwali Special 20% OFF" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Discount Percentage (%)</Label><Input className="mt-1" type="number" value={offer.percentage || ""} onChange={(e) => setOffer({...offer, percentage: Number(e.target.value)})} placeholder="e.g. 20" /></div>
          <div><Label>Minimum Cart Amount (₹)</Label><Input className="mt-1" type="number" value={offer.minAmount || ""} onChange={(e) => setOffer({...offer, minAmount: Number(e.target.value)})} placeholder="e.g. 250" /></div>
        </div>
        <div><Label>Offer Date (Valid On)</Label><Input className="mt-1" type="date" value={offer.validUntil} onChange={(e) => setOffer({...offer, validUntil: e.target.value})} /></div>
        <div>
          <Label>Applicable Foods (Leave empty to apply to all items)</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto p-3 border border-border rounded-lg bg-secondary/50">
            {menuItems.map(item => (
              <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={offer.eligibleItems.includes(item.id)} onChange={(e) => {
                  if (e.target.checked) setOffer({...offer, eligibleItems: [...offer.eligibleItems, item.id]});
                  else setOffer({...offer, eligibleItems: offer.eligibleItems.filter((id: string) => id !== item.id)});
                }} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
                {item.name}
              </label>
            ))}
            {menuItems.length === 0 && <p className="text-xs text-muted-foreground">No inventory items found.</p>}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Gift className="w-4 h-4 mr-2"/>} Save Offer</Button>
        </div>
      </Card>
    </div>
  );
}

// ── Main AdminDashboard ──
const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [menuItems, setMenuItems] = useState<InventoryItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [newItem, setNewItem] = useState({ name: "", price: 0, type: "food" as "food" | "snack" | "drink", countable: true, quantity: 0 });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");
  const [editForm, setEditForm] = useState({ name: "", price: 0, countable: true, quantity: 0 });
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [shop, setShop] = useState<{ id: string; name: string; slogan: string; isOpen?: boolean; offer?: any; Createdby?: string } | null>(null);
  const [fetchingShop, setFetchingShop] = useState(true);
  const [shopForm, setShopForm] = useState({ name: "", slogan: "" });
  const [creatingShop, setCreatingShop] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login?role=admin"); // Not logged in -> Redirect to Admin Login
      } else {
        setIsAuthChecking(false);
        fetchShop(user.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const fetchShop = async (adminId: string) => {
    setFetchingShop(true);
    try {
      // First, check if there's a shop where the Createdby field matches adminId
      const q = query(collection(db, "Shop"), where("Createdby", "==", adminId));
      const querySnap = await getDocs(q);
      
      if (!querySnap.empty) {
        const docSnap = querySnap.docs[0];
        const data = docSnap.data() as any;
        setShop({ id: docSnap.id, name: data.name, slogan: data.slogan, isOpen: data.isOpen, Createdby: data.Createdby });
        await fetchInventory(docSnap.id);
      } else {
        // Fallback: check if the Document ID itself is the adminId (For older shops)
        const snap = await getDoc(doc(db, "Shop", adminId));
        if (snap.exists()) {
          const data = snap.data() as any;
          setShop({ id: snap.id, name: data.name, slogan: data.slogan, isOpen: data.isOpen, Createdby: data.Createdby });
          await fetchInventory(snap.id);
        } else {
          setShop(null);
          setMenuItems([]);
          setFetchingShop(false);
        }
      }
    } catch (e) { console.error(e); setShop(null); setFetchingShop(false); }
  };

  const fetchInventory = async (sId: string) => {
    setLoadingMenu(true);
    try {
      const snap = await getDocs(query(collection(db, "Shop", sId, "Inventory"), orderBy("createdAt", "desc")));
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (e) { console.error(e); }
    finally { setLoadingMenu(false); setFetchingShop(false); }
  };

  const handleAddItem = async () => {
    if (!shop) return;
    setAddError(""); setAddSuccess("");
    if (!newItem.name || newItem.price <= 0) { setAddError("Please enter a valid name and price."); return; }
    if (newItem.countable && newItem.quantity <= 0) { setAddError("Please enter a valid quantity."); return; }
    setAdding(true);
    try {
      await addDoc(collection(db, "Shop", shop.id, "Inventory"), {
        name: newItem.name.trim(), price: newItem.price, type: newItem.type,
        countable: newItem.countable, quantity: newItem.countable ? newItem.quantity : null,
        available: true, createdAt: new Date(),
      });
      setAddSuccess(`"${newItem.name}" added!`);
      setNewItem({ name: "", price: 0, type: "food", countable: true, quantity: 0 });
      fetchInventory(shop.id);
    } catch { setAddError("Failed to add. Try again."); }
    finally { setAdding(false); }
  };

  const handleCreateShop = async () => {
    if (!shopForm.name.trim()) {
      alert("Shop name is required!");
      return;
    }
    const adminId = getAuth().currentUser?.uid;
    if (!adminId) return;

    setCreatingShop(true);
    try {
      await setDoc(doc(db, "Shop", adminId), {
        name: shopForm.name.trim(),
        slogan: shopForm.slogan.trim(),
        isOpen: true,
        Createdby: adminId,
        createdAt: new Date(),
      });
      setShop({ id: adminId, name: shopForm.name.trim(), slogan: shopForm.slogan.trim(), isOpen: true, Createdby: adminId });
      setMenuItems([]);
    } catch (e) {
      console.error(e);
      alert("Failed to create shop.");
    } finally {
      setCreatingShop(false);
    }
  };

  const handleLogout = async () => {
    await signOut(getAuth());
    navigate("/login?role=admin");
  };

  const handleToggleShopStatus = async () => {
    if (!shop) return;
    const newStatus = shop.isOpen === false ? true : false;
    try {
      await updateDoc(doc(db, "Shop", shop.id), { isOpen: newStatus });
      setShop({ ...shop, isOpen: newStatus });
    } catch (e) { console.error(e); }
  };

  const handleToggleAvailable = async (item: InventoryItem) => {
    if (!shop) return;
    try {
      await updateDoc(doc(db, "Shop", shop.id, "Inventory", item.id), { available: !item.available });
      setMenuItems(prev => prev.map(i => i.id === item.id ? { ...i, available: !i.available } : i));
    } catch (e) { console.error(e); }
  };

  const handleEditSave = async (id: string) => {
    if (!shop) return;
    try {
      await updateDoc(doc(db, "Shop", shop.id, "Inventory", id), {
        name: editForm.name, price: editForm.price,
        countable: editForm.countable, quantity: editForm.countable ? editForm.quantity : null,
      });
      fetchInventory(shop.id);
    } catch (e) { console.error(e); }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!shop) return;
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteDoc(doc(db, "Shop", shop.id, "Inventory", id)); fetchInventory(shop.id); }
    catch (e) { console.error(e); }
  };

  const typeEmoji = { food: "🍛", snack: "🍿", drink: "🥤" };

  const navItems = [
    { id: "dashboard", label: "Dashboard",     icon: TrendingUp },
    { id: "inventory", label: "Add Inventory", icon: Plus },
    { id: "menu",      label: "Manage Menu",   icon: LayoutGrid },
    { id: "offers",    label: "Offers",        icon: Gift },
    { id: "orders",    label: "Orders",        icon: ShoppingBag },
    { id: "staff",     label: "Staff",         icon: Users },
  ];

  const renderContent = () => {
    if (activeTab === "dashboard") return <DashboardSection menuItemsCount={menuItems.length} shop={shop} onToggleShop={handleToggleShopStatus} />;

    if (activeTab === "inventory") {
      if (fetchingShop) {
        return (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Shop Info...
          </div>
        );
      }
      if (!shop) {
        return (
          <div className="space-y-6 animate-fade-in max-w-lg">
            <h2 className="font-heading font-700 text-2xl">Create Your Shop</h2>
            <Card className="p-6 space-y-5">
              <p className="text-sm text-muted-foreground mb-2">
                You must create a shop before adding inventory. Only one shop can be created.
              </p>
              <div><Label>Shop Name</Label><Input className="mt-1" value={shopForm.name} onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })} placeholder="e.g. Campus Bites" /></div>
              <div><Label>Shop Slogan (Optional)</Label><Input className="mt-1" value={shopForm.slogan} onChange={(e) => setShopForm({ ...shopForm, slogan: e.target.value })} placeholder="e.g. Best food on campus!" /></div>
              <Button className="w-full" onClick={handleCreateShop} disabled={creatingShop}>
                {creatingShop ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Shop
              </Button>
            </Card>
          </div>
        );
      }
      return (
        <div className="space-y-6 animate-fade-in max-w-lg">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-700 text-2xl">Add Inventory</h2>
            <Badge variant="secondary" className="px-3 py-1 text-sm font-600 text-primary">🏪 {shop.name}</Badge>
          </div>
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
    }

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

    if (activeTab === "offers") return <OffersSection shop={shop} setShop={setShop} menuItems={menuItems} />;
    if (activeTab === "orders") return <OrdersSection shop={shop} />;
    if (activeTab === "staff") return <StaffSection />;
    return null;
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="font-heading font-700 text-xl text-foreground">Admin Panel</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Logout
        </Button>
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