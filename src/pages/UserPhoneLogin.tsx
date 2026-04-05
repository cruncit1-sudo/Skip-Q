import PhoneLogin from "@/components/PhoneLogin";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function UserPhoneLogin() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link
        to="/"
        className="absolute top-6 left-6 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-heading font-800 text-foreground mb-1">
            Campus <span className="text-primary">Bites</span>
          </h1>
          <p className="text-muted-foreground text-sm">Verify your number to order food</p>
        </div>
        
        {/* Navigate to User Home/Menu page after successful login */}
        <PhoneLogin onLoginSuccess={() => navigate("/user")} />
      </div>
    </div>
  );
}