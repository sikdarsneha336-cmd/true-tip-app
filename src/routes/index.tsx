import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Crosshair,
  FileText,
  Fingerprint,
  Info,
  LockKeyhole,
  MapPin,
  Menu,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";
import { submitAnonymousReport, retrieveAnonymousReport } from "@/lib/reports.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Clearline — Anonymous unsafe situation reports" },
      { name: "description", content: "Document unsafe situations without creating an account or sharing direct identity details." },
      { property: "og:title", content: "Clearline — Anonymous unsafe situation reports" },
      { property: "og:description", content: "A privacy-conscious reporting foundation for unsafe situations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Clearline,
});

type Step = "home" | "incident" | "location" | "story" | "review" | "submitted" | "retrieve" | "retrieved";
type Category = "violence" | "harassment" | "theft" | "safety-hazard" | "suspicious-activity" | "other";
type LocationMode = "gps" | "approximate" | "manual";

type ReportDraft = {
  category: Category | "";
  incidentDate: string;
  locationMode: LocationMode | "";
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  description: string;
  supportingDetails: string;
};

const categories: Array<{ value: Category; label: string; description: string; tone: string }> = [
  { value: "violence", label: "Violence or threat", description: "A threat, assault, or dangerous confrontation.", tone: "bg-rose-100 text-rose-700" },
  { value: "harassment", label: "Harassment", description: "Repeated intimidation, stalking, or targeted abuse.", tone: "bg-amber-100 text-amber-800" },
  { value: "theft", label: "Theft or property loss", description: "Missing property, burglary, or attempted theft.", tone: "bg-sky-100 text-sky-700" },
  { value: "safety-hazard", label: "Public safety hazard", description: "A dangerous condition affecting people nearby.", tone: "bg-lime-100 text-lime-800" },
  { value: "suspicious-activity", label: "Suspicious activity", description: "Behavior that feels unsafe or out of place.", tone: "bg-violet-100 text-violet-700" },
  { value: "other", label: "Other unsafe situation", description: "Something else that should be documented.", tone: "bg-slate-100 text-slate-700" },
];

const initialDraft: ReportDraft = {
  category: "",
  incidentDate: "",
  locationMode: "",
  locationLabel: "",
  latitude: null,
  longitude: null,
  description: "",
  supportingDetails: "",
};

const fieldClass = "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-[15px] text-slate-950 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-900/10";
const secondaryButton = "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-900/10";
const primaryButton = "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-900/20 disabled:cursor-not-allowed disabled:opacity-40";

