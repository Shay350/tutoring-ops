import { inviteRoles } from "@/app/admin/actions";
import { AdminInviteForm } from "@/app/admin/governance-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";

function formatTimestamp(value: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export default async function AdminInvitesPage() {
  const supabase = await createClient();
  const { data: invites } = await supabase
    .from("invites")
    .select("email, role, used_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6" data-testid="admin-invites-page">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Admin invites</h1>
        <p className="text-sm text-muted-foreground">Create invites for any supported role.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create invite</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminInviteForm roles={inviteRoles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invite history</CardTitle>
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
                  const isUsed = Boolean(invite.used_at);

                  return (
                    <TableRow key={invite.email} data-testid={`admin-invite-row-${invite.email}`}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell className="capitalize">{invite.role}</TableCell>
                      <TableCell className="flex items-center gap-2">
                        <span>{formatTimestamp(invite.used_at)}</span>
                        {isUsed ? (
                          <Badge variant="secondary" className="text-xs">Used</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Open</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-sm">No invites yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
