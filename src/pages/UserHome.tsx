// UserHome.tsx - Complete Redesign
import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, where,
  addDoc, doc, updateDoc, increment,
  runTransaction, setDoc, deleteDoc,
} from "firebase/firestore";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  ArrowLeft, ShoppingCart, Plus, Minus, Trash2, Star,
  Loader2, Clock, Gift, ChevronRight, 
  Home, Search, FileText, User, MapPin, 
  CreditCard, CheckCircle2, X, Sparkles, Flame, LogOut
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const RAZORPAY_KEY = "rzp_live_ScZx0esi774zi7";

const loadRazorpay = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

type FoodType = "food" | "snack" | "drink" | "favorite";

interface InventoryItem {
  id: string;
  name: string;
  price: number;
  type: FoodType;
  countable: boolean;
  quantity?: number;
  available: boolean;
  description?: string;
  image?: string;
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
  shopAddress?: string;
  subtotal?: number;
  discount?: number;
  createdAt: any;
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const getNextOrderId = async (shopId: string) => {
  const shopRef = doc(db, "Shop", shopId);
  
  const nextNum = await runTransaction(db, async (transaction) => {
    const shopDoc = await transaction.get(shopRef);
    const currentCount = shopDoc.data()?.orderCount;
    let nextCount = 0;
    if (currentCount === undefined) {
      nextCount = 0;
    } else {
      nextCount = currentCount + 1;
        // Total combinations for 2 letters and 2 numbers: 26 * 26 * 100 = 67600
        if (nextCount >= 67600) nextCount = 0;
    }
    transaction.update(shopRef, { orderCount: nextCount });
    return nextCount;
  });

  // Randomize the sequential number to avoid repeating sequential patterns
  // This mathematical formula ensures a 1-to-1 mapping without any repeats until all 67600 are used
  const randomizedNum = (nextNum * 9301 + 11111) % 67600;

  // Convert to 2 letters + 2 numbers format (e.g., AA00 to ZZ99)
  const numPart = randomizedNum % 100;
  const letterPart = Math.floor(randomizedNum / 100);
  const firstLetter = String.fromCharCode(65 + Math.floor(letterPart / 26));
  const secondLetter = String.fromCharCode(65 + (letterPart % 26));

  const newOrderId = `${firstLetter}${secondLetter}${String(numPart).padStart(2, "0")}`;
  
  try {
    const q = query(collection(db, "Orders"), where("shopId", "==", shopId), where("orderId", "==", newOrderId));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map((d) => updateDoc(doc(db, "Orders", d.id), { orderId: "" })));
  } catch (err) {
    console.error("Failed to clear old order IDs", err);
  }

  return newOrderId;
};

