import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  BookOpen,
  Check,
  ClipboardList,
  KeyRound,
  LogOut,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AUTHORITY_STATUSES,
  addReportNote,
  getReportUpdates,
  listAuthorityReports,
  updateReportStatus,
  type AuthorityReport,
  type AuthorityStatus,
  type ReportUpdate,
} from "@/lib/authority.functions";
import {
  changeOwnPassword,
  createOfficer,
  getMyProfile,
  listStaff,
  removeOfficer,
  resetOfficerPassword,
  type MyProfile,
  type StaffMember,
} from "@/lib/staff.functions";

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

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#d8f06b]/60 focus:ring-4 focus:ring-[#d8f06b]/15";
const primaryButton =
  "inline-flex items-center gap-2 rounded-xl bg-[#d8f06b] px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-[#e4f695] focus:outline-none focus:ring-4 focus:ring-[#d8f06b]/30 disabled:cursor-not-allowed disabled:opacity-40";
const ghostButton =
  "inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-40";

function asStatus(value: string): AuthorityStatus {
  return (AUTHORITY_STATUSES as readonly string[]).includes(value)
    ? (value as AuthorityStatus)
    : "received";
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function AiSignals({ report }: { report: AuthorityReport }) {
  const analysis = report.analysis ?? {};
  if (analysis.mode !== "ai") return null;

  if (analysis.status === "unavailable") {
    return (
      <div className="mt-5 rounded-xl border border-white/10 bg-[#07131b]/60 p-4 text-sm text-white/55">
        <p className="flex items-center gap-2 font-semibold text-white/75">
          <Sparkles size={15} className="text-[#d8f06b]" /> AI advisory signals unavailable
        </p>
        <p className="mt-1 text-white/50">{analysis.note ?? "AI analysis could not be prepared for this report."}</p>
      </div>
    );
  }

  const duplicates = analysis.duplicates;
  return (
    <div className="mt-5 rounded-xl border border-[#d8f06b]/20 bg-[#d8f06b]/5 p-4 text-sm">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#d8f06b]">
        <Sparkles size={14} /> AI advisory signals — suggestions only
      </p>
      <dl className="mt-3 grid gap-x-8 gap-y-2 text-white/70 sm:grid-cols-2">
        {analysis.classification?.label ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-white/40">Suggested label</dt>
            <dd className="mt-0.5 text-white/85">{analysis.classification.label}</dd>
          </div>
        ) : null}
        {analysis.priority?.suggestion ? (
          <div>
            <dt className="text-xs uppercase tracking-[0.12em] text-white/40">Review priority</dt>
            <dd className="mt-0.5 text-white/85">{analysis.priority.suggestion}</dd>
          </div>
        ) : null}
        {analysis.extraction?.summary ? (
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.12em] text-white/40">Neutral summary</dt>
            <dd className="mt-0.5 leading-6 text-white/80">{analysis.extraction.summary}</dd>
          </div>
        ) : null}
        <div className="sm:col-span-2">
          <dt className="text-xs uppercase tracking-[0.12em] text-white/40">Possible duplicates</dt>
          <dd className="mt-0.5 text-white/80">
            {duplicates?.assessed && (duplicates.possible_matches?.length ?? 0) > 0
              ? `${duplicates.possible_matches!.length} earlier report(s) may describe the same incident — verify before acting on this signal.`
              : "No likely matches found among recent reports."}
          </dd>
        </div>
      </dl>
      <p className="mt-3 border-t border-white/10 pt-2 text-xs leading-5 text-white/45">
        {analysis.disclaimer}
      </p>
    </div>
  );
}

function ActivityHistory({ reportId }: { reportId: string }) {
  const fetchUpdates = useServerFn(getReportUpdates);
  const addNote = useServerFn(addReportNote);
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: updates, isLoading } = useQuery<ReportUpdate[]>({
    queryKey: ["report-updates", reportId],
    queryFn: () => fetchUpdates({ data: { reportId } }),
  });

  async function submitNote() {
    const trimmed = note.trim();
    if (!trimmed) return;
    setSaving(true);
    setError("");
    try {
      await addNote({ data: { reportId, note: trimmed } });
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["report-updates", reportId] });
    } catch {
      setError("The note could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
        <ClipboardList size={14} /> Activity & notes
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add a working note for other staff…"
          maxLength={1600}
          className={inputClass}
        />
        <button type="button" onClick={submitNote} disabled={saving || !note.trim()} className={`${primaryButton} shrink-0`}>
          <NotebookPen size={15} /> {saving ? "Saving…" : "Add note"}
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      <ul className="mt-4 space-y-2.5">
        {isLoading ? <li className="text-sm text-white/45">Loading history…</li> : null}
        {(updates ?? []).map((update) => (
          <li key={update.id} className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm">
            <span className="font-semibold text-white/80">
              {update.kind === "note"
                ? "Note"
                : `Status: ${statusLabels[asStatus(update.oldStatus ?? "received")] ?? update.oldStatus} → ${statusLabels[asStatus(update.newStatus ?? "received")] ?? update.newStatus}`}
            </span>
            <span className="ml-2 text-white/45">{update.officerLabel}</span>
            <span className="ml-2 text-white/35">{formatWhen(update.createdAt)}</span>
            {update.note ? <p className="mt-1 leading-6 text-white/65">{update.note}</p> : null}
          </li>
        ))}
        {!isLoading && (updates ?? []).length === 0 ? (
          <li className="text-sm text-white/45">No recorded activity yet.</li>
        ) : null}
      </ul>
    </div>
  );
}

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
          <dd className="mt-1 text-white/85">{formatWhen(report.submittedAt)}</dd>
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

      <AiSignals report={report} />
      <ActivityHistory reportId={report.id} />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {upcoming ? (
          <button type="button" disabled={isUpdating} onClick={() => onAdvance(report.id, upcoming)} className={primaryButton}>
            {isUpdating ? "Updating…" : `Move to ${statusLabels[upcoming]}`}
          </button>
        ) : (
          <span className="text-sm text-white/45">This report is closed.</span>
        )}
      </div>
    </article>
  );
}

function StaffPanel() {
  const listStaffFn = useServerFn(listStaff);
  const createOfficerFn = useServerFn(createOfficer);
  const resetPasswordFn = useServerFn(resetOfficerPassword);
  const removeOfficerFn = useServerFn(removeOfficer);
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: staff, refetch } = useQuery<StaffMember[]>({
    queryKey: ["staff"],
    queryFn: () => listStaffFn(),
  });

  async function run(action: () => Promise<void>, successMessage: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(successMessage);
      await refetch();
    } catch (caught) {
      setError((caught as Error).message || "That action could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
        <ShieldCheck size={14} className="text-[#d8f06b]" /> Staff management — administrators only
      </p>

      <ul className="mt-4 divide-y divide-white/10">
        {(staff ?? []).map((member) => (
          <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-semibold text-white/85">{member.email}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-white/40">{member.role}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const newPassword = prompt(`Set a new password for ${member.email} (at least 12 characters):`);
                    if (!newPassword) throw new Error("Password reset cancelled.");
                    if (newPassword.length < 12) throw new Error("Use at least 12 characters.");
                    await resetPasswordFn({ data: { userId: member.userId, password: newPassword } });
                  }, "Password reset.")
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-40"
              >
                <KeyRound size={13} /> Reset password
              </button>
              {member.role !== "admin" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      if (!confirm(`Remove staff access for ${member.email}?`)) throw new Error("Removal cancelled.");
                      await removeOfficerFn({ data: { userId: member.userId } });
                    }, "Officer removed.")
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300/30 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-300/10 disabled:opacity-40"
                >
                  <Trash2 size={13} /> Remove
                </button>
              ) : null}
            </div>
          </li>
        ))}
        {!staff ? <li className="py-3 text-sm text-white/45">Loading staff…</li> : null}
      </ul>

      <form
        className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-5 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          run(async () => {
            await createOfficerFn({ data: { email, password } });
            setEmail("");
            setPassword("");
          }, "Officer account created. Share the initial password privately.");
        }}
      >
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="officer@your-organisation.org"
          className={inputClass}
        />
        <input
          type="text"
          required
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Initial password (12+ characters)"
          className={inputClass}
          autoComplete="off"
        />
        <button type="submit" disabled={busy} className={`${primaryButton} shrink-0`}>
          <UserPlus size={15} /> Add officer
        </button>
      </form>

      {message ? <p className="mt-3 text-sm text-lime-200">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}

function AccountSection({ profile }: { profile: MyProfile }) {
  const changePasswordFn = useServerFn(changeOwnPassword);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
        <KeyRound size={14} className="text-[#d8f06b]" /> Your account
      </p>
      <p className="mt-3 text-sm text-white/60">
        Signed in as <span className="font-semibold text-white/85">{profile.email ?? "staff"}</span>
        {profile.roles.includes("admin") ? " (administrator)" : ""}.
      </p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          setError("");
          try {
            await changePasswordFn({ data: { password } });
            setPassword("");
            setMessage("Your password has been changed.");
          } catch (caught) {
            setError((caught as Error).message || "Your password could not be changed.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          type="password"
          required
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password (12+ characters)"
          autoComplete="new-password"
          className={inputClass}
        />
        <button type="submit" disabled={busy} className={`${primaryButton} shrink-0`}>
          Change password
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-lime-200">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </section>
  );
}

function AuthorityDesk() {
  const listReports = useServerFn(listAuthorityReports);
  const updateStatus = useServerFn(updateReportStatus);
  const getProfile = useServerFn(getMyProfile);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const { data, isLoading, error, refetch } = useQuery<AuthorityReport[]>({
    queryKey: ["authority-reports"],
    queryFn: () => listReports(),
  });

  const { data: profile } = useQuery<MyProfile>({
    queryKey: ["my-profile"],
    queryFn: () => getProfile(),
  });

  async function advance(reportId: string, status: AuthorityStatus) {
    setUpdatingId(reportId);
    setActionError("");
    try {
      await updateStatus({ data: { reportId, status } });
      await refetch();
ecific      await queryClient.invalidateQueries({ queryKey: ["report-updates", reportId] });
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
          <div className="flex items-center gap-2">
            <Link
              to="/authority/guide"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              <BookOpen size={16} />
              <span className="hidden sm:inline">Staff guide</span>
            </Link>
            <button type="button" onClick={handleSignOut} className={ghostButton}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
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

        {profile?.roles.includes("admin") ? <StaffPanel /> : null}
        {profile ? <AccountSection profile={profile} /> : null}

        <div className="mt-10">
          <button
            type="button"
            onClick={() => navigate({ to: "/", replace: true })}
            className={ghostButton}
          >
            <ArrowLeft size={16} />
            Public site
          </button>
        </div>
      </main>
    </div>
  );
}
