import type { AuthWorkspace } from "../lib/auth/current-user.ts";

export function WorkspaceSwitcher({ workspace }: { workspace: AuthWorkspace }) {
  return (
    <div className="workspace-identity" aria-label="Current workspace">
      <span>Workspace</span>
      <strong>{workspace.name}</strong>
      <small>{workspace.role.toLowerCase()}</small>
    </div>
  );
}
