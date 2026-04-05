import { Link } from "react-router-dom";
import { UtensilsCrossed, ShieldCheck, Receipt } from "lucide-react";

const Landing = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl md:text-6xl font-heading font-800 text-foreground mb-3">
          Campus <span className="text-primary">Bites</span>
        </h1>
        <p className="text-muted-foreground text-lg">Canteen Management System</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <Link
          to="/user"
          className="group bg-card rounded-2xl p-8 shadow-sm border border-border hover:border-primary hover:shadow-lg transition-all duration-300 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <UtensilsCrossed className="w-8 h-8" />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2 text-card-foreground">Order Food</h2>
          <p className="text-muted-foreground text-sm">Browse menu & place orders</p>
        </Link>

        <Link
          to="/admin"
          className="group bg-card rounded-2xl p-8 shadow-sm border border-border hover:border-primary hover:shadow-lg transition-all duration-300 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2 text-card-foreground">Admin Panel</h2>
          <p className="text-muted-foreground text-sm">Manage inventory & staff</p>
        </Link>

        <Link
          to="/billing"
          className="group bg-card rounded-2xl p-8 shadow-sm border border-border hover:border-primary hover:shadow-lg transition-all duration-300 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
            <Receipt className="w-8 h-8" />
          </div>
          <h2 className="font-heading font-700 text-xl mb-2 text-card-foreground">Billing</h2>
          <p className="text-muted-foreground text-sm">Verify orders & print bills</p>
        </Link>
      </div>
    </div>
  );
};

export default Landing;
