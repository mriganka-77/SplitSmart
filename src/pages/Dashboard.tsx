import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import AddMoneyDialog from "@/components/AddMoneyDialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Wallet, PlusCircle, LogOut, Receipt, DollarSign } from "lucide-react";
import WalletCard from "@/components/WalletCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [totalBalance, setTotalBalance] = useState(0);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState(0);
  const [recentExpenses, setRecentExpenses] = useState<any[]>([]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      } else {
        fetchProfile(session.user.id);
        fetchDashboardData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchDashboardData = async (userId: string) => {
    try {
      const { data: groups } = await supabase
        .from("groups")
        .select("id")
        .or(`created_by.eq.${userId}`);
      
      setGroupCount(groups?.length || 0);

      const { data: expenses } = await supabase
        .from("expenses")
        .select(`
          id,
          description,
          amount,
          date,
          profiles(display_name)
        `)
        .order("date", { ascending: false })
        .limit(5);

      setRecentExpenses(expenses || []);

      const { data: settlements } = await supabase
        .from("settlements")
        .select("amount, from_user_id, to_user_id")
        .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);

      let balance = 0;
      settlements?.forEach(s => {
        if (s.from_user_id === userId) {
          balance -= s.amount;
        } else {
          balance += s.amount;
        }
      });
      setTotalBalance(balance);

      // Fetch wallet balance if available (use any-typed supabase to query new table)
      try {
        const sb: any = supabase as any;
        const { data: wallet } = await sb.from("wallets").select("balance").eq("user_id", userId).single();
        setWalletBalance(wallet?.balance ?? null);
      } catch (e) {
        setWalletBalance(null);
      }
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out",
        description: "You have been successfully signed out.",
      });
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-primary/10 to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-lg shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">SplitSmart</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-medium">
              {profile?.display_name || user?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Welcome back!</h2>
          <p className="text-muted-foreground text-lg">
            Manage your expenses and settle up with friends
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-primary/5" onClick={() => navigate("/groups")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <span>Groups</span>
              </CardTitle>
              <CardDescription>Create and manage expense groups</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full shadow-md hover:shadow-lg transition-shadow" variant="default">
                <PlusCircle className="h-4 w-4 mr-2" />
                View Groups
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-secondary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PlusCircle className="h-5 w-5 text-primary" />
                </div>
                <span>Add Expense</span>
              </CardTitle>
              <CardDescription>Record a new shared expense</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full shadow-md hover:shadow-lg transition-shadow" variant="default" onClick={() => navigate("/groups")}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Expense
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary/20 bg-gradient-to-br from-card to-accent/30" onClick={() => navigate("/settlements")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <span>Balance</span>
              </CardTitle>
              <CardDescription>Your current balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${totalBalance > 0 ? "text-green-600" : totalBalance < 0 ? "text-red-600" : "text-primary"}`}>
                    ${Math.abs(totalBalance).toFixed(2)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 font-medium">
                    {totalBalance > 0 ? "You are owed" : totalBalance < 0 ? "You owe" : "All settled up!"}
                  </p>
                </div>

                <div className="ml-6 text-right">
                  <div className="text-sm text-muted-foreground">Wallet</div>
                  <div className="font-semibold text-lg">{walletBalance !== null ? `₹${Number(walletBalance).toFixed(2)}` : "—"}</div>
                  <div className="mt-2">
                    <AddMoneyDialog onAdded={() => fetchDashboardData(user?.id || "")} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-2 hover:border-primary/20 transition-colors shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <span>Recent Expenses</span>
              </CardTitle>
              <CardDescription>Your latest transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {recentExpenses.length > 0 ? (
                <div className="space-y-3">
                  {recentExpenses.map((expense) => (
                    <div key={expense.id} className="flex justify-between items-center p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent hover:from-primary/10 transition-colors">
                      <div>
                        <p className="font-semibold">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.profiles?.display_name} • {new Date(expense.date).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="font-bold text-lg text-primary">${expense.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="p-4 bg-primary/5 rounded-full w-fit mx-auto mb-3">
                    <Receipt className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">No expenses yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary/20 transition-colors shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <span>Quick Stats</span>
              </CardTitle>
              <CardDescription>Your activity summary</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <span className="text-sm font-medium">Total Groups</span>
                <span className="font-bold text-2xl text-primary">{groupCount}</span>
              </div>
              <div className="flex justify-between items-center p-4 rounded-lg bg-gradient-to-r from-secondary/10 to-secondary/5 border border-secondary/20">
                <span className="text-sm font-medium">Recent Expenses</span>
                <span className="font-bold text-2xl text-primary">{recentExpenses.length}</span>
              </div>
              <Button className="w-full shadow-md hover:shadow-lg transition-shadow" onClick={() => navigate("/groups")}>
                <Users className="h-4 w-4 mr-2" />
                View All Groups
              </Button>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-1">
          <WalletCard />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/80 backdrop-blur-lg mt-auto">
        <div className="container mx-auto px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground">
            Developed by <span className="font-semibold text-primary">Mriganka Chakraborty</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;