import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { AdvisoryAnalysis } from "@/lib/analysis.server";

const locationSchema = z.object({
  mode: z.enum(["gps", "approximate", "manual"]),
  label: z.string().trim().max(160).nullable(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

const reportSchema = z.object({
  category: z.enum(["violence", "harassment", "theft", "safety-hazard", "suspicious-activity", "other"]),
  incidentDate: z.string().trim().min(1).max(80),
  location: locationSchema,
  description: z.string().trim().min(20).max(4000),
  supportingDetails: z.string().trim().max(1600).nullable(),
});

const accessCodeSchema = z.object({
  code: z.string().trim().regex(/^[A-Z0-9-]{8,32}$/),
});

async function hashCode(code: string) {
  const bytes = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function createRetrievalCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(12);
  crypto.getRandomValues(values);
  const raw = Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
}

const categoryLabels: Record<z.infer<typeof reportSchema>["category"], string> = {
  violence: "Violence or threat",
  harassment: "Harassment or intimidation",
  theft: "Theft or property loss",
  "safety-hazard": "Public safety hazard",
  "suspicious-activity": "Suspicious activity",
  other: "Other unsafe situation",
};

async function fetchCandidates(
  supabaseAdmin: SupabaseClient<Database>,
  category: string,
  excludeReportId: string,
) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("reports")
    .select("id, incident_date, location_label, description")
    .eq("incident_category", category)
    .neq("id", excludeReportId)
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: false })
    .limit(8);

  return (data ?? []).map((row) => ({
    report_id: row.id,
    description: row.description,
    incident_date: row.incident_date,
    location_label: row.location_label,
  }));
}

export const submitAnonymousReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => reportSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const retrievalCode = createRetrievalCode();
    const retrievalCodeHash = await hashCode(retrievalCode);
    const analysis = createMockAnalysis(data);

    const { data: inserted, error } = await supabaseAdmin
      .from("reports")
      .insert({
        incident_category: data.category,
        incident_date: data.incidentDate,
        location_mode: data.location.mode,
        location_label: data.location.label,
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        description: data.description,
        supporting_details: data.supportingDetails,
        retrieval_code_hash: retrievalCodeHash,
        retrieval_code_hint: `${retrievalCode.slice(0, 4)}••••••••`,
        ai_analysis: analysis,
      })
      .select("id, submitted_at, retention_until")
      .single();

    if (error || !inserted) throw new Error("We could not save this report. Please try again.");

    return {
      reportId: inserted.id,
      retrievalCode,
      submittedAt: inserted.submitted_at,
      retentionUntil: inserted.retention_until,
      analysis,
    };
  });

export const retrieveAnonymousReport = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => accessCodeSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const retrievalCodeHash = await hashCode(data.code.toUpperCase());
    const { data: report, error } = await supabaseAdmin
      .from("reports")
      .select("id, incident_category, incident_date, location_mode, location_label, status, ai_analysis, submitted_at, retention_until")
      .eq("retrieval_code_hash", retrievalCodeHash)
      .gt("retention_until", new Date().toISOString())
      .maybeSingle();

    if (error || !report) return { found: false as const };

    return {
      found: true as const,
      report: {
        id: report.id,
        category: report.incident_category,
        incidentDate: report.incident_date,
        locationMode: report.location_mode,
        locationLabel: report.location_label,
        status: report.status,
        analysis: report.ai_analysis,
        submittedAt: report.submitted_at,
        retentionUntil: report.retention_until,
      },
    };
  });