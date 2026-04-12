import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Search, Loader2, CheckCircle2, Clock, Printer } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const BillingPage = () => {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serving, setServing] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authorizedShopId, setAuthorizedShopId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate("/login?role=billing"); // Not logged in -> Redirect to Billing Login
      } else {
        try {
          let shopIdFound = null;
          const staffSnap = await getDoc(doc(db, "Staff", user.uid));
          
          // If it's a staff, get their Admin's ID. If an Admin logs in directly, use their own UID.
          const adminId = staffSnap.exists() ? staffSnap.data().CreatedBy : user.uid;
          
          if (adminId) {
            const shopQ = query(collection(db, "Shop"), where("Createdby", "==", adminId));
            const shopSnap = await getDocs(shopQ);
            if (!shopSnap.empty) {
              shopIdFound = shopSnap.docs[0].id;
            } else {
              shopIdFound = adminId; // Fallback to Admin ID
            }
          }
          setAuthorizedShopId(shopIdFound);
        } catch (e) {
          console.error("Failed to fetch shop auth:", e);
        }
        setIsAuthChecking(false);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSearch = async () => {
    const trimmed = orderId.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setSearchedOrder(null);
    setNotFound(false);

    if (!authorizedShopId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const snap = await getDocs(
        query(
          collection(db, "Orders"), 
          where("orderId", "==", trimmed),
          where("shopId", "==", authorizedShopId)
        )
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
        paymentStatus: "paid",
      });
      setSearchedOrder({ ...searchedOrder, served: true, paymentStatus: "paid" });
      
      // Open Print Dialog after a short delay to allow UI to update
      setTimeout(() => { window.print(); }, 300);
      
    } catch (e) {
      console.error(e);
    } finally {
      setServing(false);
    }
  };

  const isServed = searchedOrder?.served === true;

  const getFormattedDate = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const getFormattedTime = (ts: any) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border px-6 py-4 flex items-center gap-4 print:hidden">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-heading font-700 text-xl">Billing Counter</h1>
      </header>

      <div className="max-w-lg mx-auto p-6">
        {/* Search */}
        <Card className="p-6 mb-6 print:hidden">
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
          <div className="animate-fade-in space-y-6">
            {/* Receipt Card */}
            <Card className="p-6 max-w-sm mx-auto font-mono text-sm bg-white text-black shadow-lg rounded-none border border-gray-300 print:shadow-none print:border-none print:max-w-full print:p-0">
              <div className="text-center space-y-1 mb-4">
                <div className="truncate overflow-hidden">================================================</div>
                <p className="font-bold text-lg uppercase tracking-wider">{searchedOrder.shopName || "COLLEGE CANTEEN"}</p>
                <div className="truncate overflow-hidden">================================================</div>
              </div>

              <div className="flex justify-between mb-2">
                <span>Date: {getFormattedDate(searchedOrder.createdAt)}</span>
                <span>Time: {getFormattedTime(searchedOrder.createdAt)}</span>
              </div>
              <div className="text-center mb-4">
                Order ID: <span className="font-bold text-base">{searchedOrder.orderId}</span>
              </div>

              <div className="truncate overflow-hidden mb-2">------------------------------------------------</div>
              
              <div className="flex justify-between font-bold mb-2">
                <span className="w-1/2 text-left">Item Name</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Price</span>
              </div>

              <div className="truncate overflow-hidden mb-2">------------------------------------------------</div>

              <div className="space-y-2 mb-2">
                {searchedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="w-1/2 text-left pr-2">{item.name}</span>
                    <span className="w-1/4 text-center">{item.cartQuantity}</span>
                    <span className="w-1/4 text-right">₹{(item.price * item.cartQuantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="truncate overflow-hidden mt-2 mb-4">------------------------------------------------</div>

              <div className="space-y-1 mb-6">
                {searchedOrder.discount > 0 && (
                  <div className="flex justify-between pl-8">
                    <span>Discount:</span>
                    <span>-₹{searchedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pl-8 font-bold text-base">
                  <span>TOTAL:</span>
                  <span>₹{searchedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pl-8">
                  <span>Payment:</span>
                  <span className="capitalize">{searchedOrder.paymentMethod}</span>
                </div>
              </div>

              <div className="text-center space-y-1">
                <div className="truncate overflow-hidden">================================================</div>
                <p>Thank you! Visit again :)</p>
                <div className="truncate overflow-hidden">================================================</div>
              </div>
            </Card>

            {/* Action Button */}
            <div className="max-w-sm mx-auto print:hidden">
              {searchedOrder.paymentMethod === "cash" && !isServed && (
                <div className="bg-warning/20 text-warning-foreground border border-warning/50 rounded-lg p-3 text-center mb-4 font-bold animate-pulse">
                  ⚠️ Collect ₹{searchedOrder.total} cash from customer!
                </div>
              )}
              {!isServed ? (
                <Button
                  className="w-full h-14 text-lg"
                  onClick={handleServed}
                  disabled={serving}
                >
                  {serving
                    ? <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    : <CheckCircle2 className="w-5 h-5 mr-2" />}
                  Mark as Served
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 h-14 text-lg border-accent text-accent bg-accent/5 hover:bg-accent/10" disabled>
                    <CheckCircle2 className="w-5 h-5 mr-2 text-accent" />
                    Served
                  </Button>
                  <Button variant="default" className="flex-1 h-14 text-lg" onClick={() => window.print()}>
                    <Printer className="w-5 h-5 mr-2" />
                    Print Bill
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingPage;