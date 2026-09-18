import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTHORITY_STATUSES,
  listAuthorityReports,
  updateReportStatus,
  type AuthorityReport,
  type AuthorityStatus,
} from "@/lib/authority.functions";

export const Route = createFileRoute("/_authenticated/authority")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clearline — Authority review desk" },
      { name: "description", content: "Review and triage submitted anonymous reports." },
      { property: "og:title", content: "Clearline — Authority review desk" },
      { property: "og:description", content: "Review and triage submitted anonymous reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthorityDesk,
});

const categoryLabels: Record<string, string> = {
  violence: "Violence or threat",
  harassment: "Harassment",
  theft: "Theft or property loss",
  "safety-hazard": "Public safety hazard",
  "suspicious-activity": "Suspicious activity",
  other: "Other unsafe situation",
};

const statusLabels: Record<AuthorityStatus, string> = {
  received: "Received",
  "under-review": "Under review",
  "action-taken": "Action taken",
  closed: "Closed",
};

const statusTone: Record<AuthorityStatus, string> = {
  received: "border-amber-300/30 bg-amber-300/10 text-amber-200",
  "under-review": "border-sky-300/30 bg-sky-300/10 text-sky-200",
  "action-taken": "border-lime-300/30 bg-lime-300/10 text-lime-200",
  closed: "border-white/20 bg-white/5 text-white/60",
};

const nextStatus: Record<AuthorityStatus, AuthorityStatus | null> = {
  received: "under-review",
  "under-review": "action-taken",
  "action-taken": "closed",
  closed: null,
};

function asStatus(value: string): AuthorityStatus {
  return (AUTHORITY_STATUSES as readonly string[]).includes(value)
    ? (value as AuthorityStatus)
    : "received";
}

type AnalysisShape = {
  classification?: { label?: string };
  priority?: { suggestion?: string };
};

function ReportCard({
  report,
  isUpdating,
  onAdvance,
}: {
  report: AuthorityReport;
  isUpdating: boolean;
  onAdvance: (reportId: string, status: AuthorityStatus) => void;
}) {
  const status = asStatus(report.status);
  const analysis = (report.analysis ?? null) as AnalysisShape | null;
  const upcoming = nextStatus[status];

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white/80">
          {categoryLabels[report.category] ?? report.category}
        </span>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone[status]}`}>
          {statusLabels[status]}
        </span>
        {analysis?.priority?.suggestion ? (
          <span className="rounded-full border border-[#d8f06b]/30 bg-[#d8f06b]/10 px-3 py-1 text-xs font-semibold text-[#d8f06b]">
            AI signal: {analysis.priority.suggestion}
          </span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm text-white/65 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-white/40">When</dt>
          <dd className="mt-1 text-white/85">{report.incidentDate}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-white/40">Where</dt>
          <dd className="mt-1 text-white/85">
            {report.locationLabel ?? "Approximate area only"}
            <span className="ml-2 text-white/40">({report.locationMode})</span>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-white/40">Submitted</dt>
          <dd className="mt-1 text-white/85">
            {new Date(report.submittedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.14em] text-white/40">Retention until</dt>
          <dd className="mt-1 text-white/85">
            {new Date(report.retentionUntil).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </dd>
        </div>
      </dl>

      <p className="mt-4 whitespace-pre-line text-sm leading-6 text-white/80">{report.description}</p>
      {report.supportingDetails ? (
        <p className="mt-3 whitespace-pre-line rounded-xl border border-white/10 bg-[#07131b]/60 p-4 text-sm leading-6 text-white/60">
          {report.supportingDetails}
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {upcoming ? (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onAdvance(report.id, upcoming)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d8f06b] px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-[#e4f695] focus:outline-none focus:ring-4 focus:ring-[#d8f06b]/30 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isUpdating ? "Updating…" : `Move to ${statusLabels[upcoming]}`}
          </button>
        ) : (
          <span className="text-sm text-white/45">This report is closed.</span>
        )}
      </div>
    </article>
  );
}

function AuthorityDesk() {
  const listReports = useServerFn(listAuthorityReports);
  const updateStatus = useServerFn(updateReportStatus);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["authority-reports"],
    queryFn: () => listReports(),
  });

  async function advance(reportId: string, status: AuthorityStatus) {
    setUpdatingId(reportId);
    setActionError("");
    try {
      await updateStatus({ data: { reportId, status } });
      await refetch();
    } catch {
      setActionError("The status could not be updated. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#07131b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8f06b] text-slate-950">
              <ShieldCheck size={21} strokeWidth={2.5} />
            </span>
            <div>
              <span className="block font-display text-lg font-bold tracking-tight">Authority desk</span>
              <span className="block text-[10px] uppercase tracking-[0.24em] text-white/50">Clearline review</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl font-bold tracking-tight">Submitted reports</h1>
          <span className="text-sm text-white/50">
            {data ? `${data.length} active report${data.length === 1 ? "" : "s"}` : null}
          </span>
        </div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
          Reports are anonymous. Review the content, move each one through the workflow, and keep
          every AI signal advisory — human judgment decides the outcome.
        </p>

        {isLoading ? (
          <p className="mt-10 text-sm text-white/55">Loading reports…</p>
        ) : error ? (
          <div className="mt-10 rounded-2xl border border-rose-400/30 bg-rose-400/10 p-5 text-sm text-rose-200">
            {(error as Error).message || "Reports could not be loaded."}
          </div>
        ) : data && data.length > 0 ? (
          <div className="mt-8 space-y-5">
            {data.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                isUpdating={updatingId === report.id}
                onAdvance={advance}
              />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-sm text-white/55">No active reports right now.</p>
        )}

        {actionError ? (
          <p role="alert" className="mt-6 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {actionError}
          </p>
        ) : null}

        <div className="mt-10">
          <button
            type="button"
            onClick={() => navigate({ to: "/", replace: true })}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <ArrowLeft size={16} />
            Public site
          </button>
        </div>
      </main>
    </div>
  );
}
