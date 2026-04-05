import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Link } from "react-router-dom";

const BillingPage = () => {
  const [orderId, setOrderId] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serving, setServing] = useState(false);

  const handleSearch = async () => {
    const trimmed = orderId.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setSearchedOrder(null);
    setNotFound(false);

    try {
      const snap = await getDocs(
        query(collection(db, "Orders"), where("orderId", "==", trimmed))
      );
      if (!snap.empty) {
        setSearchedOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        setNotFound(true);
      }
    } catch (e) {
      console.error(e);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const handleServed = async () => {
    if (!searchedOrder) return;
    setServing(true);
    try {
      await updateDoc(doc(db, "Orders", searchedOrder.id), {
        served: true,
      });
      setSearchedOrder({ ...searchedOrder, served: true });
    } catch (e) {
      console.error(e);
    } finally {
      setServing(false);
    }
  };

  const isServed = searchedOrder?.served === true;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading font-700 text-xl">Billing Counter</h1>
      </header>

      <div className="max-w-lg mx-auto p-6">
        {/* Search */}
        <Card className="p-6 mb-6">
          <h2 className="font-heading font-600 text-lg mb-4">Verify Order</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Order ID (e.g., ORD-ABC123)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono"
            />
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </Card>

        {notFound && (
          <Card className="p-6 text-center animate-fade-in">
            <p className="text-destructive font-600">Order not found. Please check the Order ID.</p>
          </Card>
        )}

        {searchedOrder && (
          <div className={`rounded-2xl p-6 animate-fade-in ${
            isServed
              ? "bg-muted border-2 border-border"
              : searchedOrder.paymentMethod === "online"
              ? "gradient-success text-white"
              : "gradient-cash text-white"
          }`}>
            {/* Served badge */}
            <div className="flex justify-center mb-4">
              {isServed ? (
                <div className="flex items-center gap-2 bg-accent/10 text-accent border border-accent rounded-full px-4 py-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-700">Served</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-700">Not Served Yet</span>
                </div>
              )}
            </div>

            <div className="text-center mb-6">
              <div className="text-5xl mb-3">
                {isServed ? "🍽️" : searchedOrder.paymentMethod === "online" ? "✅" : "💵"}
              </div>
              <h2 className={`font-heading font-800 text-2xl ${isServed ? "text-foreground" : ""}`}>
                {isServed
                  ? "ORDER SERVED"
                  : searchedOrder.paymentMethod === "online"
                  ? "PAID ONLINE"
                  : "CASH PAYMENT"}
              </h2>
              <p className={`text-sm mt-1 ${isServed ? "text-muted-foreground" : "opacity-90"}`}>
                Order #{searchedOrder.orderId}
              </p>
            </div>

            {/* Items */}
            <div className={`rounded-xl p-4 mb-4 space-y-2 ${isServed ? "bg-secondary" : "bg-white/20"}`}>
              {searchedOrder.items.map((item: any, i: number) => (
                <div key={i} className={`flex justify-between text-sm ${isServed ? "text-foreground" : ""}`}>
                  <span>{item.name} × {item.cartQuantity}</span>
                  <span>₹{item.price * item.cartQuantity}</span>
                </div>
              ))}
              <div className={`border-t pt-2 mt-2 flex justify-between font-heading font-700 text-lg ${isServed ? "border-border text-foreground" : "border-white/30"}`}>
                <span>Total</span>
                <span>₹{searchedOrder.total}</span>
              </div>
            </div>

            {searchedOrder.paymentMethod === "cash" && !isServed && (
              <p className="text-center text-sm opacity-90 mb-4">
                Collect ₹{searchedOrder.total} cash from customer
              </p>
            )}

            {/* Served Button */}
            {!isServed ? (
              <Button
                className="w-full h-12 text-lg bg-white text-foreground hover:bg-white/90"
                onClick={handleServed}
                disabled={serving}
              >
                {serving
                  ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Mark as Served
              </Button>
            ) : (
              <Button variant="outline" className="w-full h-12 text-lg" disabled>
                <CheckCircle2 className="w-4 h-4 mr-2 text-accent" />
                Already Served
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;