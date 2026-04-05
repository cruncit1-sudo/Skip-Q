import { useState } from "react";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

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

      // Save to store so UserHome can use it
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
    <Card className="p-6 w-full max-w-sm mx-auto space-y-4 shadow-md">
      <h2 className="text-xl font-heading font-700 text-center">Login to Order Food</h2>
      <div className="space-y-4">
        <div>
          <Label>Mobile Number</Label>
          <div className="flex mt-1">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
              +91
            </span>
            <Input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit mobile number"
              className="rounded-l-none"
              maxLength={10}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoFocus
            />
          </div>
        </div>
        {error && <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>}
        <Button className="w-full" onClick={handleLogin} disabled={loading || phoneNumber.length < 10}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Continue →
        </Button>
      </div>
    </Card>
  );
}