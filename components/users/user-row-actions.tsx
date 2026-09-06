"use client";

import { changeUserRoleAction, deleteUserAction, setUserStatusAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ROLE_LABELS, ROLES } from "@/lib/permissions";
import type { Profile, Role } from "@/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function UserRowActions({
  user,
  currentUserId,
  currentRole,
  isCompanyOwner,
}: {
  user: Profile;
  currentUserId: string;
  currentRole: Role;
  isCompanyOwner: boolean;
}) {
  const router = useRouter();
  const isSelf = user.id === currentUserId;
  const leftover = !user.business_id;
  const canManageRole = !isSelf && !leftover;
  const canDisable = !isSelf && !leftover && user.role !== "owner";
  const canDelete = !isSelf && !isCompanyOwner;
  const roles = ROLES.filter((role) => role !== "owner" || currentRole === "owner");

  return (
    <div className="flex justify-end gap-2">
      {canManageRole ? (
        <Select
          defaultValue={user.role}
          onChange={async (event) => {
            const result = await changeUserRoleAction(user.id, event.target.value as Role);
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("Role updated");
              router.refresh();
            }
          }}
        >
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      ) : null}
      {canDisable ? (
        <Button
          size="sm"
          variant={user.status === "disabled" ? "secondary" : "danger"}
          onClick={async () => {
            const next = user.status === "disabled" ? "active" : "disabled";
            const result = await setUserStatusAction(user.id, next);
            if (!result.ok) toast.error(result.error);
            else {
              toast.success(next === "disabled" ? "User disabled" : "User enabled");
              router.refresh();
            }
          }}
        >
          {user.status === "disabled" ? "Enable" : "Disable"}
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          size="sm"
          variant="danger"
          onClick={async () => {
            const confirmed = window.confirm(
              leftover
                ? `Remove ${user.email}? This leftover login is not on the company and will be deleted.`
                : `Remove ${user.email}? They will no longer be able to sign in.`,
            );
            if (!confirmed) return;
            const result = await deleteUserAction(user.id);
            if (!result.ok) toast.error(result.error);
            else {
              toast.success("User removed");
              router.refresh();
            }
          }}
        >
          Remove
        </Button>
      ) : null}
    </div>
  );
}
