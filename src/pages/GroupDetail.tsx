import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, ArrowLeft, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { AddExpenseDialog } from "@/components/AddExpenseDialog";
import { AddMemberDialog } from "@/components/AddMemberDialog";
import { SettleUpDialog } from "@/components/SettleUpDialog";

interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  profiles: {
    display_name: string;
  };
  expense_splits: {
    user_id: string;
    share_amount: number;
  }[];
}

interface Balance {
  userId: string;
  userName: string;
  balance: number;
}

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    checkAuth();
    fetchGroupData();
  }, [id]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    } else {
      setCurrentUserId(session.user.id);
    }
  };

  const fetchGroupData = async () => {
    try {
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select("name")
        .eq("id", id)
        .single();

      if (groupError) throw groupError;
      setGroupName(group.name);

      const { data: expensesData, error: expensesError } = await supabase
        .from("expenses")
        .select(`
          id,
          description,
          amount,
          date,
          category,
          profiles(display_name),
          expense_splits(user_id, share_amount)
        `)
        .eq("group_id", id)
        .order("date", { ascending: false });

      if (expensesError) throw expensesError;
      setExpenses(expensesData || []);

      calculateBalances(expensesData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateBalances = async (expensesData: Expense[]) => {
    const balanceMap = new Map<string, { balance: number; name: string }>();

    for (const expense of expensesData) {
      const paidBy = expense.profiles?.display_name || "Unknown";
      
      for (const split of expense.expense_splits || []) {
        const current = balanceMap.get(split.user_id) || { balance: 0, name: "" };
        
        if (!current.name) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", split.user_id)
            .single();
          current.name = profile?.display_name || "Unknown";
        }

        current.balance -= split.share_amount;
        balanceMap.set(split.user_id, current);
      }
    }

    const balancesArray = Array.from(balanceMap.entries()).map(([userId, data]) => ({
      userId,
      userName: data.name,
      balance: data.balance
    }));

    setBalances(balancesArray);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/groups")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Groups
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{groupName}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Balances</CardTitle>
              <CardDescription>Current balance for each member</CardDescription>
            </CardHeader>
            <CardContent>
            {balances.length > 0 ? (
                <div className="space-y-3">
                  {balances.map((balance) => (
                    <div key={balance.userId} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-2">
                        <span className={balance.userId === currentUserId ? "font-semibold" : ""}>
                          {balance.userName} {balance.userId === currentUserId && "(You)"}
                        </span>
                        {balance.balance < 0 && (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        {balance.balance > 0 && (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={balance.balance > 0 ? "text-green-600 font-semibold" : balance.balance < 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                          ${Math.abs(balance.balance).toFixed(2)} {balance.balance > 0 ? "owed to you" : balance.balance < 0 ? "you owe" : "settled"}
                        </span>
                        {balance.balance < 0 && balance.userId !== currentUserId && id && (
                          <SettleUpDialog
                            toUserId={balance.userId}
                            toUserName={balance.userName}
                            amount={Math.abs(balance.balance)}
                            groupId={id}
                            onSettled={fetchGroupData}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No expenses yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AddExpenseDialog onExpenseAdded={fetchGroupData} />
              {id && <AddMemberDialog groupId={id} onMemberAdded={fetchGroupData} />}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Recent Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {expenses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Paid By</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">{expense.description}</TableCell>
                      <TableCell>{expense.profiles?.display_name || "Unknown"}</TableCell>
                      <TableCell>{expense.category || "-"}</TableCell>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">${expense.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                <p className="text-muted-foreground">Add your first expense to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GroupDetail;
