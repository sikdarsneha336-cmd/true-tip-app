import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, LogOut, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/authority_/guide")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Clearline — Staff guide" },
      { name: "description", content: "How authority staff operate the Clearline reporting desk." },
      { property: "og:title", content: "Clearline — Staff guide" },
      { property: "og:description", content: "How authority staff operate the Clearline reporting desk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StaffGuide,
});

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
      <h2 className="font-display text-xl font-bold tracking-tight text-white">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-6 text-white/65">{children}</div>
    </section>
  );
}

function StaffGuide() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-[#07131b] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8f06b] text-slate-950">
              <BookOpen size={21} strokeWidth={2.5} />
            </span>
            <div>
              <span className="block font-display text-lg font-bold tracking-tight">Staff guide</span>
              <span className="block text-[10px] uppercase tracking-[0.24em] text-white/50">Clearline authority</span>
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

      <main className="mx-auto max-w-4xl space-y-5 px-5 pb-20 pt-8 lg:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight">Operating the reporting desk</h1>
        <p className="max-w-2xl text-sm leading-6 text-white/55">
          Everything a staff member needs to review reports, work the workflow, and use the
          assistance features responsibly.
        </p>

        <GuideSection title="Signing in">
          <p>
            Staff sign in with the email and password your administrator issued. There is no
            self-registration: accounts are created by an administrator on the desk page. If you
            forget your password, ask an administrator to reset it, or change it yourself any time
            under “Your account”.
          </p>
        </GuideSection>

        <GuideSection title="The report workflow">
          <p>
            Each report moves through four stages: <strong>Received → Under review → Action taken → Closed</strong>.
            Use the “Move to…” button on a report card. The stage is visible to the anonymous
            reporter through their private access code, so keep it truthful about what has actually
            happened.
          </p>
        </GuideSection>

        <GuideSection title="Notes and activity history">
          <p>
            Add working notes on any report card — they are visible to other staff and form part of
            the report’s activity history. Every status change is recorded automatically with who
            made it and when. Write notes professionally: assume the reporter or another authority
            may one day lawfully read them.
          </p>
        </GuideSection>

        <GuideSection title="AI signals — assistance, not judgment">
          <p>
            Each new report receives AI-generated advisory signals: a suggested category label, a
            neutral summary, possible duplicates among recent reports, and a review-priority
            suggestion. These are hints to help you triage.
          </p>
          <p>
            <strong className="text-white/85">AI never decides whether a report is true or fake, and it never
            rejects a report.</strong>{" "}
            Treat every signal as a starting point for your own judgment, and verify duplicate
            suggestions by reading the reports yourself.
          </p>
        </GuideSection>

        <GuideSection title="Privacy rules you must keep">
          <p>
            Reports are anonymous by design. Never attempt to identify a reporter, never add
            identifying information to notes, and never share report content outside the authorised
            review process. Reporters get no notification — they check status only through their
            private access code, which staff never ask for.
          </p>
        </GuideSection>

        <GuideSection title="Administrators: managing staff">
          <p>
            Administrators see a “Staff management” section on the desk. From there you can create
            officer accounts (share the initial password privately), reset an officer’s password,
            and remove an officer’s access. At least one administrator must always remain. Sign-ups
            from the public site are permanently disabled.
          </p>
        </GuideSection>

        <GuideSection title="Data retention">
          <p>
            Reports are retained for 90 days from submission. After that they drop out of the desk
            and the public retrieval view. Do not copy report content into notes if it would extend
            the data’s life beyond what the reporter expects.
          </p>
        </GuideSection>

        <div className="pt-4">
          <Link
            to="/authority"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-4 focus:ring-white/20"
          >
            <ArrowLeft size={16} />
            Back to the desk
          </Link>
        </div>
      </main>
    </div>
  );
}
