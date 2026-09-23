import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getMyRoles } from "@/lib/authority.functions";

export type StaffMember = {
  userId: string;
  email: string;
  role: string;
  createdAt: string | null;
};

export type MyProfile = {
  userId: string;
  email: string | null;
  roles: string[];
};

async function requireAdmin(supabase: Parameters<typeof getMyRoles>[0], userId: string) {
  const roles = await getMyRoles(supabase, userId);
  if (!roles.includes("admin")) throw new Error("Forbidden — administrator access required.");
}

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyProfile> => {
    const roles = await getMyRoles(context.supabase, context.userId);
    const { data } = await context.supabase.auth.getUser();
    return { userId: context.userId, email: data.user?.email ?? null, roles };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffMember[]> => {
    await requireAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: roleRows, error }, { data: users }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role, created_at"),
      supabaseAdmin.auth.admin.listUsers({ perPage: 200 }),
    ]);

    if (error) throw new Error("Staff could not be loaded right now. Please try again.");

    const emails = new Map(
      (users?.users ?? []).map((user) => [user.id, user.email ?? "unknown account"]),
    );

    return (roleRows ?? [])
      .map((row) => ({
        userId: row.user_id,
        email: emails.get(row.user_id) ?? "unknown account",
        role: row.role,
        createdAt: row.created_at ?? null,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  });

const createOfficerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(12, "Use at least 12 characters for the initial password."),
});

export const createOfficer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createOfficerSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { display_name: "Duty Officer" },
    });

    if (error || !created.user) {
      const message = error?.message ?? "";
      if (message.toLowerCase().includes("already")) {
        throw new Error("An account with that email already exists.");
      }
      throw new Error("The officer account could not be created. Please try again.");
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: created.user.id, role: "authority" });

    if (roleError) {
      // Do not leave an account behind without its staff role.
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("The officer account could not be given a staff role. Please try again.");
    }

    return { email: data.email };
  });

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(12, "Use at least 12 characters for the new password."),
});

export const resetOfficerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });

    if (error) throw new Error("The password could not be reset. Please try again.");
    return { ok: true };
  });

const removeOfficerSchema = z.object({ userId: z.string().uuid() });

export const removeOfficer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeOfficerSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) {
      throw new Error("You cannot remove your own access while signed in.");
    }
    await requireAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: targetRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId);

    const targetIsAdmin = (targetRoles ?? []).some((row) => row.role === "admin");
    if (targetIsAdmin) {
      const { data: admins } = await supabaseAdmin
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      if ((admins ?? []).length <= 1) {
        throw new Error("There must be at least one administrator.");
      }
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .eq("role", "authority");

    if (error) throw new Error("The officer could not be removed. Please try again.");
    return { ok: true };
  });

export const changeOwnPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => resetPasswordSchema.pick({ password: true }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.auth.updateUser({ password: data.password });
    if (error) throw new Error("Your password could not be changed. Please try again.");
    return { ok: true };
  });
