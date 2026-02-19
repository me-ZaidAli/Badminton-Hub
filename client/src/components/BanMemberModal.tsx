import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Ban, Loader2 } from "lucide-react";

interface BanMemberModalProps {
  open: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
  clubId: number;
  clubName: string;
}

const DEFAULT_BAN_TEMPLATE = `Dear {name},

After careful review, we regret to inform you that your membership at {club} has been revoked effective immediately.

Reason: {reason}

This decision was made by the club administration. If you wish to appeal or discuss this matter, you may respond to this ticket.

Regards,
{club} Administration`;

export function BanMemberModal({ open, onClose, userId, userName, clubId, clubName }: BanMemberModalProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
      setMessage(
        DEFAULT_BAN_TEMPLATE
          .replace(/{name}/g, userName)
          .replace(/{club}/g, clubName)
          .replace(/{reason}/g, "[Enter reason here]")
      );
    }
  }, [open, userName, clubName]);

  useEffect(() => {
    if (reason && open) {
      setMessage(prev =>
        prev.replace(/Reason: .*/g, `Reason: ${reason}`)
      );
    }
  }, [reason, open]);

  const banMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ban-member", {
        userId,
        clubId,
        reason,
        message,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      toast({ title: "Member banned", description: `${userName} has been banned and a ticket has been created.` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/club-players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tickets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/super-admin/players-comprehensive"] });
      onClose();
    },
    onError: (err: any) => {
      toast({ title: "Ban failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", description: "Please provide a reason for the ban.", variant: "destructive" });
      return;
    }
    banMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive" data-testid="text-ban-modal-title">
            <Ban className="w-5 h-5" />
            Ban Member
          </DialogTitle>
          <DialogDescription>
            This action will immediately revoke access for this member and create a confidential ticket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-destructive/10 border border-destructive/30 rounded-md p-4">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">You are about to ban:</p>
              <p className="text-sm" data-testid="text-ban-member-name">{userName}</p>
              <p className="text-xs text-muted-foreground">Club: {clubName}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ban-reason">Reason for ban *</Label>
            <Input
              id="ban-reason"
              placeholder="e.g., Repeated code of conduct violations..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="input-ban-reason"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ban-message">Notification message to member</Label>
            <p className="text-xs text-muted-foreground">This message will be sent as a notification and included in the ban ticket.</p>
            <Textarea
              id="ban-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={10}
              className="text-sm"
              data-testid="textarea-ban-message"
            />
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>What happens when you ban a member:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Access is revoked immediately</li>
              <li>A confidential ticket is created for record-keeping</li>
              <li>All admins are notified</li>
              <li>The banned member can view and respond to their ban ticket only</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={banMutation.isPending} data-testid="button-ban-cancel">
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={banMutation.isPending || !reason.trim()}
            data-testid="button-ban-confirm"
          >
            {banMutation.isPending ? (
              <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Banning...</>
            ) : (
              <><Ban className="w-4 h-4 mr-1" /> Confirm Ban</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
