import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Printer, Search } from "lucide-react";
import { Link } from "react-router-dom";

const BillingPage = () => {
  const { getOrderByOrderId } = useStore();
  const [orderId, setOrderId] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  const handleSearch = () => {
    const order = getOrderByOrderId(orderId.trim().toUpperCase());
    if (order) {
      setSearchedOrder(order);
      setNotFound(false);
    } else {
      setSearchedOrder(null);
      setNotFound(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

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
            <Button onClick={handleSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </Card>

        {notFound && (
          <Card className="p-6 text-center animate-fade-in">
            <p className="text-destructive font-600">Order not found. Please check the Order ID.</p>
          </Card>
        )}

        {searchedOrder && (
          <div
            className={`rounded-2xl p-6 animate-fade-in ${
              searchedOrder.paymentMethod === "online"
                ? "gradient-success text-white"
                : "gradient-cash text-white"
            }`}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">
                {searchedOrder.paymentMethod === "online" ? "✅" : "💵"}
              </div>
              <h2 className="font-heading font-800 text-2xl">
                {searchedOrder.paymentMethod === "online" ? "PAID ONLINE" : "CASH PAYMENT"}
              </h2>
              <p className="opacity-90 text-sm mt-1">
                Order #{searchedOrder.orderId}
              </p>
            </div>

            <div className="bg-white/20 rounded-xl p-4 mb-4 space-y-2">
              {searchedOrder.items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} × {item.cartQuantity}</span>
                  <span>₹{item.price * item.cartQuantity}</span>
                </div>
              ))}
              <div className="border-t border-white/30 pt-2 mt-2 flex justify-between font-heading font-700 text-lg">
                <span>Total</span>
                <span>₹{searchedOrder.total}</span>
              </div>
            </div>

            {searchedOrder.paymentMethod === "cash" && (
              <p className="text-center text-sm opacity-90 mb-4">
                Collect ₹{searchedOrder.total} cash from customer
              </p>
            )}

            <Button
              variant="secondary"
              className="w-full h-12 text-foreground"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" /> Print Bill
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;
