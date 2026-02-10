import { storage } from "./storage";

export type RBACAction =
  | "VIEW_CLUB"
  | "MANAGE_CLUB"
  | "MANAGE_SESSIONS"
  | "EDIT_SESSIONS"
  | "VIEW_MEMBERS"
  | "MANAGE_MEMBERS"
  | "MANAGE_TOURNAMENTS"
  | "VIEW_ADMIN_PANEL"
  | "MANAGE_VENUES"
  | "MANAGE_CREDITS"
  | "MANAGE_MEMBERSHIPS"
  | "MANAGE_INVENTORY";

interface RBACUser {
  id: number;
  role: string;
}

export async function canPerform(user: RBACUser, action: RBACAction, clubId?: number): Promise<boolean> {
  if (user.role === "OWNER") {
    return true;
  }

  if (!clubId) {
    if (action === "VIEW_ADMIN_PANEL") {
      return user.role === "ADMIN";
    }
    return false;
  }

  const profiles = await storage.getUserPlayerProfiles(user.id);
  const clubProfile = profiles.find(p => p.clubId === clubId);
  const isApproved = clubProfile?.membershipStatus === "APPROVED";
  const clubRole = clubProfile?.clubRole;

  const club = await storage.getClub(clubId);
  const isClubOwner = club?.ownerId === user.id;

  if (isClubOwner) return true;

  if (!isApproved || !clubRole) return false;

  switch (action) {
    case "VIEW_CLUB":
      return true;

    case "MANAGE_CLUB":
    case "VIEW_MEMBERS":
    case "MANAGE_MEMBERS":
    case "MANAGE_VENUES":
      return ["OWNER", "ADMIN"].includes(clubRole);

    case "MANAGE_SESSIONS":
      return ["OWNER", "ADMIN", "ORGANISER", "COACH"].includes(clubRole);

    case "MANAGE_CREDITS":
    case "MANAGE_MEMBERSHIPS":
    case "MANAGE_INVENTORY":
      return ["OWNER", "ADMIN"].includes(clubRole);

    case "EDIT_SESSIONS":
      return ["OWNER", "ADMIN"].includes(clubRole);

    case "MANAGE_TOURNAMENTS":
      return ["OWNER", "ADMIN", "ORGANISER"].includes(clubRole);

    case "VIEW_ADMIN_PANEL":
      return ["OWNER", "ADMIN"].includes(clubRole);

    default:
      return false;
  }
}

export function isSuperAdmin(user: RBACUser): boolean {
  return user.role === "OWNER";
}

export function log_rbac(action: string, userId: number, result: boolean, details?: Record<string, unknown>): void {
  const status = result ? "GRANTED" : "DENIED";
  const extra = details ? ` ${JSON.stringify(details)}` : "";
  console.log(`[RBAC] ${status} | action=${action} userId=${userId}${extra}`);
}
