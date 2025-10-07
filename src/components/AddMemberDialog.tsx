import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";

interface AddMemberDialogProps {
  groupId: string;
  onMemberAdded: () => void;
  trigger?: React.ReactNode;
}

export const AddMemberDialog = ({ groupId, onMemberAdded, trigger }: AddMemberDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .limit(50);

    if (error) {
      console.error("Error fetching users:", error);
    } else {
      setUsers(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const selectedUser = users.find(u => u.display_name.toLowerCase() === email.toLowerCase());
      if (!selectedUser) {
        throw new Error("User not found");
      }

      const { error } = await supabase
        .from("group_members")
        .insert({
          group_id: groupId,
          user_id: selectedUser.id
        });

      if (error) throw error;

      toast({
        title: "Member added!",
        description: `${selectedUser.display_name} has been added to the group.`,
      });

      setEmail("");
      setOpen(false);
      onMemberAdded();
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
        {trigger || (
          <Button variant="outline" className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Group Member</DialogTitle>
          <DialogDescription>
            Add a friend to this group to track expenses together
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">User Name or Email</Label>
            <Input
              id="email"
              placeholder="Enter user name"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {users.length > 0 && (
              <div className="text-sm text-muted-foreground">
                Available users: {users.map(u => u.display_name).join(", ")}
              </div>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Member
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
