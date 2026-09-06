import { InviteForm } from "@/components/users/invite-form";
import { UserRowActions } from "@/components/users/user-row-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Forbidden } from "@/components/ui/forbidden";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, Td, Th, THead } from "@/components/ui/table";
import { can } from "@/lib/permissions";
import { getBusiness, listUsers } from "@/lib/queries";
import { requirePageAccess } from "@/lib/session";
import { humanizeStatus, statusVariant } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";

export default async function UsersPage() {
  const { session, allowed } = await requirePageAccess("users.read");
  if (!allowed) return <Forbidden />;
  const [users, business] = await Promise.all([listUsers(session.businessId), getBusiness(session.businessId)]);
  const canWrite = can(session.role, "users.write");

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Add staff to this company and control roles. Public sign-up is disabled." />
      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle>Add a staff member</CardTitle>
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
                  {user.business_id ? (
                    <Badge variant={statusVariant(user.status)}>{humanizeStatus(user.status)}</Badge>
                  ) : (
                    <Badge variant="warning">Not joined</Badge>
                  )}
                </Td>
                <Td>{formatDateTime(user.last_login_at)}</Td>
                {canWrite ? (
                  <Td className="text-right">
                    <UserRowActions
                      user={user}
                      currentUserId={session.userId}
                      currentRole={session.role}
                      isCompanyOwner={business?.owner_id === user.id}
                    />
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
