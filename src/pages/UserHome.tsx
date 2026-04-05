import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Plus, Minus, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { FoodType, MenuItem } from "@/lib/types";

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

const UserHome = () => {
  const { canteen, menu, cart, addToCart, removeFromCart, updateCartQuantity, getCartTotal, clearCart, createOrder } = useStore();
  const [showMenu, setShowMenu] = useState(false);
  const [activeCategory, setActiveCategory] = useState<FoodType>("food");
  const [showCart, setShowCart] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderComplete, setOrderComplete] = useState<{ orderId: string; method: string } | null>(null);
  const navigate = useNavigate();

  const activeMenu = menu.filter((m) => m.active && m.type === activeCategory);
  const cartCount = cart.reduce((s, c) => s + c.cartQuantity, 0);
  const cartItem = (id: string) => cart.find((c) => c.id === id);

  const handlePayNow = () => setShowPayment(true);

  const handlePayment = (method: "online" | "cash") => {
    const order = createOrder(method);
    setOrderComplete({ orderId: order.orderId, method });
    setShowPayment(false);
    setShowCart(false);
  };

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
            <div className="text-center py-12">
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <Card key={item.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-600">{foodTypeEmojis[item.type]} {item.name}</p>
                    <p className="text-sm text-muted-foreground">₹{item.price} × {item.cartQuantity} = ₹{item.price * item.cartQuantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-600">{item.cartQuantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </Card>
              ))}
              <Card className="p-4 bg-secondary">
                <div className="flex justify-between items-center">
                  <span className="font-heading font-600">Total</span>
                  <span className="text-2xl font-heading font-800 text-primary">₹{getCartTotal()}</span>
                </div>
              </Card>
              <Button className="w-full h-12 text-lg" onClick={handlePayNow}>
                Pay Now
              </Button>
            </>
          )}
        </div>

        {showPayment && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-6 z-50">
            <Card className="p-8 max-w-sm w-full text-center animate-fade-in">
              <h3 className="font-heading font-700 text-xl mb-6">Choose Payment</h3>
              <div className="space-y-3">
                <Button className="w-full h-14 text-lg" onClick={() => handlePayment("online")}>
                  📱 UPI / Online Payment
                </Button>
                <Button variant="outline" className="w-full h-14 text-lg" onClick={() => handlePayment("cash")}>
                  💵 Cash Payment
                </Button>
              </div>
              <Button variant="ghost" className="mt-4" onClick={() => setShowPayment(false)}>Cancel</Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

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
            <Button variant="outline" size="sm" className="relative" onClick={() => setShowCart(true)}>
              <ShoppingCart className="w-4 h-4 mr-1" />
              Cart
              {cartCount > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {cartCount}
                </Badge>
              )}
            </Button>
            {cart.length > 0 && (
              <Button size="sm" onClick={handlePayNow}>Pay ₹{getCartTotal()}</Button>
            )}
          </div>
        </header>

        {/* Category Tabs */}
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

        {/* Menu Items */}
        <div className="p-4 grid gap-3 max-w-2xl mx-auto">
          {activeMenu.map((item) => {
            const inCart = cartItem(item.id);
            return (
              <Card key={item.id} className="p-4 flex items-center justify-between animate-fade-in">
                <div>
                  <p className="font-600 text-card-foreground">{item.name}</p>
                  <p className="text-primary font-heading font-700">₹{item.price}</p>
                  <p className="text-xs text-muted-foreground">Stock: {item.quantity}</p>
                </div>
                {inCart ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, inCart.cartQuantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center font-600">{inCart.cartQuantity}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateCartQuantity(item.id, inCart.cartQuantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" onClick={() => addToCart(item)}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                )}
              </Card>
            );
          })}
          {activeMenu.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No items available in this category</div>
          )}
        </div>

        {showPayment && (
          <div className="fixed inset-0 bg-foreground/50 flex items-center justify-center p-6 z-50">
            <Card className="p-8 max-w-sm w-full text-center animate-fade-in">
              <h3 className="font-heading font-700 text-xl mb-2">Total: ₹{getCartTotal()}</h3>
              <p className="text-muted-foreground mb-6">Choose your payment method</p>
              <div className="space-y-3">
                <Button className="w-full h-14 text-lg" onClick={() => handlePayment("online")}>
                  📱 UPI / Online Payment
                </Button>
                <Button variant="outline" className="w-full h-14 text-lg" onClick={() => handlePayment("cash")}>
                  💵 Cash Payment
                </Button>
              </div>
              <Button variant="ghost" className="mt-4" onClick={() => setShowPayment(false)}>Cancel</Button>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // Canteen Home
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link to="/" className="absolute top-6 left-6 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div
        className="text-center cursor-pointer group animate-fade-in"
        onClick={() => setShowMenu(true)}
      >
        <div className="text-8xl mb-6">🍽️</div>
        <h1 className="text-4xl md:text-5xl font-heading font-800 text-foreground mb-3 group-hover:text-primary transition-colors">
          {canteen.name}
        </h1>
        <p className="text-xl text-muted-foreground mb-8">{canteen.slogan}</p>
        <Button size="lg" className="text-lg px-8 h-14">
          View Menu →
        </Button>
      </div>
    </div>
  );
};

export default UserHome;
