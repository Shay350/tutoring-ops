import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

import { createManagerInvite, MANAGER_INVITE_ROLE } from "./actions";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export default async function InvitesPage() {
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from("invites")
    .select("email, role, used_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-sky-900">Invites</h1>
        <p className="text-sm text-muted-foreground" data-testid="manager-invite-boundary">
          Managers can only create customer invites. Manager and tutor invites are restricted to admin governance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createManagerInvite} className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="parent@tutorops.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                defaultValue={MANAGER_INVITE_ROLE}
                data-testid="manager-invite-role"
              >
                <option value={MANAGER_INVITE_ROLE}>{MANAGER_INVITE_ROLE}</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit">Create invite</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite list</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Used at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites && invites.length > 0 ? (
                invites.map((invite) => {
                  const usedAt = formatTimestamp(invite.used_at);
                  const isUsed = Boolean(invite.used_at);

                  return (
                    <TableRow
                      key={invite.email}
                      className={isUsed ? "text-muted-foreground" : undefined}
                    >
                      <TableCell className="font-medium">
                        {invite.email}
                      </TableCell>
                      <TableCell className="capitalize">{invite.role}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <span>{usedAt}</span>
                        {isUsed ? (
                          <Badge variant="secondary" className="text-xs">
                            Used
                          </Badge>
                        ) : (
                          <Badge className="text-xs" variant="outline">
                            Open
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm">
                    No invites yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
