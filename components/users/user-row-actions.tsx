"use client";

import { changeUserRoleAction, setUserStatusAction } from "@/app/actions/users";
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
}: {
  user: Profile;
  currentUserId: string;
  currentRole: Role;
}) {
  const router = useRouter();
  const isSelf = user.id === currentUserId;
  const roles = ROLES.filter((role) => role !== "owner" || currentRole === "owner");

  return (
    <div className="flex justify-end gap-2">
      <Select
        defaultValue={user.role}
        disabled={isSelf}
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
      {!isSelf && user.role !== "owner" ? (
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
    </div>
  );
}
