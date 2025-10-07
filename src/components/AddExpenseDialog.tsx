import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, PlusCircle } from "lucide-react";

interface Group {
  id: string;
  name: string;
}

interface GroupMember {
  user_id: string;
  profiles: {
    display_name: string;
  };
}

interface AddExpenseDialogProps {
  onExpenseAdded: () => void;
}

export const AddExpenseDialog = ({ onExpenseAdded }: AddExpenseDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedGroup, setSelectedGroup] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    const { data, error } = await supabase
      .from("groups")
      .select("id, name")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching groups:", error);
    } else {
      setGroups(data || []);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    const { data, error } = await supabase
      .from("group_members")
      .select("user_id, profiles(display_name)")
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching members:", error);
    } else {
      setMembers(data || []);
      setSelectedMembers(data?.map(m => m.user_id) || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert({
          group_id: selectedGroup,
          description,
          amount: parseFloat(amount),
          paid_by: user.id,
          category
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      const shareAmount = parseFloat(amount) / selectedMembers.length;
      const splits = selectedMembers.map(userId => ({
        expense_id: expense.id,
        user_id: userId,
        share_amount: shareAmount
      }));

      const { error: splitsError } = await supabase
        .from("expense_splits")
        .insert(splits);

      if (splitsError) throw splitsError;

      toast({
        title: "Expense added!",
        description: "Your expense has been recorded successfully.",
      });

      setDescription("");
      setAmount("");
      setCategory("");
      setSelectedGroup("");
      setSelectedMembers([]);
      setOpen(false);
      onExpenseAdded();
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full" variant="outline">
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
          <DialogDescription>
            Record a shared expense and split it among group members
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="group">Group</Label>
            <Select value={selectedGroup} onValueChange={setSelectedGroup} required>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="e.g., Dinner at restaurant"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              placeholder="e.g., Food, Transport"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </div>
          {selectedGroup && (
            <div className="space-y-2">
              <Label>Split Between</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.user_id} className="flex items-center space-x-2">
                    <Checkbox
                      id={member.user_id}
                      checked={selectedMembers.includes(member.user_id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers([...selectedMembers, member.user_id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(id => id !== member.user_id));
                        }
                      }}
                    />
                    <label
                      htmlFor={member.user_id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {member.profiles?.display_name || "Unknown"}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading || !selectedGroup || selectedMembers.length === 0}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Expense
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
