import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Clearline — Authority sign-in" },
      { name: "description", content: "Sign-in for authorized Clearline review staff." },
      { property: "og:title", content: "Clearline — Authority sign-in" },
      { property: "og:description", content: "Sign-in for authorized Clearline review staff." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthoritySignIn,
});

const fieldClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-950 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10";
const primaryButton =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d8f06b] px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-[#e4f695] focus:outline-none focus:ring-4 focus:ring-[#d8f06b]/30 disabled:cursor-not-allowed disabled:opacity-40";

function AuthoritySignIn() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setHasSession(true);
    });
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsBusy(true);
    setError("");
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError("That email or password did not match an authority account.");
        return;
      }
      await navigate({ to: "/authority" });
    } catch {
      setError("Sign-in is unavailable right now. Please try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07131b] px-5 py-16 text-white">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#d8f06b] text-slate-950">
            <ShieldCheck size={22} strokeWidth={2.5} />
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Authority sign-in</h1>
            <p className="text-sm text-white/55">Clearline review desk for authorized staff</p>
          </div>
        </div>

        {hasSession ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm leading-6 text-white/75">You are already signed in.</p>
            <button
              type="button"
              onClick={() => navigate({ to: "/authority" })}
              className={`${primaryButton} mt-5`}
            >
              Open the review desk
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8"
          >
            <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              Work email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className={fieldClass}
              />
            </label>
            <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.14em] text-white/55">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                className={fieldClass}
              />
            </label>

            {error ? (
              <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            <button type="submit" disabled={isBusy} className={`${primaryButton} mt-6`}>
              <LogIn size={17} />
              {isBusy ? "Signing in…" : "Sign in"}
            </button>

            <p className="mt-5 text-xs leading-5 text-white/45">
              Accounts are provisioned for staff and cannot be self-registered. Contact the Clearline
              administrator if you need access.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
