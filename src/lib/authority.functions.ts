import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

export const AUTHORITY_STATUSES = ["received", "under-review", "action-taken", "closed"] as const;
export type AuthorityStatus = (typeof AUTHORITY_STATUSES)[number];

const updateSchema = z.object({
  reportId: z.string().uuid(),
  status: z.enum(AUTHORITY_STATUSES),
});

export async function getMyRoles(supabase: SupabaseClient<Database>, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) return [];
  return (data ?? []).map((row) => row.role);
}

export async function assertAuthority(supabase: SupabaseClient<Database>, userId: string) {
  const roles = await getMyRoles(supabase, userId);
  if (!roles.includes("authority") && !roles.includes("admin")) throw new Error("Forbidden");
}

export type ReportAnalysis = {
  mode?: string;
  status?: string;
  classification?: { label?: string; rationale?: string } | null;
  extraction?: {
    incident_type?: string;
    time_reference?: string;
    location_reference?: string;
    summary?: string;
  } | null;
  duplicates?: {
    assessed?: boolean;
    possible_matches?: Array<{ report_id: string; reason: string }>;
  } | null;
  priority?: { suggestion?: string; rationale?: string } | null;
  human_review_required?: boolean;
  disclaimer?: string;
  note?: string;
};

export type AuthorityReport = {
  id: string;
  category: string;
  incidentDate: string;
  locationMode: string;
  locationLabel: string | null;
  status: string;
  analysis: ReportAnalysis;
  description: string;
  supportingDetails: string | null;
  submittedAt: string;
  retentionUntil: string;
};

export type ReportUpdate = {
  id: string;
  kind: string;
  officerLabel: string;
  oldStatus: string | null;
  newStatus: string | null;
  note: string | null;
  createdAt: string;
};

export const listAuthorityReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAuthority(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reports")
      .select(
        "id, incident_category, incident_date, location_mode, location_label, status, ai_analysis, description, supporting_details, submitted_at, retention_until",
      )
      .gt("retention_until", new Date().toISOString())
      .order("submitted_at", { ascending: false });

    if (error) throw new Error("We could not load reports right now. Please try again.");

    const reports: AuthorityReport[] = (data ?? []).map((row) => ({
      id: row.id,
      category: row.incident_category,
      incidentDate: row.incident_date,
      locationMode: row.location_mode,
      locationLabel: row.location_label,
      status: row.status,
      analysis: (row.ai_analysis ?? {}) as ReportAnalysis,
      description: row.description,
      supportingDetails: row.supporting_details,
      submittedAt: row.submitted_at,
      retentionUntil: row.retention_until,
    }));

    return reports;
  });

async function officerLabel(supabase: SupabaseClient<Database>): Promise<string> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? "Staff";
}

async function recordUpdate(
  supabaseAdmin: SupabaseClient<Database>,
  values: {
    reportId: string;
    officerUserId: string;
    officerLabel: string;
    kind: "status_change" | "note";
    oldStatus?: string | null;
    newStatus?: string | null;
    note?: string | null;
  },
) {
  const { error } = await supabaseAdmin.from("report_updates").insert({
    report_id: values.reportId,
    officer_user_id: values.officerUserId,
    officer_label: values.officerLabel,
    kind: values.kind,
    old_status: values.oldStatus ?? null,
    new_status: values.newStatus ?? null,
    note: values.note ?? null,
  });
  if (error) console.error("Could not record report activity", error);
}

export const updateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAuthority(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin
      .from("reports")
      .select("status")
      .eq("id", data.reportId)
      .maybeSingle();

    const { data: updated, error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status })
      .eq("id", data.reportId)
      .gt("retention_until", new Date().toISOString())
      .select("id, status")
      .maybeSingle();

    if (error || !updated) throw new Error("This report could not be updated. It may no longer be active.");

    if (current?.status !== updated.status) {
      await recordUpdate(supabaseAdmin, {
        reportId: updated.id,
        officerUserId: context.userId,
        officerLabel: await officerLabel(context.supabase),
        kind: "status_change",
        oldStatus: current?.status ?? null,
        newStatus: updated.status,
      });
    }

    return { id: updated.id, status: updated.status };
  });

const noteSchema = z.object({
  reportId: z.string().uuid(),
  note: z.string().trim().min(1).max(1600),
});

export const addReportNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => noteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAuthority(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await recordUpdate(supabaseAdmin, {
      reportId: data.reportId,
      officerUserId: context.userId,
      officerLabel: await officerLabel(context.supabase),
      kind: "note",
      note: data.note,
    });

    return { ok: true };
  });

const updatesSchema = z.object({ reportId: z.string().uuid() });

export const getReportUpdates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updatesSchema.parse(input))
  .handler(async ({ data, context }): Promise<ReportUpdate[]> => {
    await assertAuthority(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("report_updates")
      .select("id, kind, officer_label, old_status, new_status, note, created_at")
      .eq("report_id", data.reportId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw new Error("The activity history could not be loaded. Please try again.");

    return (rows ?? []).map((row) => ({
      id: row.id,
      kind: row.kind,
      officerLabel: row.officer_label,
      oldStatus: row.old_status,
      newStatus: row.new_status,
      note: row.note,
      createdAt: row.created_at,
    }));
  });
