import PhoneLogin from "@/components/PhoneLogin";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function UserPhoneLogin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "hsl(258 85% 62%)" }} />

      <Link to="/" className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-5 h-5" />
      </Link>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-800 text-foreground mb-1">
            Cruncit <span className="text-gradient">Bites</span>
          </h1>
          <p className="text-muted-foreground text-sm">Verify your number to order food</p>
        </div>

        <PhoneLogin onLoginSuccess={() => navigate("/user")} />
      </div>
    </div>
  );
}