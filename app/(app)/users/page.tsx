import { InviteForm } from "@/components/users/invite-form";
import { UserRowActions } from "@/components/users/user-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { listUsers } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function UsersPage() {
  const { session, allowed } = await requirePageAccess("users.read");
  if (!allowed) return <Forbidden />;
  const users = await listUsers(session.businessId);
  const canWrite = can(session.role, "users.write");

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Invite staff and control roles. Public sign-up is disabled." />
      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Invite a staff member</CardTitle>
          </CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <Table>
          <THead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Role</Th>
              <Th>Status</Th>
              <Th>Last login</Th>
              {canWrite ? <Th></Th> : null}
            </tr>
          </THead>
          <TBody>
            {users.map((user) => (
              <tr key={user.id}>
                <Td className="font-medium">{user.full_name || "—"}</Td>
                <Td>{user.email}</Td>
                <Td>{ROLE_LABELS[user.role]}</Td>
                <Td>
                  <Badge variant={statusVariant(user.status)}>{humanizeStatus(user.status)}</Badge>
                </Td>
                <Td>{formatDateTime(user.last_login_at)}</Td>
                {canWrite ? (
                  <Td className="text-right">
                    <UserRowActions user={user} currentUserId={session.userId} currentRole={session.role} />
                  </Td>
                ) : null}
              </tr>
            ))}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
