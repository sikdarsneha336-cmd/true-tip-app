// Advisory AI analysis for submitted reports. Server-only.
// The AI never determines whether a report is true or fake, never rejects a
// report, and its output is always marked as a suggestion for human review.
import { streamText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { createResponsesProvider } from "@/lib/ai-gateway.server";

const analysisSchema = z.object({
  classification: z.object({
    label: z.string(),
    rationale: z.string(),
  }),
  extraction: z.object({
    incident_type: z.string(),
    time_reference: z.string(),
    location_reference: z.string(),
    summary: z.string(),
  }),
  duplicates: z.object({
    assessed: z.boolean(),
    possible_matches: z.array(
      z.object({
        report_id: z.string(),
        reason: z.string(),
      }),
    ),
  }),
  priority: z.object({
    suggestion: z.enum(["Review promptly", "Standard review"]),
    rationale: z.string(),
  }),
});

export type CandidateReport = {
  report_id: string;
  description: string;
  incident_date: string;
  location_label: string | null;
};

export type AdvisoryAnalysis = {
  mode: "ai";
  status: "complete" | "unavailable";
  classification?: { label: string; rationale: string };
  extraction?: {
    incident_type: string;
    time_reference: string;
    location_reference: string;
    summary: string;
  };
  duplicates?: {
    assessed: boolean;
    possible_matches: Array<{ report_id: string; reason: string }>;
  };
  priority?: { suggestion: string; rationale: string };
  human_review_required: true;
  disclaimer: string;
  note?: string;
};

const DISCLAIMER =
  "AI-generated signals are suggestions for a human reviewer. They never determine whether a report is true or fake and never reject a report.";

function unavailable(note: string): AdvisoryAnalysis {
  return {
    mode: "ai",
    status: "unavailable",
    human_review_required: true,
    disclaimer: DISCLAIMER,
    note,
  };
}

function clamp(value: string | undefined, max: number, fallback: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

export async function runAdvisoryAnalysis(input: {
  category: string;
  categoryLabel: string;
  incidentDate: string;
  locationLabel: string | null;
  locationMode: string;
  description: string;
  supportingDetails: string | null;
  candidates: CandidateReport[];
}): Promise<AdvisoryAnalysis> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return unavailable("AI analysis is not configured yet.");

  const candidateLines = input.candidates.length
    ? input.candidates
        .map(
          (candidate) =>
            `- id ${candidate.report_id} | when: ${candidate.incident_date} | where: ${
              candidate.location_label ?? "not provided"
            } | story: ${candidate.description.slice(0, 400)}`,
        )
        .join("\n")
    : "None provided.";

  const prompt = [
    "You assist a human reviewer at a community safety reporting desk. A member of the public submitted an anonymous report.",
    "",
    "HARD RULES:",
    "- You are advisory only. Never state or imply whether a report is true, false, credible, or fake.",
    "- Never recommend rejecting, discarding, or dismissing a report.",
    "- Use neutral, non-accusatory language about everyone involved.",
    "- Priority is only a review-urgency suggestion for the human reviewer.",
    "",
    "TASKS:",
    "1. classification: a short neutral label for the kind of situation, with a one-line rationale.",
    "2. extraction: incident type, the reporter's stated time, the reporter's stated location, and a concise neutral summary (at most 60 words).",
    "3. duplicates: compare the report against the candidate past reports listed below. If no candidates are provided, or none plausibly describe the same incident, set assessed=false with an empty possible_matches list. Otherwise list matching candidate ids, each with a one-line reason.",
    "4. priority: choose 'Review promptly' or 'Standard review', with a one-line rationale.",
    "",
    "Keep every text field under 30 words.",
    "",
    "REPORT:",
    `Category as submitted: ${input.categoryLabel}`,
    `When (reporter's words): ${input.incidentDate}`,
    `Location (reporter's choice, ${input.locationMode}): ${input.locationLabel ?? "not provided"}`,
    `Description: ${input.description}`,
    `Supporting details: ${input.supportingDetails ?? "none"}`,
    "",
    "CANDIDATE PAST REPORTS:",
    candidateLines,
  ].join("\n");

  try {
    const { provider } = createResponsesProvider(apiKey);
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: analysisSchema }),
      prompt,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const output = await result.output;

    return {
      mode: "ai",
      status: "complete",
      classification: {
        label: clamp(output.classification?.label, 60, input.categoryLabel),
        rationale: clamp(output.classification?.rationale, 160, ""),
      },
      extraction: {
        incident_type: clamp(output.extraction?.incident_type, 80, input.categoryLabel),
        time_reference: clamp(output.extraction?.time_reference, 80, input.incidentDate),
        location_reference: clamp(
          output.extraction?.location_reference,
          120,
          input.locationLabel ?? "not provided",
        ),
        summary: clamp(output.extraction?.summary, 400, ""),
      },
      duplicates: {
        assessed: Boolean(output.duplicates?.assessed),
        possible_matches: (output.duplicates?.possible_matches ?? [])
          .slice(0, 5)
          .map((match) => ({
            report_id: clamp(match.report_id, 64, ""),
            reason: clamp(match.reason, 160, ""),
          }))
          .filter((match) => match.report_id),
      },
      priority: {
        suggestion: output.priority?.suggestion === "Review promptly" ? "Review promptly" : "Standard review",
        rationale: clamp(output.priority?.rationale, 160, ""),
      },
      human_review_required: true,
      disclaimer: DISCLAIMER,
    };
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      console.error("Advisory AI: no structured output generated");
      return unavailable("AI analysis could not complete for this report.");
    }
    console.error("Advisory AI request failed", error);
    return unavailable("AI analysis is temporarily unavailable.");
  }
}
