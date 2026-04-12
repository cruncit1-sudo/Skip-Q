import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ShieldCheck, Receipt, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

type Role = "admin" | "billing";

const roleConfig: Record<Role, {
  label: string;
  icon: React.ReactNode;
  accentHsl: string;
  description: string;
  requiredFirestoreRole: string;
  destination: string;
}> = {
  admin: {
    label: "Admin Panel",
    icon: <ShieldCheck className="w-6 h-6" />,
    accentHsl: "160 65% 45%",
    description: "Manage inventory & staff",
    requiredFirestoreRole: "ADMIN",
    destination: "/admin",
  },
  billing: {
    label: "Billing Counter",
    icon: <Receipt className="w-6 h-6" />,
    accentHsl: "38 90% 52%",
    description: "Verify orders & print bills",
    requiredFirestoreRole: "Bill",
    destination: "/billing",
  },
};

const getFirebaseError = (code: string): string => {
  switch (code) {
    case "auth/invalid-email":          return "Invalid email address.";
    case "auth/user-not-found":         return "No account found with this email.";
    case "auth/wrong-password":         return "Incorrect password. Try again.";
    case "auth/invalid-credential":     return "Incorrect email or password.";
    case "auth/too-many-requests":      return "Too many attempts. Please wait and retry.";
    case "auth/network-request-failed": return "Network error. Check your connection.";
    default:                            return "Login failed. Please try again.";
  }
};

const Login = () => {
  const [searchParams] = useSearchParams();
  const roleParam = (searchParams.get("role") as Role) || null;

  const [selectedRole, setSelectedRole] = useState<Role | null>(roleParam);
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!selectedRole) return;
    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = credential.user.uid;

      const requiredRole = roleConfig[selectedRole].requiredFirestoreRole;
      let firestoreRole: string | null = null;

      const adminDoc = await getDoc(doc(db, "Admin", uid));
      if (adminDoc.exists()) firestoreRole = adminDoc.data()?.Role;

      if (!firestoreRole) {
        const billDoc = await getDoc(doc(db, "Bill", uid));
        if (billDoc.exists()) firestoreRole = billDoc.data()?.Role;
      }

      if (!firestoreRole) {
        const staffDoc = await getDoc(doc(db, "Staff", uid));
        if (staffDoc.exists()) firestoreRole = staffDoc.data()?.Role;
      }

      if (!firestoreRole) {
        await auth.signOut();
        setError("Access denied. Your account is not registered.");
        setLoading(false);
        return;
      }

      if (firestoreRole !== requiredRole) {
        await auth.signOut();
        setError(
          firestoreRole === "Bill"
            ? "This account has Billing access only, not Admin."
            : firestoreRole === "ADMIN"
            ? "This account has Admin access only, not Billing."
            : "Access denied"
        );
        setLoading(false);
        return;
      }

      navigate(roleConfig[selectedRole].destination);
    } catch (err: any) {
      setError(getFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = () => {
    setSelectedRole(null);
    setError("");
    setEmail("");
    setPassword("");
  };

  const config = selectedRole ? roleConfig[selectedRole] : null;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "hsl(258 85% 62%)" }} />

      <Link to="/" className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-heading font-800 mb-1">
            Cruncit <span className="text-gradient">Bites</span>
          </h1>
          <p className="text-muted-foreground text-sm">Sign in to continue</p>
        </div>

        {!selectedRole && (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-muted-foreground mb-4">Choose your role</p>
            {(Object.keys(roleConfig) as Role[]).map((role) => {
              const cfg = roleConfig[role];
              return (
                <button key={role} onClick={() => setSelectedRole(role)}
                  className="w-full group rounded-2xl p-5 border transition-all duration-200 flex items-center gap-4 text-left hover:-translate-y-0.5"
                  style={{
                    background: "hsl(240 22% 10%)",
                    borderColor: "hsl(240 18% 16%)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = `hsl(${cfg.accentHsl} / 0.4)`)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(240 18% 16%)")}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                    style={{
                      background: `hsl(${cfg.accentHsl} / 0.15)`,
                      color: `hsl(${cfg.accentHsl})`,
                    }}>
                    {cfg.icon}
                  </div>
                  <div>
                    <p className="font-heading font-700 text-foreground">{cfg.label}</p>
                    <p className="text-sm text-muted-foreground">{cfg.description}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 ml-auto rotate-180 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        )}

        {selectedRole && config && (
          <div className="rounded-2xl border p-6 space-y-5"
            style={{ background: "hsl(240 22% 10%)", borderColor: "hsl(240 18% 16%)" }}>
            <div className="flex items-center gap-3 pb-4 border-b" style={{ borderColor: "hsl(240 18% 16%)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: `hsl(${config.accentHsl} / 0.15)`,
                  color: `hsl(${config.accentHsl})`,
                }}>
                {config.icon}
              </div>
              <div>
                <p className="font-heading font-700 text-foreground">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
              <button onClick={handleRoleChange}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                Change
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-foreground/80 text-sm">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="mt-1.5 bg-background border-border text-foreground placeholder:text-muted-foreground"
                  autoFocus />
              </div>
              <div>
                <Label htmlFor="password" className="text-foreground/80 text-sm">Password</Label>
                <div className="relative mt-1.5">
                  <Input id="password" type={showPassword ? "text" : "password"}
                    placeholder="Enter your password" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pr-10 bg-background border-border text-foreground placeholder:text-muted-foreground" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg px-3 py-2 text-sm animate-fade-in"
                  style={{ background: "hsl(0 70% 55% / 0.1)", color: "hsl(0 70% 70%)", border: "1px solid hsl(0 70% 55% / 0.2)" }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loading || !email || !password}
                className="w-full h-11 rounded-xl font-medium transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "hsl(258 85% 62%)",
                  color: "white",
                }}>
                {loading ? "Verifying…" : "Sign In →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;