function Clearline() {
  const [step, setStep] = useState<Step>("home");
  const [draft, setDraft] = useState<ReportDraft>(initialDraft);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [retrievalError, setRetrievalError] = useState("");
  const [submission, setSubmission] = useState<Awaited<ReturnType<typeof submitAnonymousReport>> | null>(null);
  const [retrieved, setRetrieved] = useState<Awaited<ReturnType<typeof retrieveAnonymousReport>> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [geoMessage, setGeoMessage] = useState("");
  const [formError, setFormError] = useState("");
  const submitReport = useServerFn(submitAnonymousReport);
  const retrieveReport = useServerFn(retrieveAnonymousReport);

  function updateDraft<K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setFormError("");
  }

  function resetApp() {
    setStep("home");
    setDraft(initialDraft);
    setSubmission(null);
    setRetrieved(null);
    setAccessCode("");
    setRetrievalError("");
    setGeoMessage("");
    setFormError("");
  }

  function chooseGps() {
    if (!navigator.geolocation) {
      setGeoMessage("This browser does not offer location access. Choose an approximate or manual area instead.");
      return;
    }
    setGeoMessage("Requesting your location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        updateDraft("locationMode", "gps");
        updateDraft("latitude", Number(coords.latitude.toFixed(5)));
        updateDraft("longitude", Number(coords.longitude.toFixed(5)));
        updateDraft("locationLabel", "Precise device location captured");
        setGeoMessage("Location captured. You can review it below before continuing.");
      },
      () => setGeoMessage("Location permission was not granted. Nothing was captured. Choose an approximate or manual area instead."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  function validateCurrentStep() {
    if (step === "incident" && !draft.category) return "Choose the closest incident category to continue.";
    if (step === "location" && (!draft.locationMode || !draft.incidentDate.trim())) return "Add when it happened and choose how to share the location.";
    if (step === "story" && draft.description.trim().length < 20) return "Add at least 20 characters so a reviewer has enough context.";
    return "";
  }

  async function handleSubmit() {
    if (!draft.category || !draft.locationMode) return;
    setIsSubmitting(true);
    setFormError("");
    try {
      const result = await submitReport({
        data: {
          category: draft.category,
          incidentDate: draft.incidentDate,
          location: {
            mode: draft.locationMode,
            label: draft.locationLabel || null,
            latitude: draft.latitude,
            longitude: draft.longitude,
          },
          description: draft.description,
          supportingDetails: draft.supportingDetails || null,
        },
      });
      setSubmission(result);
      setStep("submitted");
    } catch {
      setFormError("This report could not be saved right now. Please try again without closing this page.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRetrieve(event: React.FormEvent) {
    event.preventDefault();
    setRetrievalError("");
    try {
      const result = await retrieveReport({ data: { code: accessCode.toUpperCase() } });
      if (!result.found) {
        setRetrievalError("That code did not match an active report. Check the characters and try again.");
        return;
      }
      setRetrieved(result);
      setStep("retrieved");
    } catch {
      setRetrievalError("We could not check that code right now. Please try again.");
    }
  }

  const selectedCategory = categories.find((category) => category.value === draft.category);
  const canAdvance = !validateCurrentStep();

  return (
    <div className="min-h-screen overflow-hidden bg-[#07131b] text-slate-950">
      <header className="border-b border-white/10 bg-[#07131b] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10">
          <button type="button" onClick={resetApp} className="flex items-center gap-3 text-left" aria-label="Clearline home">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#d8f06b] text-slate-950"><Crosshair size={21} strokeWidth={2.5} /></span>
            <span><span className="block font-display text-lg font-bold tracking-tight">clearline</span><span className="block text-[10px] uppercase tracking-[0.24em] text-white/50">unsafe situation reporting</span></span>
          </button>
          <nav className="hidden items-center gap-7 text-sm text-white/65 md:flex">
            <button type="button" onClick={() => setPrivacyOpen(true)} className="transition hover:text-white">Privacy & safety</button>
            <button type="button" onClick={() => setStep("retrieve")} className="transition hover:text-white">Access a report</button>
          </nav>
          <button type="button" className="text-white md:hidden" aria-label="Open navigation"><Menu size={22} /></button>
        </div>
      </header>

      {step === "home" ? <Home onBegin={() => setStep("incident")} onRetrieve={() => setStep("retrieve")} onPrivacy={() => setPrivacyOpen(true)} /> : null}
      {step !== "home" && step !== "retrieve" && step !== "retrieved" ? (
        <ReportFlow step={step} draft={draft} selectedCategory={selectedCategory} formError={formError} geoMessage={geoMessage} isSubmitting={isSubmitting} canAdvance={canAdvance} onBack={() => setStep(step === "incident" ? "home" : step === "location" ? "incident" : step === "story" ? "location" : "story")} onNext={() => setStep(step === "incident" ? "location" : step === "location" ? "story" : step === "story" ? "review" : "submitted")} onUpdate={updateDraft} onGps={chooseGps} onSubmit={handleSubmit} />
      ) : null}
      {step === "submitted" && submission ? <Submitted result={submission} onCopy={() => navigator.clipboard?.writeText(submission.retrievalCode)} onRetrieve={() => setStep("retrieve")} onReset={resetApp} /> : null}
      {step === "retrieve" ? <Retrieve code={accessCode} error={retrievalError} onChange={setAccessCode} onSubmit={handleRetrieve} onBack={() => setStep("home")} /> : null}
      {step === "retrieved" && retrieved?.found ? <RetrievedReport report={retrieved.report} onBack={() => setStep("home")} /> : null}
      {privacyOpen ? <PrivacyModal onClose={() => setPrivacyOpen(false)} /> : null}
    </div>
  );
}

function Home({ onBegin, onRetrieve, onPrivacy }: { onBegin: () => void; onRetrieve: () => void; onPrivacy: () => void }) {
  return <main>
    <section className="relative bg-[#07131b] text-white">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 lg:grid-cols-[1.1fr_.9fr] lg:px-10 lg:pb-28 lg:pt-24">
        <div className="max-w-3xl self-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#d8f06b]"><span className="h-1.5 w-1.5 rounded-full bg-[#d8f06b]" />A careful place to start</div>
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight sm:text-6xl lg:text-8xl">Document what happened. <span className="text-[#d8f06b]">Keep control.</span></h1>
          <p className="mt-8 max-w-xl text-lg leading-8 text-white/65">Clearline helps people document unsafe situations without creating an account or handing over direct identity details.</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={onBegin} className="inline-flex items-center justify-center gap-3 rounded-xl bg-[#d8f06b] px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-[#e4f695]">Begin a report <ArrowRight size={17} /></button><button type="button" onClick={onRetrieve} className="inline-flex items-center justify-center gap-3 rounded-xl border border-white/20 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Access my report <Search size={17} /></button></div>
          <div className="mt-12 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/55"><span className="flex items-center gap-2"><Fingerprint size={16} className="text-[#d8f06b]" />No account required</span><span className="flex items-center gap-2"><LockKeyhole size={16} className="text-[#d8f06b]" />No direct identity fields</span></div>
        </div>
        <div className="relative min-h-[390px] lg:min-h-[520px]">
          <div className="absolute right-0 top-3 w-full max-w-md rounded-[2rem] border border-white/15 bg-[#10242c] p-5 shadow-2xl shadow-black/20 sm:right-8"><div className="flex items-center justify-between border-b border-white/10 pb-4"><span className="text-sm font-semibold">Your report, your choice</span><ShieldCheck size={18} className="text-[#d8f06b]" /></div><div className="mt-5 space-y-4"><MiniSignal icon={<MapPin size={17} />} title="Location is opt-in" text="Share precise GPS, an approximate area, or nothing more than a manual description." /><MiniSignal icon={<Sparkles size={17} />} title="AI stays advisory" text="Signals help human reviewers; they never decide truth or reject a report." /><MiniSignal icon={<FileText size={17} />} title="Access code only" text="A one-time code lets you return later. There is no identity-based recovery." /></div></div>
          <div className="absolute bottom-1 left-0 max-w-[250px] rounded-2xl bg-[#d8f06b] p-5 text-slate-950 shadow-xl shadow-black/20 sm:left-8"><p className="text-[11px] font-bold uppercase tracking-[0.18em]">Important first</p><p className="mt-2 font-display text-xl font-semibold leading-tight">Not an emergency service.</p><p className="mt-3 text-sm leading-5 text-slate-950/70">If someone is in immediate danger, contact local emergency services now.</p></div>
          <div className="absolute -bottom-8 right-4 hidden h-40 w-40 rounded-full border border-[#d8f06b]/30 sm:block"><div className="m-6 flex h-28 w-28 items-center justify-center rounded-full border border-[#d8f06b]/30"><Radio size={27} className="text-[#d8f06b]" /></div></div>
        </div>
      </div>
    </section>
    <section className="bg-[#f5f5ef] px-5 py-12 lg:px-10"><div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3"><InfoTile number="01" title="No identity fields" text="We do not ask for your name, email, phone number, account, or password." /><InfoTile number="02" title="You choose the detail" text="Location is user-controlled. Decide whether precise GPS, an approximate area, or manual context is right." /><InfoTile number="03" title="Human judgment stays central" text="Mock AI signals organize information for review. They do not decide what is true." /></div><div className="mx-auto mt-9 flex max-w-7xl flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row sm:items-center"><span>This student project is not a police reporting service.</span><button type="button" onClick={onPrivacy} className="font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-900">Read privacy & safety notes</button></div></section>
  </main>;
}

function MiniSignal({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d8f06b] text-slate-950">{icon}</span><div><p className="text-sm font-semibold text-white">{title}</p><p className="mt-1 text-sm leading-5 text-white/50">{text}</p></div></div>; }
function InfoTile({ number, title, text }: { number: string; title: string; text: string }) { return <div className="border-t-2 border-slate-950 pt-4"><p className="font-display text-sm font-bold text-slate-400">{number}</p><p className="mt-5 font-display text-xl font-semibold text-slate-950">{title}</p><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{text}</p></div>; }

function ReportFlow({ step, draft, selectedCategory, formError, geoMessage, isSubmitting, canAdvance, onBack, onNext, onUpdate, onGps, onSubmit }: { step: Step; draft: ReportDraft; selectedCategory?: (typeof categories)[number]; formError: string; geoMessage: string; isSubmitting: boolean; canAdvance: boolean; onBack: () => void; onNext: () => void; onUpdate: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void; onGps: () => void; onSubmit: () => void }) {
  const steps = ["Incident", "Location", "Story", "Review"];
  const currentIndex = step === "incident" ? 0 : step === "location" ? 1 : step === "story" ? 2 : 3;
  return <main className="min-h-[calc(100vh-81px)] bg-[#f5f5ef] px-5 py-10 lg:px-10 lg:py-16"><div className="mx-auto max-w-6xl"><div className="mb-9 flex items-center justify-between gap-6"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">New report</p><p className="mt-2 font-display text-2xl font-semibold text-slate-950">Take it one step at a time.</p></div><div className="hidden items-center gap-2 sm:flex">{steps.map((label, index) => <div key={label} className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${index <= currentIndex ? "bg-slate-950 text-white" : "bg-slate-200 text-slate-400"}`}>{index < currentIndex ? <Check size={14} /> : index + 1}</span><span className={`text-xs font-semibold ${index === currentIndex ? "text-slate-950" : "text-slate-400"}`}>{label}</span>{index < steps.length - 1 ? <span className="mx-1 h-px w-5 bg-slate-200" /> : null}</div>)}</div></div><div className="grid gap-8 lg:grid-cols-[1fr_280px]"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">{step === "incident" ? <IncidentStep draft={draft} onUpdate={onUpdate} /> : null}{step === "location" ? <LocationStep draft={draft} geoMessage={geoMessage} onUpdate={onUpdate} onGps={onGps} /> : null}{step === "story" ? <StoryStep draft={draft} onUpdate={onUpdate} /> : null}{step === "review" ? <ReviewStep draft={draft} selectedCategory={selectedCategory} /> : null}{formError ? <p role="alert" className="mt-6 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{formError}</p> : null}<div className="mt-9 flex flex-col-reverse justify-between gap-3 border-t border-slate-100 pt-6 sm:flex-row"><button type="button" onClick={onBack} className={secondaryButton}><ArrowLeft size={16} />Back</button>{step === "review" ? <button type="button" disabled={isSubmitting} onClick={onSubmit} className={primaryButton}>{isSubmitting ? "Saving report…" : "Submit report"}<ArrowRight size={16} /></button> : <button type="button" disabled={!canAdvance} onClick={onNext} className={primaryButton}>Continue <ArrowRight size={16} /></button>}</div></section><aside className="space-y-4"><div className="rounded-2xl bg-[#10242c] p-5 text-white"><div className="flex items-center gap-2 text-[#d8f06b]"><ShieldCheck size={18} /><p className="text-sm font-semibold">Privacy by design</p></div><p className="mt-4 text-sm leading-6 text-white/60">This flow never asks for your name, email, phone number, account, or password.</p><div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">A production system would also need protection against network and metadata-based identification.</div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">You control</p><ul className="mt-4 space-y-3 text-sm text-slate-600"><li className="flex gap-2"><CheckCircle2 size={17} className="shrink-0 text-emerald-600" />What location detail to share</li><li className="flex gap-2"><CheckCircle2 size={17} className="shrink-0 text-emerald-600" />Whether to submit supporting context</li><li className="flex gap-2"><CheckCircle2 size={17} className="shrink-0 text-emerald-600" />Your private retrieval code</li></ul></div></aside></div></div></main>;
}

function IncidentStep({ draft, onUpdate }: { draft: ReportDraft; onUpdate: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void }) { return <div><StepHeading eyebrow="Step 1 of 4" title="What kind of situation are you reporting?" text="Choose the closest match. A reviewer can refine the category later." /><div className="mt-8 grid gap-3 sm:grid-cols-2">{categories.map((category) => <button type="button" key={category.value} onClick={() => onUpdate("category", category.value)} className={`rounded-xl border p-4 text-left transition ${draft.category === category.value ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-900/10" : "border-slate-200 bg-white hover:border-slate-400"}`}><div className="flex items-start justify-between gap-3"><span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${draft.category === category.value ? "bg-white/15 text-[#d8f06b]" : category.tone}`}>{category.value.replaceAll("-", " ")}</span>{draft.category === category.value ? <CheckCircle2 size={18} className="text-[#d8f06b]" /> : null}</div><p className="mt-5 font-display text-lg font-semibold">{category.label}</p><p className={`mt-1 text-sm leading-5 ${draft.category === category.value ? "text-white/55" : "text-slate-500"}`}>{category.description}</p></button>)}</div></div>; }
function StepHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p><h2 className="mt-3 max-w-2xl font-display text-3xl font-semibold tracking-tight text-slate-950">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{text}</p></div>; }

function LocationStep({ draft, geoMessage, onUpdate, onGps }: { draft: ReportDraft; geoMessage: string; onUpdate: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void; onGps: () => void }) { return <div><StepHeading eyebrow="Step 2 of 4" title="When and where did it happen?" text="Use the closest time you remember. Location is optional and always requires your explicit choice." /><div className="mt-8"><label className="text-sm font-semibold text-slate-800">When did it happen?<span className="ml-1 text-rose-600">*</span><input value={draft.incidentDate} onChange={(event) => onUpdate("incidentDate", event.target.value)} className={fieldClass} placeholder="For example: Today around 9:30 pm or last Tuesday" maxLength={80} /></label><p className="mt-7 text-sm font-semibold text-slate-800">How would you like to share the location?<span className="ml-1 text-rose-600">*</span></p><div className="mt-3 grid gap-3 sm:grid-cols-3"><LocationChoice active={draft.locationMode === "gps"} icon={<Crosshair size={19} />} title="Precise GPS" text="Ask this device for a precise location." onClick={onGps} /><LocationChoice active={draft.locationMode === "approximate"} icon={<MapPin size={19} />} title="Approximate area" text="Share a neighborhood or nearby landmark." onClick={() => { onUpdate("locationMode", "approximate"); onUpdate("latitude", null); onUpdate("longitude", null); }} /><LocationChoice active={draft.locationMode === "manual"} icon={<FileText size={19} />} title="Manual only" text="Describe the place in your own words." onClick={() => { onUpdate("locationMode", "manual"); onUpdate("latitude", null); onUpdate("longitude", null); }} /></div>{draft.locationMode && draft.locationMode !== "gps" ? <label className="mt-5 block text-sm font-semibold text-slate-800">{draft.locationMode === "approximate" ? "Approximate area or nearby landmark" : "Location description"}<textarea value={draft.locationLabel} onChange={(event) => onUpdate("locationLabel", event.target.value)} className={`${fieldClass} min-h-24 resize-y`} placeholder="Avoid including names or details that could identify you." maxLength={160} /></label> : null}{draft.locationMode === "gps" ? <div className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><p className="font-semibold">{draft.locationLabel || "GPS is ready to be requested"}</p>{draft.latitude ? <p className="mt-1 text-xs text-emerald-700/70">Coordinates are shown only as a confirmation in this form.</p> : null}</div> : null}{geoMessage ? <p role="status" className="mt-3 text-sm text-slate-500">{geoMessage}</p> : null}</div></div>; }
function LocationChoice({ active, icon, title, text, onClick }: { active: boolean; icon: React.ReactNode; title: string; text: string; onClick: () => void }) { return <button type="button" onClick={onClick} className={`rounded-xl border p-4 text-left transition ${active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 hover:border-slate-400"}`}><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-[#d8f06b] text-slate-950" : "bg-slate-100 text-slate-600"}`}>{icon}</span><p className="mt-4 text-sm font-semibold">{title}</p><p className={`mt-1 text-xs leading-5 ${active ? "text-white/55" : "text-slate-500"}`}>{text}</p></button>; }
function StoryStep({ draft, onUpdate }: { draft: ReportDraft; onUpdate: <K extends keyof ReportDraft>(key: K, value: ReportDraft[K]) => void }) { return <div><StepHeading eyebrow="Step 3 of 4" title="Tell us what you saw." text="Describe observable facts in your own words. You do not need to identify yourself or anyone else." /><div className="mt-8"><label className="text-sm font-semibold text-slate-800">What happened?<span className="ml-1 text-rose-600">*</span><textarea value={draft.description} onChange={(event) => onUpdate("description", event.target.value)} className={`${fieldClass} min-h-48 resize-y`} placeholder="What did you see, hear, or experience? Include details that may help a reviewer understand the situation." maxLength={4000} /><span className="mt-2 block text-right text-xs font-normal text-slate-400">{draft.description.length}/4000</span></label><label className="mt-6 block text-sm font-semibold text-slate-800">Anything else useful? <span className="font-normal text-slate-400">Optional</span><textarea value={draft.supportingDetails} onChange={(event) => onUpdate("supportingDetails", event.target.value)} className={`${fieldClass} min-h-28 resize-y`} placeholder="Patterns, nearby public landmarks, or other context." maxLength={1600} /></label><div className="mt-6 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><Info size={18} className="mt-0.5 shrink-0" /><p>Avoid names, contact details, or information that could identify you. Evidence uploads are intentionally not part of this first foundation.</p></div></div></div>; }
function ReviewStep({ draft, selectedCategory }: { draft: ReportDraft; selectedCategory?: (typeof categories)[number] }) { return <div><StepHeading eyebrow="Step 4 of 4" title="Review before you submit." text="This report will be saved to the Clearline student-project database. It will not be sent to a real police authority." /><div className="mt-8 space-y-4"><ReviewRow label="Category" value={selectedCategory?.label ?? "Not selected"} /><ReviewRow label="When" value={draft.incidentDate} /><ReviewRow label="Location choice" value={draft.locationMode === "gps" ? "Precise device location" : draft.locationMode === "approximate" ? `Approximate — ${draft.locationLabel || "area not specified"}` : `Manual — ${draft.locationLabel || "description not specified"}`} /><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Description</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{draft.description}</p>{draft.supportingDetails ? <><p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Supporting details</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{draft.supportingDetails}</p></> : null}</div><div className="rounded-xl border border-[#cbdc72] bg-[#f5f9dc] p-4"><div className="flex gap-3"><Sparkles size={19} className="mt-0.5 text-slate-800" /><div><p className="text-sm font-bold text-slate-900">AI-assisted analysis comes after submission</p><p className="mt-1 text-sm leading-6 text-slate-700">Simulated signals may suggest a category, extract structured details, flag possible similarity, or suggest review priority. They never determine truth, label anyone a liar, or reject a report.</p></div></div></div></div></div>; }
function ReviewRow({ label, value }: { label: string; value: string }) { return <div className="flex flex-col gap-1 rounded-xl border border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span><span className="text-sm font-semibold text-slate-800 sm:text-right">{value}</span></div>; }

function Submitted({ result, onCopy, onRetrieve, onReset }: { result: Awaited<ReturnType<typeof submitAnonymousReport>>; onCopy: () => void; onRetrieve: () => void; onReset: () => void }) { return <main className="min-h-[calc(100vh-81px)] bg-[#f5f5ef] px-5 py-12 lg:px-10 lg:py-20"><div className="mx-auto max-w-3xl"><div className="text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#d8f06b] text-slate-950"><Check size={30} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Saved to Clearline</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">Your report is recorded.</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">This is confirmation that the application stored your report. It has not been sent to a police authority, and this project does not guarantee a response.</p></div><div className="mt-10 rounded-2xl bg-[#10242c] p-6 text-white shadow-xl shadow-slate-900/10 sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d8f06b]">Private access code</p><p className="mt-3 font-mono text-3xl font-bold tracking-[0.16em] text-white">{result.retrievalCode}</p></div><button type="button" onClick={onCopy} className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Copy access code" title="Copy access code"><Clipboard size={18} /></button></div><p className="mt-5 max-w-lg text-sm leading-6 text-white/55">Save this code somewhere private. It is the only way to return to this report; there is no identity-based recovery if it is lost.</p></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">AI assistance</p><p className="mt-3 font-display text-xl font-semibold text-slate-950">Suggestions ready for review</p><p className="mt-2 text-sm leading-6 text-slate-500">Classification, extracted context, similarity, and priority are advisory signals only.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Retention note</p><p className="mt-3 font-display text-xl font-semibold text-slate-950">Designed for limited storage</p><p className="mt-2 text-sm leading-6 text-slate-500">This foundation marks reports for removal after {new Date(result.retentionUntil).toLocaleDateString()}.</p></div></div><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><button type="button" onClick={onRetrieve} className={primaryButton}>View my report <Search size={16} /></button><button type="button" onClick={onReset} className={secondaryButton}>Start a new report</button></div></div></main>; }

function Retrieve({ code, error, onChange, onSubmit, onBack }: { code: string; error: string; onChange: (value: string) => void; onSubmit: (event: React.FormEvent) => void; onBack: () => void }) { return <main className="min-h-[calc(100vh-81px)] bg-[#f5f5ef] px-5 py-12 lg:px-10 lg:py-20"><div className="mx-auto max-w-xl"><button type="button" onClick={onBack} className="mb-10 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"><ArrowLeft size={16} />Back home</button><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-[#d8f06b]"><Search size={20} /></span><p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Private access</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">Find your report.</h1><p className="mt-4 text-sm leading-6 text-slate-500">Enter the one-time access code shown after submission. It is not an identity check, and it cannot be recovered if lost.</p><form onSubmit={onSubmit} className="mt-8"><label className="text-sm font-semibold text-slate-800">Access code<input autoComplete="off" value={code} onChange={(event) => onChange(event.target.value.replace(/[^a-z0-9-]/gi, "").slice(0, 14))} className={`${fieldClass} font-mono uppercase tracking-[0.16em]`} placeholder="ABCD-1234-WXYZ" maxLength={14} /></label>{error ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}<button type="submit" disabled={code.length < 8} className={`${primaryButton} mt-6 w-full`}>View report <ArrowRight size={16} /></button></form></div><div className="mt-5 flex gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><AlertTriangle size={18} className="mt-0.5 shrink-0" /><p>For safety, the prototype does not provide identity-based recovery and does not promise complete anonymity or legal confidentiality.</p></div></div></main>; }
function RetrievedReport({ report, onBack }: { report: Extract<Awaited<ReturnType<typeof retrieveAnonymousReport>>, { found: true }>["report"]; onBack: () => void }) { const analysis = report.analysis as { priority?: { suggestion?: string }; classification?: { label?: string }; human_review_required?: boolean }; return <main className="min-h-[calc(100vh-81px)] bg-[#f5f5ef] px-5 py-12 lg:px-10 lg:py-16"><div className="mx-auto max-w-4xl"><button type="button" onClick={onBack} className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"><ArrowLeft size={16} />Back home</button><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Private report view</p><h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-slate-950">Report status</h1></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800"><span className="h-1.5 w-1.5 rounded-full bg-amber-600" />Human review pending</span></div><div className="mt-9 grid gap-4 md:grid-cols-3"><ReviewRow label="Category" value={report.category.replaceAll("-", " ")} /><ReviewRow label="When" value={report.incidentDate} /><ReviewRow label="Location" value={report.locationLabel || report.locationMode} /></div><div className="mt-5 grid gap-5 md:grid-cols-[1.2fr_.8fr]"><div className="rounded-2xl border border-slate-200 bg-white p-6"><p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Activity</p><div className="mt-6 space-y-6"><TimelineItem done title="Report received" text="Saved to the Clearline student-project database." /><TimelineItem done title="AI signals prepared" text={`${analysis.classification?.label ?? "Incident classification"} · ${analysis.priority?.suggestion ?? "Priority suggestion"}`} /><TimelineItem title="Human review" text="A reviewer would consider the signals, context, and local process." /></div></div><div className="rounded-2xl bg-[#10242c] p-6 text-white"><div className="flex items-center gap-2 text-[#d8f06b]"><Sparkles size={18} /><p className="text-sm font-semibold">Assistance, not judgment</p></div><p className="mt-5 text-sm leading-6 text-white/60">{analysis.human_review_required ? "All AI-generated results are suggestions for a human reviewer. They never determine truth or automatically reject a report." : "AI signals are advisory only."}</p><div className="mt-7 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">Retention is limited. This record is marked for removal after {new Date(report.retentionUntil).toLocaleDateString()}.</div></div></div></div></main>; }
function TimelineItem({ done, title, text }: { done?: boolean; title: string; text: string }) { return <div className="relative flex gap-4"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>{done ? <Check size={15} /> : <span className="h-2 w-2 rounded-full bg-current" />}</span><div><p className="text-sm font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></div>; }

function PrivacyModal({ onClose }: { onClose: () => void }) { return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-6"><div role="dialog" aria-modal="true" aria-labelledby="privacy-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-[#f5f5ef] p-6 sm:rounded-2xl sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Clearline notes</p><h2 id="privacy-title" className="mt-3 font-display text-3xl font-semibold tracking-tight text-slate-950">Privacy, safety, and limits.</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-950" aria-label="Close privacy notes"><X size={19} /></button></div><div className="mt-8 grid gap-4 sm:grid-cols-2"><PrivacyItem icon={<Fingerprint size={18} />} title="What this asks for" text="The prototype does not request or store your name, email, phone number, account identity, or password." /><PrivacyItem icon={<MapPin size={18} />} title="Location is your choice" text="You decide whether to share precise GPS, an approximate area, or a manual description. Location is not requested automatically." /><PrivacyItem icon={<Sparkles size={18} />} title="AI is advisory" text="Mock AI results can organize details and suggest priority or similarity. They never decide whether a report is true or fake and never reject one." /><PrivacyItem icon={<Radio size={18} />} title="Not an emergency service" text="If someone is in immediate danger, contact your local emergency services. Clearline does not promise a rapid response or police follow-up." /></div><div className="mt-6 rounded-xl bg-amber-50 p-5 text-sm leading-6 text-amber-950"><p className="font-bold">Anonymity has limits.</p><p className="mt-2">This foundation avoids direct identity information, but it does not guarantee anonymity, untraceability, or legal confidentiality. A production system would additionally need protections against network and metadata-based identification.</p></div><div className="mt-6 rounded-xl bg-white p-5 text-sm leading-6 text-slate-600"><p className="font-bold text-slate-900">Jurisdiction and retention</p><p className="mt-2">This student project does not connect to a real police authority. A production version would need to define which jurisdiction receives a report, who can access it, how long it is retained, and how review decisions are audited.</p></div><button type="button" onClick={onClose} className={`${primaryButton} mt-8 w-full`}>I understand <Check size={16} /></button></div></div>; }
function PrivacyItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-xl border border-slate-200 bg-white p-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-[#d8f06b]">{icon}</span><p className="mt-4 text-sm font-bold text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></div>; }