// ========== HOME SCREEN ==========
// ========== HOME SCREEN (Updated) ==========
const HomeScreen = ({ 
  shops, loadingShops, onShopSelect, onViewHistory, onLogout 
}: { 
  shops: any[], loadingShops: boolean, 
  onShopSelect: (shop: any) => void,
  onViewHistory: () => void,
  onLogout: () => void
}) => {
  const { currentUser } = useStore();
  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Get the display name (show phone number if no name)
  const displayName = currentUser?.phoneNumber?.replace("+91", "") || "Guest";

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent pt-6 pb-4 px-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">{greeting()},</p>
            <h1 className="text-2xl font-heading font-800 text-foreground">
              {displayName}
            </h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={onViewHistory}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center"
            >
              <FileText className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={onLogout}
              className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-5 h-5 text-destructive" />
            </button>
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className="px-5 mt-6 mb-3 flex justify-between items-center">
        <h2 className="font-heading font-700 text-lg">Our Canteens</h2>
        <button className="text-xs text-primary flex items-center gap-1">
          See all <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Shops/Canteens List with their own offers */}
      {loadingShops ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : shops.length === 0 ? (
        <Card className="mx-5 p-8 text-center">
          <div className="text-5xl mb-3">🏪</div>
          <p className="text-muted-foreground">No canteens available</p>
        </Card>
      ) : (
        <div className="px-5 space-y-4">
          {shops.map((shop) => {
            const hasOffer = shop.offer && shop.offer.validUntil === getTodayString();
            const isOpen = shop.isOpen !== false;
            
            return (
              <div key={shop.id} className="space-y-2">
                {/* Show canteen-specific offer ABOVE the canteen card */}
                {hasOffer && (
                  <div className="rounded-xl overflow-hidden bg-gradient-to-r from-accent/20 via-accent/10 to-transparent border border-accent/30">
                    <div className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Gift className="w-4 h-4 text-accent" />
                        <span className="text-xs font-600 text-accent uppercase tracking-wider">Today's Offer</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-heading font-700 text-base">{shop.offer.title || "Special Offer"}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge className="bg-accent text-white text-[10px] px-2 py-0">
                              {shop.offer.percentage}% OFF
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              On orders above ₹{shop.offer.minAmount}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">
                            Valid {shop.offer.validUntil === getTodayString() ? "Today" : shop.offer.validUntil}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Canteen Card */}
                <button
                  onClick={() => isOpen && onShopSelect(shop)}
                  className="w-full text-left"
                >
                  <Card className={`p-4 transition-all active:scale-[0.98] ${isOpen ? "cursor-pointer hover:border-primary/50" : "opacity-60"}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-heading font-700 text-lg">{shop.name}</h3>
                          <Badge 
                            variant={isOpen ? "default" : "destructive"} 
                            className="text-[10px] px-2"
                          >
                            {isOpen ? "OPEN NOW" : "CLOSED"}
                          </Badge>
                        </div>
                        {shop.slogan && (
                          <p className="text-sm text-muted-foreground">{shop.slogan}</p>
                        )}
                        {shop.address && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{shop.address}</span>
                          </div>
                        )}
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    </div>
                  </Card>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ========== MENU SCREEN ==========
// ========== MENU SCREEN (Updated with Search) ==========
const MenuScreen = ({ 
  shop, onBack, onViewHistory, cart, addToCart, updateCartQuantity, removeFromCart, getCartTotal, clearCart
}: { 
  shop: any, onBack: () => void, onViewHistory: () => void,
  cart: any[], addToCart: any, updateCartQuantity: any, removeFromCart: any, getCartTotal: () => number, clearCart: () => void
}) => {
  const [menuItems, setMenuItems] = useState<InventoryItem[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [activeCategory, setActiveCategory] = useState<FoodType>("food");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [applyOffer, setApplyOffer] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [orderComplete, setOrderComplete] = useState<{ orderId: string; method: string } | null>(null);
  const { currentUser } = useStore();

  const fetchMenu = async () => {
    setLoadingMenu(true);
    try {
      const snap = await getDocs(
        query(collection(db, "Shop", shop.id, "Inventory"), where("available", "==", true))
      );
      setMenuItems(snap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)));
    } catch (e) { console.error(e); }
    finally { setLoadingMenu(false); }
  };

  useEffect(() => { fetchMenu(); }, [shop.id]);

  useEffect(() => {
    if (!currentUser?.phoneNumber) return;
    const userDocId = currentUser.phoneNumber;

    const fetchFavorites = async () => {
        setLoadingFavorites(true);
        try {
            // Assuming 'Users' collection with doc ID as phone number
            const favsCollectionRef = collection(db, "users", userDocId, "Favorites");
            const favSnap = await getDocs(favsCollectionRef);
            const favIds = favSnap.docs.map(doc => doc.id);
            setFavorites(favIds);
        } catch (e) {
            console.error("Error fetching favorites:", e);
        } finally {
            setLoadingFavorites(false);
        }
    };

    fetchFavorites();
  }, [currentUser]);

  const toggleFavorite = async (itemId: string) => {
    if (!currentUser?.phoneNumber) return;
    const userDocId = currentUser.phoneNumber;
    const favDocRef = doc(db, "users", userDocId, "Favorites", itemId);

    const isFavorite = favorites.includes(itemId);

    try {
        if (isFavorite) {
            await deleteDoc(favDocRef);
            setFavorites(favs => favs.filter(id => id !== itemId));
        } else {
            await setDoc(favDocRef, { addedAt: new Date() });
            setFavorites(favs => [...favs, itemId]);
        }
    } catch (e) {
        console.error("Error updating favorite:", e);
    }
  };

  // Filter items based on category AND search query
  const getFilteredItems = () => {
    let baseItems = activeCategory === 'favorite'
      ? menuItems.filter(item => favorites.includes(item.id))
      : menuItems.filter((m) => m.type === activeCategory);
    
    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      return baseItems.filter(item => 
        item.name.toLowerCase().includes(queryLower) ||
        (item.description && item.description.toLowerCase().includes(queryLower))
      );
    }
    
    return baseItems;
  };

  const activeMenu = getFilteredItems();
  const cartCount = cart.reduce((s, c) => s + c.cartQuantity, 0);
  const cartItem = (id: string) => cart.find((c) => c.id === id);
  const cartTotal = getCartTotal();

  const getDiscountAndTotal = () => {
    const subtotal = cartTotal;
    let potentialDiscount = 0;
    let isEligible = false;

    if (shop?.offer) {
      const offer = shop.offer;
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

  const saveOrder = async (orderId: string, method: "online" | "cash", razorpayPaymentId?: string) => {
    const { subtotal, discount, finalTotal } = getDiscountAndTotal();

    await addDoc(collection(db, "Orders"), {
      orderId,
      user: localStorage.getItem("skipq_user") ? JSON.parse(localStorage.getItem("skipq_user")!).phoneNumber?.replace("+91", "") : null,
      items: cart.map((item) => ({
        id: item.id, name: item.name, price: item.price,
        type: item.type, cartQuantity: item.cartQuantity,
      })),
      shopId: shop.id,
      shopName: shop.name,
      shopAddress: shop.address,
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

    for (const item of cart) {
      const invItem = menuItems.find((m) => m.id === item.id);
      if (invItem?.countable) {
        await updateDoc(doc(db, "Shop", shop.id, "Inventory", item.id), {
          quantity: increment(-item.cartQuantity),
        });
      }
    }

    fetchMenu();
    setApplyOffer(false);
  };

  // FIXED: Cash Payment Handler
  const handleCashPayment = async () => {
    setPaymentError("");
    setPlacingOrder(true);
    
    try {
      // Get current user from localStorage
      const storedUser = localStorage.getItem("skipq_user");
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userPhone = user?.phoneNumber?.replace("+91", "") || null;
      
      // Get next order ID
      const orderId = await getNextOrderId(shop.id);
      const { subtotal, discount, finalTotal } = getDiscountAndTotal();
      
      // Create order in Firestore
      const orderData = {
        orderId: orderId,
        user: userPhone,
        items: cart.map((item) => ({
          id: item.id, 
          name: item.name, 
          price: item.price,
          type: item.type, 
          cartQuantity: item.cartQuantity,
        })),
        shopId: shop.id,
        shopName: shop.name,
        shopAddress: shop.address || "Canteen",
        subtotal: subtotal,
        discount: discount,
        total: finalTotal,
        paymentMethod: "cash",
        paymentStatus: "pending",
        status: "confirmed",
        served: false,
        createdAt: new Date(),
      };
      
      console.log("Saving order:", orderData);
      await addDoc(collection(db, "Orders"), orderData);
      
      // Reduce quantity for countable items
      for (const item of cart) {
        const invItem = menuItems.find((m) => m.id === item.id);
        if (invItem?.countable && invItem.quantity) {
          await updateDoc(doc(db, "Shop", shop.id, "Inventory", item.id), {
            quantity: increment(-item.cartQuantity),
          });
        }
      }
      
      // Refresh menu to update stock
      await fetchMenu();
      
      // Clear cart and show success
      clearCart();
      setApplyOffer(false);
      setOrderComplete({ orderId, method: "cash" });
      setShowPayment(false);
      setShowCartSheet(false);
      
    } catch (error) {
      console.error("Cash payment error:", error);
      setPaymentError("Failed to place order. Please try again: " + (error as Error).message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleOnlinePayment = async () => {
    setPaymentError("");
    setPlacingOrder(true);

    const loaded = await loadRazorpay();
    if (!loaded) {
      setPaymentError("Failed to load payment gateway.");
      setPlacingOrder(false);
      return;
    }

    try {
      const orderId = await getNextOrderId(shop.id);
      const { finalTotal } = getDiscountAndTotal();

      const options = {
        key: RAZORPAY_KEY,
        amount: finalTotal * 100,
        currency: "INR",
        name: shop.name,
        description: `Order ${orderId}`,
        prefill: {
          contact: localStorage.getItem("skipq_user") ? JSON.parse(localStorage.getItem("skipq_user")!).phoneNumber : "",
        },
        notes: { orderId },
        theme: { color: "#8B5CF6" },  // Violet color for Razorpay
        handler: async (response: any) => {
          try {
            await saveOrder(orderId, "online", response.razorpay_payment_id);
            setOrderComplete({ orderId, method: "online" });
            setShowPayment(false);
            setShowCartSheet(false);
          } catch (e) {
            console.error("Order save failed:", e);
            setPaymentError("Payment received but order failed. Refund initiated.");
            const functions = getFunctions();
            const refundFn = httpsCallable(functions, "refundFailedOrder");
            await refundFn({ razorpayPaymentId: response.razorpay_payment_id, amount: finalTotal });
          } finally {
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPlacingOrder(false);
            setPaymentError("Payment cancelled.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setPaymentError(`Payment failed: ${response.error.description}`);
        setPlacingOrder(false);
      });
      rzp.open();
    } catch (e) {
      console.error(e);
      setPaymentError("Failed to initialize order.");
      setPlacingOrder(false);
    }
  };

  const { finalTotal, isEligible, potentialDiscount } = getDiscountAndTotal();

  // Order Complete Screen
  // Order Complete Screen - Updated to match reference image
  if (orderComplete) {
    const storedUser = localStorage.getItem("skipq_user");
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userPhone = user?.phoneNumber?.replace("+91", "") || "";
    
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border px-5 py-4">
          <h1 className="font-heading font-700 text-xl text-center">Order Status</h1>
        </div>
        
        <div className="p-5 max-w-md mx-auto">
          {/* Success Animation */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-accent" />
            </div>
            <h2 className="font-heading font-700 text-xl mb-1">Order Confirmed!</h2>
            <p className="text-muted-foreground text-sm">
              Your order has been placed successfully and is being shared with the chef.
            </p>
          </div>
          
          {/* Order ID Card */}
          <Card className="p-5 mb-5 text-center bg-secondary/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ORDER ID</p>
            <p className="text-2xl font-heading font-800 text-primary tracking-wider">{orderComplete.orderId}</p>
            <button className="text-xs text-primary mt-1">Tap to reveal</button>
          </Card>
          
          {/* Payment Status */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-600 text-accent">
                {orderComplete.method === "online" ? "Paid via UPI" : "Cash Payment"}
              </p>
              <p className="text-xs text-muted-foreground">Transaction Successful</p>
            </div>
          </div>
          
          {/* Order Summary */}
          <Card className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg">🏪</span>
              </div>
              <div>
                <p className="font-heading font-700">{shop.name}</p>
                <p className="text-xs text-muted-foreground">{shop.address || "Main Block, Floor 2"}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              {cart.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {item.name} 
                    <span className="text-muted-foreground ml-1">x{item.cartQuantity}</span>
                  </span>
                  <span className="font-600">₹{item.price * item.cartQuantity}</span>
                </div>
              ))}
            </div>
            
            {getDiscountAndTotal().discount > 0 && (
              <div className="flex justify-between text-sm text-accent mt-3 pt-2 border-t border-border">
                <span>Discount Applied</span>
                <span>-₹{getDiscountAndTotal().discount}</span>
              </div>
            )}
            
            <div className="flex justify-between mt-3 pt-2 border-t border-border">
              <span className="font-heading font-700">Total</span>
              <span className="font-heading font-700 text-primary">₹{getDiscountAndTotal().finalTotal}</span>
            </div>
          </Card>
          
          {/* Bottom Navigation (Optional) */}
          <div className="flex justify-around mt-8 pt-4 border-t border-border">
            <button 
              onClick={() => window.location.reload()} 
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="text-xs">EXPLORE</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-primary">
              <FileText className="w-5 h-5" />
              <span className="text-xs">ORDERS</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors">
              <User className="w-5 h-5" />
              <span className="text-xs">PROFILE</span>
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button 
              variant="outline" 
              className="flex-1 rounded-full"
              onClick={() => window.location.reload()}
            >
              Explore More
            </Button>
            <Button 
              className="flex-1 rounded-full"
              onClick={() => {
                setOrderComplete(null);
                onBack();
                clearCart();
              }}
            >
              View Orders
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-heading font-700 text-lg">{shop.name}</h1>
          {shop.address && <p className="text-xs text-muted-foreground">{shop.address}</p>}
        </div>
        {/* Search Button */}
        <button 
          onClick={() => setShowSearch(!showSearch)}
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
        >
          <Search className="w-4 h-4 text-muted-foreground" />
        </button>
        <button 
          onClick={onViewHistory} 
          className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center"
        >
          <FileText className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-5 py-3 border-b border-border bg-card animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search for food, snacks, drinks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background border-border rounded-xl"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="border-b border-border px-5">
        <div className="flex gap-6">
          {(["food", "snack", "drink", "favorite"] as FoodType[]).map((type) => {
            const count = type === 'favorite' ? favorites.length : menuItems.filter(m => m.type === type).length;
            const label = {
              food: "🍛 Meals",
              snack: "🍿 Snacks",
              drink: "🥤 Drinks",
              favorite: <><Star className="w-4 h-4 mr-1.5" /><span>Favorites</span></>
            }[type];

            return (
              <button
                key={type}
                onClick={() => {
                  setActiveCategory(type);
                  setSearchQuery(""); // Clear search when changing category
                }}
                className={`py-3 text-sm font-600 transition-colors relative ${
                  activeCategory === type ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <div className="flex items-center">
                  {label}
                  {count > 0 && <span className={`ml-1.5 text-xs`}>({count})</span>}
                </div>
                {activeCategory === type && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu Items List */}
      <div className="p-5 space-y-4">
        {loadingMenu || (activeCategory === 'favorite' && loadingFavorites) ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading delicious items...</p>
          </div>
        ) : activeMenu.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center mb-4">
              {searchQuery ? (
                <Search className="w-10 h-10 text-muted-foreground" />
              ) : (
                <span className="text-5xl">
                  {activeCategory === "food" && "🍽️"}
                  {activeCategory === "snack" && "🍿"}
                  {activeCategory === "drink" && "🥤"}
                  {activeCategory === "favorite" && "⭐"}
                </span>
              )}
            </div>
            <h3 className="font-heading font-700 text-lg mb-1">
              {searchQuery ? "No results found" : `No ${activeCategory === "food" ? "meals" : activeCategory === "snack" ? "snacks" : "drinks"} available`}
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery 
                ? `We couldn't find "${searchQuery}" in our menu` 
                : `Check back later for delicious ${activeCategory === "food" ? "meals" : activeCategory === "snack" ? "snacks" : "beverages"}`}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchQuery("")}
              >
                Clear Search
              </Button>
            )}
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="text-sm text-muted-foreground mb-2">
                Found {activeMenu.length} item{activeMenu.length !== 1 ? "s" : ""} for "{searchQuery}"
              </div>
            )}
            {activeMenu.map((item) => {
            const inCart = cartItem(item.id);
            return (
              <Card key={item.id} className="p-4 flex gap-4 hover:border-primary/50 transition-all">
                {/* Item Image/Icon */}
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-2xl">
                    {item.type === "food" && "🍛"}
                    {item.type === "snack" && "🍿"}
                    {item.type === "drink" && "🥤"}
                  </span>
                </div>
                
                {/* Item Details */}
                <div className="flex-1">
                  <h3 className="font-heading font-700">{item.name}</h3>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-primary font-700 text-lg">₹{item.price}</span>
                    {item.countable && item.quantity !== undefined && item.quantity < 10 && (
                      <Badge variant="secondary" className="text-[10px]">
                        Only {item.quantity} left
                      </Badge>
                    )}
                  </div>
                </div>
                
                {/* Quantity Controls */}
                <div className="flex flex-col items-end justify-between -my-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(item.id);
                      }}
                    >
                      <Star className={`w-5 h-5 transition-all ${
                        favorites.includes(item.id) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/50 hover:text-muted-foreground'
                      }`} />
                    </Button>

                    <div className="flex items-center gap-2">
                      {inCart ? (
                        <div className="flex items-center gap-2 bg-secondary rounded-full px-2 py-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full hover:bg-destructive/10"
                            onClick={() => updateCartQuantity(item.id, inCart.cartQuantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-6 text-center font-600 text-sm">{inCart.cartQuantity}</span>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 rounded-full hover:bg-primary/10"
                            onClick={() => updateCartQuantity(item.id, inCart.cartQuantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          className="rounded-full px-4"
                          onClick={() => addToCart({ ...item, cartQuantity: 1 })}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      )}
                    </div>
                </div>
              </Card>
            );
            })}
          </>
        )}
      </div>

      {/* Cart Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 animate-slide-up">
          <div className="flex items-center justify-between max-w-md mx-auto">
            <div>
              <p className="text-xs text-muted-foreground">Current Order</p>
              <p className="font-600 text-lg">{cart.length} item{cart.length !== 1 ? "s" : ""} • ₹{finalTotal}</p>
            </div>
            <Button onClick={() => setShowCartSheet(true)} className="gap-2 rounded-full px-6">
              <ShoppingCart className="w-4 h-4" />
              View Cart
            </Button>
          </div>
        </div>
      )}

      {/* // Cart Sheet Component - Replace the existing Cart Sheet in MenuScreen */}
      {/* Cart Sheet - Updated Premium Design */}
      <Sheet open={showCartSheet} onOpenChange={setShowCartSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto p-0">
          <div className="p-5 border-b border-border">
            <SheetHeader className="text-left">
              <SheetTitle className="text-xl font-heading font-700">Your Cart</SheetTitle>
            </SheetHeader>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Shop Info */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-700">{shop.name}</h3>
                <p className="text-xs text-muted-foreground">{cart.length} Items</p>
              </div>
            </div>

            {/* Cart Items */}
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start py-2">
                  <div className="flex-1">
                    <p className="font-600">{item.name}</p>
                    <p className="text-sm text-primary font-600">₹{item.price}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-secondary rounded-full px-2 py-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-destructive/10"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-5 text-center text-sm font-600">{item.cartQuantity}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 rounded-full hover:bg-primary/10"
                        onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Complete Your Meal Section */}
            {menuItems.length > 0 && (
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="font-heading font-600 text-sm mb-3 text-muted-foreground">COMPLETE YOUR MEAL</h4>
                <div className="space-y-3">
                  {menuItems.slice(0, 3).map((item) => {
                    const isInCart = cart.some(c => c.id === item.id);
                    if (isInCart) return null;
                    return (
                      <div key={item.id} className="flex justify-between items-center">
                        <div>
                          <p className="font-500 text-sm">{item.name}</p>
                          <p className="text-xs text-primary font-600">₹{item.price}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-full h-8 px-4 text-xs"
                          onClick={() => addToCart({ ...item, cartQuantity: 1 })}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price Breakdown */}
            <div className="mt-6 pt-4 border-t border-border space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-600">₹{getDiscountAndTotal().subtotal}</span>
              </div>
              {getDiscountAndTotal().discount > 0 && (
                <div className="flex justify-between text-sm text-accent">
                  <span>Discount ({shop?.offer?.percentage}% OFF)</span>
                  <span>-₹{getDiscountAndTotal().discount}</span>
                </div>
              )}
              {/* <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform Fee</span>
                <span className="font-600">₹{Math.round(getDiscountAndTotal().finalTotal * 0.05)}</span>
              </div> */}
              <div className="flex justify-between pt-2 border-t border-border mt-2">
                <span className="font-heading font-700">Total Amount</span>
                <span className="font-heading font-700 text-primary text-lg">
                  ₹{getDiscountAndTotal().finalTotal}
                </span>
              </div>
            </div>

            {/* Pay Button */}
            <div className="pt-4">
              <Button 
                className="w-full h-14 text-lg rounded-xl"
                onClick={() => { setShowPayment(true); setShowCartSheet(false); }}
              >
                Pay Now ₹{getDiscountAndTotal().finalTotal}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Payment Modal */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md text-center p-6">
          <h3 className="font-heading font-700 text-xl mb-1">Total: ₹{finalTotal}</h3>
          <p className="text-muted-foreground text-sm mb-6">Choose your payment method</p>
          <div className="space-y-3">
            <Button className="w-full h-12 rounded-full" onClick={handleOnlinePayment} disabled={placingOrder}>
              {placingOrder ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              📱 Pay Online (UPI / Card)
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-full" onClick={handleCashPayment} disabled={placingOrder}>
              💵 Cash Payment
            </Button>
          </div>
          {paymentError && <p className="text-destructive text-sm mt-3">{paymentError}</p>}
          <Button variant="ghost" className="mt-4" onClick={() => setShowPayment(false)}>Cancel</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ========== MAIN USER HOME COMPONENT ==========
const UserHome = () => {
  const navigate = useNavigate();
  const { cart, addToCart, removeFromCart, updateCartQuantity, getCartTotal, clearCart, setCurrentUser } = useStore();
  const [shops, setShops] = useState<any[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("skipq_user");
    if (!storedUser) {
      navigate("/user-login");
    } else {
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthChecking(false);
    }
  }, [navigate, setCurrentUser]);

  useEffect(() => {
    const fetchShops = async () => {
      setLoadingShops(true);
      try {
        const snap = await getDocs(collection(db, "Shop"));
        setShops(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { console.error(e); }
      finally { setLoadingShops(false); }
    };
    fetchShops();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("skipq_user");
    setCurrentUser(null);
    navigate("/user-login");
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showHistory) {
    return <OrderHistoryScreen onBack={() => setShowHistory(false)} />;
  }

  if (selectedShop) {
    return (
      <MenuScreen
        shop={selectedShop}
        onBack={() => {
          clearCart();
          setSelectedShop(null);
        }}
        onViewHistory={() => setShowHistory(true)}
        cart={cart}
        addToCart={addToCart}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        getCartTotal={getCartTotal}
        clearCart={clearCart}
      />
    );
  }

  return (
    <HomeScreen
      shops={shops}
      loadingShops={loadingShops}
      onShopSelect={setSelectedShop}
      onViewHistory={() => setShowHistory(true)}
      onLogout={handleLogout}
    />
  );
};

// ========== ORDER HISTORY SCREEN ==========
const OrderHistoryScreen = ({ onBack }: { onBack: () => void }) => {
  const [orders, setOrders] = useState<FirestoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const user = localStorage.getItem("skipq_user");
        const phoneNumber = user ? JSON.parse(user).phoneNumber?.replace("+91", "") : null;
        const snap = await getDocs(
          query(collection(db, "Orders"), where("user", "==", phoneNumber))
        );
        const fetched = snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOrder));
        fetched.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() ?? new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() ?? new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });
        setOrders(fetched);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchOrders();
  }, []);

  const formatTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-5 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-heading font-700 text-xl">My Orders</h1>
      </div>

      <div className="p-5 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">🍽️</div>
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-heading font-700 text-lg">{order.orderId}</p>
                  <p className="text-xs text-muted-foreground">{formatTime(order.createdAt)}</p>
                </div>
                <Badge variant={order.served ? "default" : "secondary"} className="text-xs">
                  {order.served ? "Completed" : "Preparing"}
                </Badge>
              </div>
              <div className="space-y-1 mb-3">
                {order.items.slice(0, 2).map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} × {item.cartQuantity}</span>
                    <span>₹{item.price * item.cartQuantity}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-xs text-muted-foreground">+{order.items.length - 2} more items</p>
                )}
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
};

export default UserHome;