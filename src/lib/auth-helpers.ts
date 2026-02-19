import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import type { UserRole } from "@/types";

/**
 * Get the current session, or redirect to login if not authenticated.
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  return session;
}

/**
 * Require a specific role, or redirect.
 */
export async function requireRole(role: UserRole) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    redirect(role === "super_admin" ? "/school" : "/admin");
  }
  return session;
}

/**
 * Require super_admin role.
 */
export async function requireSuperAdmin() {
  return requireRole("super_admin");
}

/**
 * Require school_admin role.
 */
export async function requireSchoolAdmin() {
  return requireRole("school_admin");
}
