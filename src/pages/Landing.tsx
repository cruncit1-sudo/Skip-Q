import { Link } from "react-router-dom";
import { UtensilsCrossed, ShieldCheck, Receipt, Sparkles } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: "hsl(258 85% 62%)" }} />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: "hsl(192 80% 55%)" }} />

      {/* Header badge */}
      <div className="animate-fade-in mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium"
          style={{
            borderColor: "hsl(258 85% 62% / 0.3)",
            background: "hsl(258 85% 62% / 0.1)",
            color: "hsl(258 85% 80%)"
          }}>
          <Sparkles className="w-3.5 h-3.5" />
          Smart Canteen Management
        </div>
      </div>

      {/* Hero text */}
      <div className="text-center mb-14 animate-fade-in" style={{ animationDelay: "0.1s" }}>
        <h1 className="text-6xl md:text-7xl font-heading font-800 mb-4 leading-tight">
          Cruncit{" "}
          <span className="text-gradient">Bites</span>
        </h1>
        <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
          Order food, manage inventory & billing — all in one place
        </p>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl w-full animate-fade-in"
        style={{ animationDelay: "0.2s" }}>
        
        {/* <Link to="/user-login" className="group relative overflow-hidden rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1"
          style={{
            background: "hsl(240 22% 10%)",
            borderColor: "hsl(240 18% 16%)",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(258 85% 62% / 0.5)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(240 18% 16%)")}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle at top left, hsl(258 85% 62% / 0.08), transparent 60%)" }} />
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
            style={{ background: "hsl(258 85% 62% / 0.15)" }}>
            <UtensilsCrossed className="w-7 h-7" style={{ color: "hsl(258 85% 72%)" }} />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2 text-foreground">Order Food</h2>
          <p className="text-muted-foreground text-sm">Browse menu & place orders</p>
        </Link> */}

        <Link to="/login?role=admin"  className="group relative overflow-hidden rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1 flex flex-col items-center text-center md:col-start-2"
          style={{
            background: "hsl(240 22% 10%)",
            borderColor: "hsl(240 18% 16%)",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(160 65% 45% / 0.5)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(240 18% 16%)")}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle at top left, hsl(160 65% 45% / 0.08), transparent 60%)" }} />
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
            style={{ background: "hsl(160 65% 45% / 0.15)" }}>
            <ShieldCheck className="w-7 h-7" style={{ color: "hsl(160 65% 60%)" }} />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2 text-foreground">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Manage inventory & staff</p>
        </Link>

        {/* <Link to="/login?role=billing" className="group relative overflow-hidden rounded-2xl p-7 border transition-all duration-300 hover:-translate-y-1"
          style={{
            background: "hsl(240 22% 10%)",
            borderColor: "hsl(240 18% 16%)",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(38 90% 52% / 0.5)")}
          onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(240 18% 16%)")}>
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle at top left, hsl(38 90% 52% / 0.08), transparent 60%)" }} />
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-all duration-300"
            style={{ background: "hsl(38 90% 52% / 0.15)" }}>
            <Receipt className="w-7 h-7" style={{ color: "hsl(38 90% 65%)" }} />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2 text-foreground">Billing</h2>
          <p className="text-muted-foreground text-sm">Verify orders & print bills</p>
        </Link> */}
      </div>

      {/* Footer */}
      <p className="mt-12 text-muted-foreground text-xs animate-fade-in" style={{ animationDelay: "0.3s" }}>
        Cruncit Bites · Canteen Management System
      </p>
    </div>
  );
};

export default Landing;