import { useState, useEffect } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Loader2, CheckCircle2, Printer, Receipt } from "lucide-react";
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
        navigate("/login?role=billing");
      } else {
        try {
          let shopIdFound = null;
          const staffSnap = await getDoc(doc(db, "Staff", user.uid));
          const adminId = staffSnap.exists() ? staffSnap.data().CreatedBy : user.uid;
          if (adminId) {
            const shopQ = query(collection(db, "Shop"), where("Createdby", "==", adminId));
            const shopSnap = await getDocs(shopQ);
            shopIdFound = !shopSnap.empty ? shopSnap.docs[0].id : adminId;
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
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "hsl(258 85% 62%)" }} />
      </div>
    );
  }

  const handleSearch = async () => {
    const trimmed = orderId.trim().toUpperCase();
    if (!trimmed) return;
    setLoading(true);
    setSearchedOrder(null);
    setNotFound(false);
    if (!authorizedShopId) { setNotFound(true); setLoading(false); return; }
    try {
      const snap = await getDocs(query(
        collection(db, "Orders"),
        where("orderId", "==", trimmed),
        where("shopId", "==", authorizedShopId)
      ));
      if (!snap.empty) setSearchedOrder({ id: snap.docs[0].id, ...snap.docs[0].data() });
      else setNotFound(true);
    } catch (e) { console.error(e); setNotFound(true); }
    finally { setLoading(false); }
  };

  const handleServed = async () => {
    if (!searchedOrder) return;
    setServing(true);
    try {
      await updateDoc(doc(db, "Orders", searchedOrder.id), { served: true, paymentStatus: "paid" });
      setSearchedOrder({ ...searchedOrder, served: true, paymentStatus: "paid" });
      setTimeout(() => { window.print(); }, 300);
    } catch (e) { console.error(e); }
    finally { setServing(false); }
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
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center gap-4 print:hidden"
        style={{ background: "hsl(240 22% 10%)", borderColor: "hsl(240 18% 16%)" }}>
        <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5" style={{ color: "hsl(38 90% 62%)" }} />
          <h1 className="font-heading font-700 text-xl text-foreground">Billing Counter</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-6">
        {/* Search */}
        <div className="rounded-2xl border p-6 mb-6 print:hidden"
          style={{ background: "hsl(240 22% 10%)", borderColor: "hsl(240 18% 16%)" }}>
          <h2 className="font-heading font-600 text-lg mb-4 text-foreground">Verify Order</h2>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Order ID (e.g., ORD-ABC123)"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="font-mono bg-background border-border text-foreground placeholder:text-muted-foreground"
            />
            <button onClick={handleSearch} disabled={loading}
              className="px-4 rounded-xl flex items-center justify-center transition-all disabled:opacity-40"
              style={{ background: "hsl(258 85% 62%)", color: "white" }}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {notFound && (
          <div className="rounded-2xl border p-6 text-center animate-fade-in"
            style={{ background: "hsl(0 70% 55% / 0.08)", borderColor: "hsl(0 70% 55% / 0.2)" }}>
            <p className="font-medium" style={{ color: "hsl(0 70% 70%)" }}>
              Order not found. Please check the Order ID.
            </p>
          </div>
        )}

        {searchedOrder && (
          <div className="animate-fade-in space-y-5">
            {/* Receipt — monochrome for printing */}
            <div className="p-6 max-w-sm mx-auto font-mono text-sm bg-white text-black shadow-lg border border-gray-300 print:shadow-none print:border-none print:max-w-full print:p-0">
              <div className="text-center space-y-1 mb-4">
                <div>=============================================</div>
                <p className="font-bold text-lg uppercase tracking-wider">{searchedOrder.shopName || "COLLEGE CANTEEN"}</p>
                <div>=============================================</div>
              </div>
              <div className="flex justify-between mb-2">
                <span>Date: {getFormattedDate(searchedOrder.createdAt)}</span>
                <span>Time: {getFormattedTime(searchedOrder.createdAt)}</span>
              </div>
              <div className="text-center mb-4">
                Order ID: <span className="font-bold">{searchedOrder.orderId}</span>
              </div>
              <div className="mb-2">---------------------------------------------</div>
              <div className="flex justify-between font-bold mb-2">
                <span className="w-1/2 text-left">Item Name</span>
                <span className="w-1/4 text-center">Qty</span>
                <span className="w-1/4 text-right">Price</span>
              </div>
              <div className="mb-2">---------------------------------------------</div>
              <div className="space-y-2 mb-2">
                {searchedOrder.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="w-1/2 text-left pr-2">{item.name}</span>
                    <span className="w-1/4 text-center">{item.cartQuantity}</span>
                    <span className="w-1/4 text-right">Rs.{(item.price * item.cartQuantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 mb-4">---------------------------------------------</div>
              <div className="space-y-1 mb-6">
                {searchedOrder.discount > 0 && (
                  <div className="flex justify-between pl-8">
                    <span>Discount:</span>
                    <span>-Rs.{searchedOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pl-8 font-bold text-base">
                  <span>TOTAL:</span>
                  <span>Rs.{searchedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between pl-8">
                  <span>Payment:</span>
                  <span className="capitalize">{searchedOrder.paymentMethod}</span>
                </div>
              </div>
              <div className="text-center space-y-1">
                <div>=============================================</div>
                <p>Thank you! Visit again :)</p>
                <div>=============================================</div>
              </div>
            </div>

            {/* Action */}
            <div className="max-w-sm mx-auto print:hidden space-y-3">
              {searchedOrder.paymentMethod === "cash" && !isServed && (
                <div className="rounded-xl p-3 text-center font-bold text-sm animate-pulse"
                  style={{
                    background: "hsl(38 90% 52% / 0.12)",
                    color: "hsl(38 90% 65%)",
                    border: "1px solid hsl(38 90% 52% / 0.25)"
                  }}>
                  ⚠️ Collect Rs.{searchedOrder.total} cash from customer!
                </div>
              )}
              {!isServed ? (
                <button onClick={handleServed} disabled={serving}
                  className="w-full h-14 rounded-xl text-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: "hsl(258 85% 62%)", color: "white" }}>
                  {serving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  Mark as Served
                </button>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-medium"
                    style={{ background: "hsl(160 65% 45% / 0.12)", color: "hsl(160 65% 60%)", border: "1px solid hsl(160 65% 45% / 0.25)" }}>
                    <CheckCircle2 className="w-5 h-5" />
                    Served
                  </div>
                  <button onClick={() => window.print()}
                    className="flex-1 h-14 rounded-xl flex items-center justify-center gap-2 font-medium transition-all"
                    style={{ background: "hsl(258 85% 62%)", color: "white" }}>
                    <Printer className="w-5 h-5" />
                    Print Bill
                  </button>
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