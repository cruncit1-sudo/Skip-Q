import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  addDoc, doc, updateDoc, increment, orderBy
} from "firebase/firestore";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Loader2, History, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

type FoodType = "food" | "snack" | "drink";

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  type: FoodType;
  countable: boolean;
  quantity?: number;
  available: boolean;
}

interface OrderItem {
  id: string;
  name: string;
  price: number;
  cartQuantity: number;
}

interface FirestoreOrder {
  id: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  paymentMethod: "online" | "cash";
  paymentStatus: string;
  served?: boolean;
  createdAt: any;
}

const foodTypeLabels: Record<FoodType, string> = {
  food: "🍛 Food",
  snack: "🍿 Snacks",
  drink: "🥤 Drinks",
};

const foodTypeEmojis: Record<FoodType, string> = {
  food: "🍛",
  snack: "🍿",
  drink: "🥤",
};

const generateOrderId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "ORD-";
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

const UserHome = () => {
  const { canteen, cart, addToCart, removeFromCart, updateCartQuantity, getCartTotal, clearCart, currentUser } = useStore();

  const [menuItems, setMenuItems] = useState<InventoryItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FoodType>("food");
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{ orderId: string; method: string } | null>(null);

  // History
  const [historyOrders, setHistoryOrders] = useState<FirestoreOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchMenu = async () => {
    setLoadingMenu(true);
    try {
      const snap = await getDocs(query(collection(db, "Inventory"), where("available", "==", true)));
      setMenuItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (e) { console.error(e); }
    finally { setLoadingMenu(false); }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      let snap;
      if (currentUser?.phoneNumber) {
        // Fetch orders matching this phone number
        snap = await getDocs(
          query(collection(db, "Orders"), where("phoneNumber", "==", currentUser.phoneNumber))
        );
      } else {
        // Fallback: show all orders if no phone number in session
        snap = await getDocs(collection(db, "Orders"));
      }
      // Sort by createdAt descending in JS
      const orders = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as FirestoreOrder))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });
      setHistoryOrders(orders);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { fetchMenu(); }, []);
  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory]);

  const activeMenu = menuItems.filter(m => m.type === activeCategory);
  const cartCount = cart.reduce((s, c) => s + c.cartQuantity, 0);
  const cartItem = (id: string) => cart.find((c) => c.id === id);

  const toMenuItem = (item: InventoryItem) => ({
    id: item.id, name: item.name, price: item.price,
    type: item.type, active: item.available, quantity: item.quantity ?? 9999,
  });

  const handlePayment = async (method: "online" | "cash") => {
    setPlacingOrder(true);
    try {
      const orderId = generateOrderId();
      const total = getCartTotal();

      await addDoc(collection(db, "Orders"), {
        orderId,
        phoneNumber: currentUser?.phoneNumber ?? null,
        items: cart.map(item => ({
          id: item.id, name: item.name, price: item.price,
          type: item.type, cartQuantity: item.cartQuantity,
        })),
        total,
        paymentMethod: method,
        paymentStatus: method === "online" ? "paid" : "pending",
        status: "confirmed",
        served: false,
        createdAt: new Date(),
      });

      // Reduce quantity for countable items
      for (const item of cart) {
        const invItem = menuItems.find(m => m.id === item.id);
        if (invItem && invItem.countable) {
          await updateDoc(doc(db, "Inventory", item.id), { quantity: increment(-item.cartQuantity) });
        }
      }

      clearCart();
      setOrderComplete({ orderId, method });
      setShowPayment(false);
      setShowCart(false);
      fetchMenu();
    } catch (e) {
      console.error(e);
      alert("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  // ── Order History Screen ──
  if (showHistory) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
          <button onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-700 text-xl">My Orders</h1>
        </header>

        <div className="p-4 max-w-lg mx-auto space-y-4">
          {loadingHistory ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading...
            </div>
          ) : historyOrders.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-muted-foreground">No orders yet.</p>
            </div>
          ) : (
            historyOrders.map(order => (
              <Card key={order.id} className={`p-4 border-2 ${order.served ? "border-accent/40 bg-accent/5" : "border-border"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-heading font-700 text-lg">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {order.served ? (
                      <span className="flex items-center gap-1 text-xs font-700 text-accent">
                        <CheckCircle2 className="w-3 h-3" /> Served
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-700 text-warning">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    )}
                    <Badge variant={order.paymentMethod === "online" ? "default" : "secondary"} className="text-xs">
                      {order.paymentMethod === "online" ? "📱 Online" : "💵 Cash"}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-muted-foreground">
                      <span>{item.name} × {item.cartQuantity}</span>
                      <span>₹{item.price * item.cartQuantity}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-border pt-2">
                  <span className="text-sm font-600">Total</span>
                  <span className="font-heading font-700 text-primary">₹{order.total}</span>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Order Complete ──
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md w-full animate-fade-in">
          <div className="text-6xl mb-4">{orderComplete.method === "online" ? "✅" : "🧾"}</div>
          <h2 className="font-heading font-700 text-2xl mb-2">Order Confirmed!</h2>
          <p className="text-muted-foreground mb-4">
            {orderComplete.method === "online" ? "Payment received via UPI" : "Please pay cash at the counter"}
          </p>
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">Your Order ID</p>
            <p className="text-3xl font-heading font-800 text-primary">{orderComplete.orderId}</p>
          </div>
          <Button onClick={() => { setOrderComplete(null); setShowMenu(false); }} className="w-full">
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  // ── Cart ──
  if (showCart) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
          <button onClick={() => setShowCart(false)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-heading font-700 text-xl">Your Cart</h1>
        </header>
        <div className="p-6 max-w-lg mx-auto space-y-4">
          {cart.length === 0 ? (
            <div className="text-center py-12"><p className="text-muted-foreground">Your cart is empty</p></div>
          ) : (
            <>
              {cart.map((item) => (
                <Card key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-600">{foodTypeEmojis[item.type as FoodType]} {item.name}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price} × {item.cartQuantity} = ₹{item.price * item.cartQuantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}><Minus className="w-3 h-3" /></Button>
                    <span className="w-6 text-center font-600">{item.cartQuantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}><Plus className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </Card>
              ))}
              <Card className="p-4 bg-secondary">
                <div className="flex justify-between items-center">
                  <span className="font-heading font-600">Total</span>
                  <span className="text-2xl font-heading font-800 text-primary">₹{getCartTotal()}</span>
                </div>
              </Card>
              <Button className="w-full h-12 text-lg" onClick={() => setShowPayment(true)}>Pay Now</Button>
            </>
          )}
        </div>
        {showPayment && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-6 z-50">
            <Card className="p-8 max-w-sm w-full text-center animate-fade-in">
              <h3 className="font-heading font-700 text-xl mb-6">Choose Payment</h3>
              <div className="space-y-3">
                <Button className="w-full h-14 text-lg" onClick={() => handlePayment("online")} disabled={placingOrder}>
                  {placingOrder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} 📱 UPI / Online Payment
                </Button>
                <Button variant="outline" className="w-full h-14 text-lg" onClick={() => handlePayment("cash")} disabled={placingOrder}>
                  💵 Cash Payment
                </Button>
              </div>
              <Button variant="ghost" className="mt-4" onClick={() => setShowPayment(false)} disabled={placingOrder}>Cancel</Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── Menu ──
  if (showMenu) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setShowMenu(false)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading font-700 text-xl">{canteen.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}>
              <History className="w-4 h-4 mr-1" /> Orders
            </Button>
            <Button variant="outline" size="sm" className="relative" onClick={() => setShowCart(true)}>
              <ShoppingCart className="w-4 h-4 mr-1" /> Cart
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">{cartCount}</Badge>
              )}
            </Button>
            {cart.length > 0 && <Button size="sm" onClick={() => setShowPayment(true)}>Pay ₹{getCartTotal()}</Button>}
          </div>
        </header>

        <div className="flex border-b border-border">
          {(["food", "snack", "drink"] as FoodType[]).map((type) => (
            <button key={type} onClick={() => setActiveCategory(type)}
              className={`flex-1 py-4 text-center font-heading font-600 transition-colors ${activeCategory === type ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
              {foodTypeLabels[type]}
            </button>
          ))}
        </div>

        <div className="p-4 grid gap-3 max-w-2xl mx-auto">
          {loadingMenu ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading menu...
            </div>
          ) : activeMenu.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No items available</div>
          ) : (
            activeMenu.map((item) => {
              const inCart = cartItem(item.id);
              return (
                <Card key={item.id} className="p-4 flex items-center justify-between animate-fade-in">
                  <div>
                    <p className="font-600 text-card-foreground">{item.name}</p>
                    <p className="text-primary font-heading font-700">₹{item.price}</p>
                    {item.countable && item.quantity !== undefined && <p className="text-xs text-muted-foreground">Stock: {item.quantity}</p>}
                    {!item.countable && <p className="text-xs text-accent">Always available</p>}
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, inCart.cartQuantity - 1)}><Minus className="w-3 h-3" /></Button>
                      <span className="w-6 text-center font-600">{inCart.cartQuantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, inCart.cartQuantity + 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(toMenuItem(item))}><Plus className="w-4 h-4 mr-1" /> Add</Button>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {showPayment && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-6 z-50">
            <Card className="p-8 max-w-sm w-full text-center animate-fade-in">
              <h3 className="font-heading font-700 text-xl mb-2">Total: ₹{getCartTotal()}</h3>
              <p className="text-muted-foreground mb-6">Choose your payment method</p>
              <div className="space-y-3">
                <Button className="w-full h-14 text-lg" onClick={() => handlePayment("online")} disabled={placingOrder}>
                  {placingOrder ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} 📱 UPI / Online Payment
                </Button>
                <Button variant="outline" className="w-full h-14 text-lg" onClick={() => handlePayment("cash")} disabled={placingOrder}>
                  💵 Cash Payment
                </Button>
              </div>
              <Button variant="ghost" className="mt-4" onClick={() => setShowPayment(false)} disabled={placingOrder}>Cancel</Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ── Canteen Home ──
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link to="/" className="absolute top-6 left-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {/* History button top right */}
      <button
        onClick={() => setShowHistory(true)}
        className="absolute top-6 right-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="w-5 h-5" />
        <span className="text-sm font-600">My Orders</span>
      </button>

      <div className="text-center cursor-pointer group animate-fade-in" onClick={() => setShowMenu(true)}>
        <div className="text-8xl mb-6">🍽️</div>
        <h1 className="text-4xl md:text-5xl font-heading font-800 text-foreground mb-3 group-hover:text-primary transition-colors">
          {canteen.name}
        </h1>
        <p className="text-xl text-muted-foreground mb-2">{canteen.slogan}</p>
        {currentUser && (
          <p className="text-sm text-muted-foreground mb-6">{currentUser.phoneNumber}</p>
        )}
        <Button size="lg" className="text-lg px-8 h-14">View Menu →</Button>
      </div>
    </div>
  );
};

export default UserHome;