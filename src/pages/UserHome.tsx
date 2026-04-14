import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  addDoc, doc, updateDoc, increment,
} from "firebase/firestore";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, ShoppingCart, Plus, Minus, Trash2,
  Loader2, History, CheckCircle2, Clock, Gift
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// ── Razorpay type declaration ──────────────────────────────────────────────
declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY = "rzp_live_ScZx0esi774zi7";

// Dynamically load Razorpay SDK once
const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

// ── Types ──────────────────────────────────────────────────────────────────
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
  shopName?: string; 
  subtotal?: number;
  discount?: number;
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
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < 4; i++)
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
};

// ── Component ──────────────────────────────────────────────────────────────
const UserHome = () => {
  const navigate = useNavigate();
  const {
    canteen, cart, addToCart, removeFromCart,
    updateCartQuantity, getCartTotal, clearCart, currentUser,
  } = useStore();

  // Local User State for Persistence across page refresh
  const [localUser, setLocalUser] = useState<any>(() => {
    if (currentUser) {
      localStorage.setItem("skipq_user", JSON.stringify(currentUser));
      return currentUser;
    }
    const stored = localStorage.getItem("skipq_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [menuItems, setMenuItems] = useState<InventoryItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FoodType>("food");
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{ orderId: string; method: string } | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [applyOffer, setApplyOffer] = useState(false);

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // History
  const [historyOrders, setHistoryOrders] = useState<FirestoreOrder[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("skipq_user", JSON.stringify(currentUser));
      setLocalUser(currentUser);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!localUser) {
      navigate("/user-login"); // Not logged in -> Redirect to User Login
    } else {
      setIsAuthChecking(false);
    }
  }, [localUser, navigate]);

  const fetchShops = async () => {
    setLoadingShops(true);
    try {
      const snap = await getDocs(collection(db, "Shop"));
      setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoadingShops(false); }
  };

  const fetchMenu = async (shopId: string) => {
    setLoadingMenu(true);
    try {
      const snap = await getDocs(
        query(collection(db, "Shop", shopId, "Inventory"), where("available", "==", true))
      );
      setMenuItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (e) { console.error(e); }
    finally { setLoadingMenu(false); }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const rawNumber = localUser?.phoneNumber?.replace("+91", "") ?? null;
      let snap;
      if (rawNumber) {
        snap = await getDocs(
          query(collection(db, "Orders"), where("user", "==", rawNumber))
        );
      } else {
        snap = await getDocs(collection(db, "Orders"));
      }
      const orders = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as FirestoreOrder))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });
      setHistoryOrders(orders);
    } catch (e) { console.error(e); }
    finally { setLoadingHistory(false); }
  };

  useEffect(() => { fetchShops(); }, []);
  useEffect(() => { if (showHistory) fetchHistory(); }, [showHistory]);

  const activeMenu = menuItems.filter((m) => m.type === activeCategory);
  const cartCount = cart.reduce((s, c) => s + c.cartQuantity, 0);
  const cartItem = (id: string) => cart.find((c) => c.id === id);

  const toMenuItem = (item: InventoryItem) => ({
    id: item.id, name: item.name, price: item.price,
    type: item.type, active: item.available, quantity: item.quantity ?? 9999,
  });

  const handleShopClick = (shop: any) => {
    setSelectedShopId(shop.id);
    setSelectedShop(shop);
    fetchMenu(shop.id);
  };

  const handleBackToShops = () => {
    if (cart.length > 0) {
      if (!confirm("Your cart will be cleared if you leave this shop. Continue?")) return;
      clearCart();
    }
    setSelectedShopId(null);
    setSelectedShop(null);
    setMenuItems([]);
    setApplyOffer(false);
  };

  const getDiscountAndTotal = () => {
    const subtotal = getCartTotal();
    let potentialDiscount = 0;
    let isEligible = false;

    if (selectedShop?.offer) {
      const offer = selectedShop.offer;
      const isToday = offer.validUntil === getTodayString();
      if (isToday && subtotal >= offer.minAmount) {
        isEligible = true;
        let eligibleTotal = 0;
        if (offer.eligibleItems && offer.eligibleItems.length > 0) {
          eligibleTotal = cart.filter((c) => offer.eligibleItems.includes(c.id)).reduce((sum, c) => sum + c.price * c.cartQuantity, 0);
        } else {
          eligibleTotal = subtotal;
        }
        potentialDiscount = Math.round(eligibleTotal * (offer.percentage / 100));
      }
    }
    
    const discount = (isEligible && applyOffer) ? potentialDiscount : 0;
    return { subtotal, discount, potentialDiscount, isEligible, finalTotal: Math.max(0, subtotal - discount) };
  };

  // ── Save order to Firestore after payment confirmed ────────────────────
  const saveOrder = async (
    orderId: string,
    method: "online" | "cash",
    razorpayPaymentId?: string
  ) => {
    const { subtotal, discount, finalTotal } = getDiscountAndTotal();

    await addDoc(collection(db, "Orders"), {
      orderId,
      user: localUser?.phoneNumber?.replace("+91", "") ?? null,
      items: cart.map((item) => ({
        id: item.id, name: item.name, price: item.price,
        type: item.type, cartQuantity: item.cartQuantity,
      })),
      shopId: selectedShopId,
      shopName: selectedShop?.name || canteen.name,
      subtotal,
      discount,
      total: finalTotal,
      paymentMethod: method,
      paymentStatus: method === "online" ? "paid" : "pending",
      ...(razorpayPaymentId ? { razorpayPaymentId } : {}),
      status: "confirmed",
      served: false,
      createdAt: new Date(),
    });

    // Reduce quantity for countable items
    for (const item of cart) {
      const invItem = menuItems.find((m) => m.id === item.id);
      if (invItem?.countable) {
        await updateDoc(doc(db, "Shop", selectedShopId!, "Inventory", item.id), {
          quantity: increment(-item.cartQuantity),
        });
      }
    }

    clearCart();
    fetchMenu(selectedShopId!);
    setApplyOffer(false);
  };

  // ── Cash payment ───────────────────────────────────────────────────────
  const handleCashPayment = async () => {
    setPaymentError("");
    setPlacingOrder(true);
    try {
      const orderId = generateOrderId();
      await saveOrder(orderId, "cash");
      setOrderComplete({ orderId, method: "cash" });
      setShowPayment(false);
      setShowCart(false);
    } catch (e) {
      console.error(e);
      setPaymentError("Failed to place order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  // ── Razorpay online payment ────────────────────────────────────────────
  const handleOnlinePayment = async () => {
    setPaymentError("");
    setPlacingOrder(true);

    const loaded = await loadRazorpay();
    if (!loaded) {
      setPaymentError("Failed to load payment gateway. Check your internet connection.");
      setPlacingOrder(false);
      return;
    }

    const orderId = generateOrderId();
    const { finalTotal } = getDiscountAndTotal();

    const options = {
      key: RAZORPAY_KEY,
      amount: finalTotal * 100,          // Razorpay expects paise
      currency: "INR",
      name: selectedShop?.name || canteen.name,
      description: `Order ${orderId}`,
      // image: "/logo.png",         // optional: add your logo URL
      prefill: {
        contact: localUser?.phoneNumber ?? "",
      },
      notes: {
        orderId,
      },
      theme: {
        color: "hsl(24, 95%, 53%)",  // matches your --primary
      },
      handler: async (response: any) => {
        // Payment successful — response.razorpay_payment_id is available
        try {
          await saveOrder(orderId, "online", response.razorpay_payment_id);
          setOrderComplete({ orderId, method: "online" });
          setShowPayment(false);
          setShowCart(false);
        } catch (e) {
          console.error("Order save failed after payment:", e);

          // ── AUTO REFUND ────────────────────────────────────────────────
          setPaymentError(
            "Payment received but order failed. Initiating refund automatically..."
          );

          try {
            const functions = getFunctions();
            const refundFn = httpsCallable(functions, "refundFailedOrder");

            const result: any = await refundFn({
              razorpayPaymentId: response.razorpay_payment_id,
              amount: finalTotal,
            });

            setPaymentError(
              `Your payment of ₹${finalTotal} has been refunded ` +
              `(Refund ID: ${result.data.refundId}). ` +
              `It will reflect in 5–7 business days. Sorry for the inconvenience.`
            );
          } catch (refundErr) {
            console.error("Refund also failed:", refundErr);
            setPaymentError(
              `Payment received but order failed. We couldn't auto-refund. ` +
              `Please contact support with Payment ID: ${response.razorpay_payment_id} ` +
              `and we'll refund ₹${finalTotal} manually.`
            );
          }
        } finally {
          setPlacingOrder(false);
        }
      },
      modal: {
        ondismiss: () => {
          // User closed the Razorpay modal without paying
          setPlacingOrder(false);
          setPaymentError("Payment cancelled. Try again.");
        },
      },
    };

    const rzp = new window.Razorpay(options);

    rzp.on("payment.failed", (response: any) => {
      console.error("Razorpay payment failed:", response.error);
      setPaymentError(`Payment failed: ${response.error.description}`);
      setPlacingOrder(false);
    });

    rzp.open();
  };

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  };

  // ── Payment Modal (shared between Cart & Menu views) ──────────────────
  const PaymentModal = () => (
    <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-6 z-50">
      <Card className="p-8 max-w-sm w-full text-center animate-fade-in">
        <h3 className="font-heading font-700 text-xl mb-2">Total: ₹{getDiscountAndTotal().finalTotal}</h3>
        <p className="text-muted-foreground mb-6">Choose your payment method</p>
        <div className="space-y-3">
          <Button
            className="w-full h-14 text-lg"
            onClick={handleOnlinePayment}
            disabled={placingOrder}
          >
            {placingOrder ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            📱 Pay Online (UPI / Card)
          </Button>
          <Button
            variant="outline"
            className="w-full h-14 text-lg"
            onClick={handleCashPayment}
            disabled={placingOrder}
          >
            💵 Cash Payment
          </Button>
        </div>
        {paymentError && (
          <p className="text-destructive text-sm mt-3 animate-fade-in">{paymentError}</p>
        )}
        <Button
          variant="ghost"
          className="mt-4"
          onClick={() => { setShowPayment(false); setPaymentError(""); }}
          disabled={placingOrder}
        >
          Cancel
        </Button>
      </Card>
    </div>
  );

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Order History Screen ───────────────────────────────────────────────
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
            historyOrders.map((order) => (
              <Card
                key={order.id}
                className={`p-4 border-2 ${order.served ? "border-accent/40 bg-accent/5" : "border-border"}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-heading font-700 text-lg">{order.orderId}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                  {order.shopName && (
                    <p className="text-xs font-600 text-primary mt-1">🏪 {order.shopName}</p>
                  )}
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
                    <Badge
                      variant={order.paymentMethod === "online" ? "default" : "secondary"}
                      className="text-xs"
                    >
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

                {order.discount ? (
                  <div className="flex justify-between text-xs text-accent mt-1 mb-2">
                    <span>Discount applied</span>
                    <span>-₹{order.discount}</span>
                  </div>
                ) : null}
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

  // ── Order Complete ─────────────────────────────────────────────────────
  if (orderComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="p-8 text-center max-w-md w-full animate-fade-in">
          <div className="text-6xl mb-4">{orderComplete.method === "online" ? "✅" : "🧾"}</div>
          <h2 className="font-heading font-700 text-2xl mb-2">Order Confirmed!</h2>
          <p className="text-muted-foreground mb-4">
            {orderComplete.method === "online"
              ? "Payment received. Thank you!"
              : "Please pay cash at the counter"}
          </p>
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <p className="text-sm text-muted-foreground">Your Order ID</p>
            <p className="text-3xl font-heading font-800 text-primary">{orderComplete.orderId}</p>
          </div>
          <Button
            onClick={() => { setOrderComplete(null); setSelectedShopId(null); }}
            className="w-full"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  // ── Cart ───────────────────────────────────────────────────────────────
  if (showCart) {
    const { subtotal, discount, potentialDiscount, isEligible, finalTotal } = getDiscountAndTotal();

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
            <div className="text-center py-12">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <Card key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-600">{foodTypeEmojis[item.type as FoodType]} {item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{item.price} × {item.cartQuantity} = ₹{item.price * item.cartQuantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-600">{item.cartQuantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8"
                      onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}

              {selectedShop?.offer && selectedShop.offer.validUntil === getTodayString() && (
                <Card className="p-4 border-2 border-dashed border-primary/50 bg-primary/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 bg-primary/20 p-2 rounded-full text-primary">
                        <Gift className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-heading font-700 text-primary">{selectedShop.offer.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Save {selectedShop.offer.percentage}% on orders above ₹{selectedShop.offer.minAmount}
                        </p>
                        {isEligible && applyOffer && potentialDiscount > 0 && (
                          <p className="text-xs font-600 text-accent mt-1">
                            Yay! You saved ₹{potentialDiscount}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      {isEligible ? (
                        <Button
                          variant={applyOffer ? "outline" : "default"}
                          size="sm"
                          className={applyOffer ? "text-destructive hover:text-destructive border-destructive" : ""}
                          onClick={() => setApplyOffer(!applyOffer)}
                        >
                          {applyOffer ? "Remove" : "Apply"}
                        </Button>
                      ) : (
                        <p className="text-xs font-600 text-muted-foreground text-right w-20">
                          Add ₹{selectedShop.offer.minAmount - subtotal} more
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-4 bg-secondary">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Subtotal</span><span className="font-600">₹{subtotal}</span>
                  </div>
                  {discount > 0 && <div className="flex justify-between items-center text-sm text-accent"><span>Discount ({selectedShop.offer.percentage}%)</span><span className="font-600">-₹{discount}</span></div>}
                  <div className="flex justify-between items-center border-t border-border/50 pt-2">
                    <span className="font-heading font-600">Total</span>
                    <span className="text-2xl font-heading font-800 text-primary">₹{finalTotal}</span>
                  </div>
                </div>
              </Card>
              <Button className="w-full h-12 text-lg" onClick={() => { setPaymentError(""); setShowPayment(true); }}>
                Pay Now
              </Button>
            </>
          )}
        </div>
        {showPayment && <PaymentModal />}
      </div>
    );
  }

  // ── Menu ───────────────────────────────────────────────────────────────
  if (selectedShopId) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={handleBackToShops} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="font-heading font-700 text-xl">{selectedShop?.name}</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowHistory(true)}>
              <History className="w-4 h-4 mr-1" /> Orders
            </Button>
            <Button variant="outline" size="sm" className="relative" onClick={() => setShowCart(true)}>
              <ShoppingCart className="w-4 h-4 mr-1" /> Cart
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {cart.length > 0 && (
              <Button size="sm" onClick={() => { setPaymentError(""); setShowPayment(true); }}>
                Pay ₹{getDiscountAndTotal().finalTotal}
              </Button>
            )}
          </div>
        </header>

        <div className="flex border-b border-border">
          {(["food", "snack", "drink"] as FoodType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveCategory(type)}
              className={`flex-1 py-4 text-center font-heading font-600 transition-colors ${
                activeCategory === type
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground"
              }`}
            >
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
                    {item.countable && item.quantity !== undefined && (
                      <p className="text-xs text-muted-foreground">Stock: {item.quantity}</p>
                    )}
                    {!item.countable && (
                      <p className="text-xs text-accent">Always available</p>
                    )}
                  </div>
                  {inCart ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, inCart.cartQuantity - 1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-6 text-center font-600">{inCart.cartQuantity}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8"
                        onClick={() => updateCartQuantity(item.id, inCart.cartQuantity + 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => addToCart(toMenuItem(item))}>
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {showPayment && <PaymentModal />}
      </div>
    );
  }

  // ── Available Shops ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-heading font-700 text-xl">Available Shops</h1>
        </div>
        <div className="flex items-center gap-4">
          {localUser && (
            <span className="text-sm font-600 text-muted-foreground hidden sm:inline-block">
              {localUser.phoneNumber}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
            <History className="w-4 h-4 mr-2" /> My Orders
          </Button>
        </div>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {loadingShops ? (
          <div className="flex justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : shops.length === 0 ? (
          <Card className="p-12 text-center max-w-md mx-auto animate-fade-in">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="font-heading font-700 text-xl mb-2">No Shops Yet</h2>
            <p className="text-muted-foreground">Check back later when a shop is added.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {shops.map((shop) => {
              const hasOffer = shop.isOpen !== false && shop.offer && shop.offer.validUntil === getTodayString();
              return (
                <Card
                  key={shop.id}
                  className={`p-6 relative transition-all group animate-fade-in ${shop.isOpen !== false ? "cursor-pointer hover:border-primary hover:shadow-md" : "opacity-70 cursor-not-allowed"}`}
                  onClick={() => shop.isOpen !== false ? handleShopClick(shop) : alert(`${shop.name} is currently closed.`)}
                >
                  <div className="absolute top-4 right-4">
                    <Badge variant={shop.isOpen !== false ? "default" : "destructive"}>
                      {shop.isOpen !== false ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform inline-block">🏪</div>
                  <h2 className="font-heading font-700 text-xl mb-1 group-hover:text-primary transition-colors">
                    {shop.name}
                  </h2>
                  {shop.slogan && <p className="text-sm text-muted-foreground">{shop.slogan}</p>}
                  
                  {hasOffer && (
                    <div className="mt-4 bg-accent/10 border border-accent/20 rounded-lg p-3 text-left">
                      <p className="text-sm font-700 text-accent flex items-center gap-1">
                        <Gift className="w-4 h-4" /> {shop.offer.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {shop.offer.percentage}% OFF on orders above ₹{shop.offer.minAmount}
                      </p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserHome;