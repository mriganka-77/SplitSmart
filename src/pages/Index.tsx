// Update this page (the content is just a fallback if you fail to update the page)

import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Wallet, Users, TrendingUp, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full">
            <Wallet className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            SplitSmart
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Simplify shared expenses with friends, family, and colleagues. 
            Track, split, and settle payments effortlessly.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Group Management</h3>
            <p className="text-muted-foreground">
              Create groups for trips, roommates, or any shared expenses. Add friends easily.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Calculations</h3>
            <p className="text-muted-foreground">
              Automatic split calculations, balance tracking, and settlement suggestions.
            </p>
          </div>

          <div className="text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Payments</h3>
            <p className="text-muted-foreground">
              Integrated payment options for quick settlements. Your data is always protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
