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

async function assertAuthority(supabase: SupabaseClient<Database>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "authority")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export type AuthorityReport = {
  id: string;
  category: string;
  incidentDate: string;
  locationMode: string;
  locationLabel: string | null;
  status: string;
  analysis: unknown;
  description: string;
  supportingDetails: string | null;
  submittedAt: string;
  retentionUntil: string;
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
      analysis: row.ai_analysis,
      description: row.description,
      supportingDetails: row.supporting_details,
      submittedAt: row.submitted_at,
      retentionUntil: row.retention_until,
    }));

    return reports;
  });

export const updateReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAuthority(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: updated, error } = await supabaseAdmin
      .from("reports")
      .update({ status: data.status })
      .eq("id", data.reportId)
      .gt("retention_until", new Date().toISOString())
      .select("id, status")
      .maybeSingle();

    if (error || !updated) throw new Error("This report could not be updated. It may no longer be active.");

    return { id: updated.id, status: updated.status };
  });
