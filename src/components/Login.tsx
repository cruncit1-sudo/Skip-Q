import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
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
  color: string;
  description: string;
  requiredFirestoreRole: string;
  destination: string;
}> = {
  admin: {
    label: "Admin Panel",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-accent",
    description: "Manage inventory & staff",
    requiredFirestoreRole: "ADMIN",
    destination: "/admin",
  },
  billing: {
    label: "Billing Counter",
    icon: <Receipt className="w-6 h-6" />,
    color: "text-warning",
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
      // Step 1: Firebase Auth login
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = credential.user.uid;

      // Step 2: Check role — Staff by uid, Bill by Email query
      const requiredRole = roleConfig[selectedRole].requiredFirestoreRole;
      let firestoreRole: string | null = null;

      // Check Staff collection by uid
      const staffDoc = await getDoc(doc(db, "Staff", uid));
      if (staffDoc.exists()) {
        firestoreRole = staffDoc.data()?.Role;
      } else {
        // Check Bill collection by Email field (document id may differ from uid)
        const billQuery = await getDocs(
          query(collection(db, "Bill"), where("Email", "==", email.trim()))
        );
        if (!billQuery.empty) {
          firestoreRole = billQuery.docs[0].data()?.Role;
        }
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
            : `Access denied. Required role: ${requiredRole}.`
        );
        setLoading(false);
        return;
      }

      // Step 3: Role matched — navigate
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link to="/" className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-800 text-foreground mb-1">
            Campus <span className="text-primary">Bites</span>
          </h1>
          <p className="text-muted-foreground text-sm">Sign in to continue</p>
        </div>

        {/* Role selector */}
        {!selectedRole && (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-muted-foreground mb-4">Choose your role</p>
            {(Object.keys(roleConfig) as Role[]).map((role) => {
              const cfg = roleConfig[role];
              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className="w-full group bg-card rounded-2xl p-5 border border-border hover:border-primary hover:shadow-md transition-all duration-200 flex items-center gap-4 text-left"
                >
                  <div className={`w-12 h-12 rounded-xl bg-secondary flex items-center justify-center ${cfg.color} group-hover:bg-primary group-hover:text-primary-foreground transition-colors`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <p className="font-heading font-700 text-card-foreground">{cfg.label}</p>
                    <p className="text-sm text-muted-foreground">{cfg.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Login form */}
        {selectedRole && config && (
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-border">
              <div className={`w-10 h-10 rounded-xl bg-secondary flex items-center justify-center ${config.color}`}>
                {config.icon}
              </div>
              <div>
                <p className="font-heading font-700">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
              <button onClick={handleRoleChange} className="ml-auto text-xs text-muted-foreground hover:text-foreground underline">
                Change
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="mt-1"
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && <p className="text-destructive text-sm animate-fade-in">{error}</p>}

              <Button
                className="w-full h-11"
                onClick={handleLogin}
                disabled={loading || !email || !password}
              >
                {loading ? "Verifying…" : "Sign In →"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Login;