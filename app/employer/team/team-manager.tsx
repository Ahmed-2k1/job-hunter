"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Stamp } from "@/components/ui/stamp";
import { UserPlus, X } from "lucide-react";
import {
  inviteMemberAction,
  removeMemberAction,
  type TeamData,
} from "../actions";

export function TeamManager({ data }: { data: TeamData }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("org:member");
  const [inviting, setInviting] = useState(false);

  const atCap = data.seatLimit !== null && data.usedSeats >= data.seatLimit;

  async function handleInvite() {
    if (!email.trim()) return;
    setInviting(true);
    try {
      const result = await inviteMemberAction(email.trim(), role);
      if (result.ok) {
        toast.success(`Invitation sent to ${email.trim()}`);
        setEmail("");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Could not send the invitation. Please try again.");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(userId: string, name: string) {
    try {
      await removeMemberAction(data.orgId, userId);
      toast.success(`${name} removed from the team`);
      router.refresh();
    } catch {
      toast.error("Could not remove this member.");
    }
  }

  return (
    <div className="space-y-6">
      {data.isAdmin && (
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold mb-3">Invite a teammate</h2>
          {atCap ? (
            <p className="text-sm text-muted-foreground">
              You&apos;ve used all {data.seatLimit} seats on the {data.plan} plan.{" "}
              <a href="/employer/billing" className="underline font-medium text-primary">
                Upgrade
              </a>{" "}
              to add more.
            </p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={role} onChange={(e) => setRole(e.target.value)} className="sm:w-40">
                <option value="org:member">Member</option>
                <option value="org:admin">Admin</option>
              </Select>
              <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
                <UserPlus className="h-4 w-4 mr-2" />
                {inviting ? "Sending..." : "Invite"}
              </Button>
            </div>
          )}
        </Card>
      )}

      <div className="space-y-2">
        {data.members.map((m) => (
          <Card key={m.membershipUserId} className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-semibold text-primary">
              {m.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{m.name}</p>
              <p className="text-sm text-muted-foreground truncate">{m.email}</p>
            </div>
            <Stamp variant={m.role === "org:admin" ? "pro" : "free"}>
              {m.role === "org:admin" ? "Admin" : "Member"}
            </Stamp>
            {data.isAdmin && m.membershipUserId !== data.currentUserId && (
              <Button
                variant="ghost"
                size="icon"
                title="Remove member"
                onClick={() => handleRemove(m.membershipUserId, m.name)}
              >
                <X className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
