import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Phone } from "lucide-react";

export default function PhoneLogin({ onLoginSuccess }: { onLoginSuccess?: () => void }) {
  const { setCurrentUser } = useStore();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const formattedNumber = `+91${phoneNumber}`;
      const userRef = doc(db, "users", formattedNumber);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: formattedNumber,
          phoneNumber: formattedNumber,
          role: "USER",
          createdAt: new Date(),
          lastLogin: new Date(),
        });
      } else {
        await setDoc(userRef, { lastLogin: new Date() }, { merge: true });
      }

      setCurrentUser({ phoneNumber: formattedNumber });
      if (onLoginSuccess) onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border p-7 space-y-5"
      style={{ background: "hsl(240 22% 10%)", borderColor: "hsl(240 18% 16%)" }}>
      
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "hsl(258 85% 62% / 0.15)" }}>
          <Phone className="w-5 h-5" style={{ color: "hsl(258 85% 72%)" }} />
        </div>
        <div>
          <h2 className="font-heading font-700 text-lg text-foreground">Login to Order</h2>
          <p className="text-xs text-muted-foreground">Enter your mobile number</p>
        </div>
      </div>

      <div>
        <Label className="text-foreground/80 text-sm">Mobile Number</Label>
        <div className="flex mt-1.5">
          <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 text-sm font-medium"
            style={{
              background: "hsl(240 18% 14%)",
              borderColor: "hsl(240 18% 20%)",
              color: "hsl(240 12% 55%)"
            }}>
            +91
          </span>
          <Input
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
            placeholder="10-digit mobile number"
            className="rounded-l-none bg-background border-border text-foreground placeholder:text-muted-foreground"
            maxLength={10}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            autoFocus
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-3 py-2 text-sm animate-fade-in text-center"
          style={{ background: "hsl(0 70% 55% / 0.1)", color: "hsl(0 70% 70%)", border: "1px solid hsl(0 70% 55% / 0.2)" }}>
          {error}
        </div>
      )}

      <button
        onClick={handleLogin}
        disabled={loading || phoneNumber.length < 10}
        className="w-full h-11 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ background: "hsl(258 85% 62%)", color: "white" }}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? "Please wait…" : "Continue →"}
      </button>
    </div>
  );
}