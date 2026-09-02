# Anonymous police reporting prototype

## Goal

Replace the starter screen with a polished, safety-first prototype for submitting an anonymous police report. The prototype will demonstrate the complete reporter journey without claiming to send a real report, identify a real person, or make a real AI fraud decision.

## Experience

1. **Start screen**
   - Present the product as a calm, trustworthy reporting service.
   - Put the emergency warning, jurisdiction notice, and privacy promise in the first viewport.
   - Let the user begin a report or open the private access-code lookup view.

2. **Report flow**
   - Multi-step form for incident category, when/where it happened, description, optional supporting details, and contact preference.
   - Client-side validation, character limits, visible progress, and review-before-submit.
   - Location step offers two explicit choices: precise browser GPS opt-in or approximate area/manual entry. Explain what is captured and show the selected value before continuing.
   - Never ask for name, email, phone number, or other direct identity fields.

3. **AI review preview**
   - After review, show a transparent “AI-assisted screening” state with a non-final signal such as “Needs human review.”
   - Explain that AI can flag inconsistencies or spam-like patterns, but cannot determine that a report is fake and never auto-rejects a report.
   - Keep the language supportive and avoid discouraging legitimate reporting.

4. **Submission result**
   - Show a clear prototype-only confirmation, a generated one-time access code, and a copy control.
   - Explain that the code is the only way to return to the report in this anonymous model and should be stored privately.
   - Provide a “View my report” path that accepts the code and shows a redacted status timeline, location-sharing choice, review status, and retention note.

5. **Privacy and safety surfaces**
   - Include a dedicated privacy/safety panel or modal explaining anonymity limits, location handling, retention, human review, jurisdiction routing, and the difference between a report and an emergency call.
   - Include a reset/clear prototype action so a new report can be started without carrying over prior form state.

## Visual direction

Use a composed public-service interface: deep ink background, warm paper surfaces, high-visibility safety yellow for warnings, and restrained signal blue/green for progress and positive states. Use a distinctive editorial sans-serif pairing, generous whitespace, crisp borders, subtle motion between steps, and no decorative gradients or generic dashboard clutter. Make the report form the primary experience on desktop and mobile.

## Technical details

- Rewrite `src/routes/index.tsx` as the prototype app; keep the initial experience at `/`.
- Update shared root metadata and add route-specific metadata for the home route; remove starter “Lovable App” placeholder copy.
- Use existing React, TanStack Router, Tailwind tokens, Lucide icons, and existing project dependencies; do not add backend or external service dependencies.
- Keep the prototype state in React memory only. Do not use localStorage, sessionStorage, or any real report persistence.
- Request browser geolocation only from an explicit user action, handle denied/unavailable states, and provide the approximate/manual fallback. Do not read browser APIs during SSR or initial render.
- Generate a clearly labeled demo access code in an event handler; never treat it as secure authentication.
- Validate all form inputs client-side with bounded lengths and safe enum values. Since this is a front-end prototype, show the server-validation boundary in the UI copy rather than implying the data is production-ready.
- Use semantic form controls, accessible labels, keyboard-visible focus, status announcements, responsive layouts, reduced-motion support, and no sensitive data in logs.

## Out of scope for this prototype

- Real police submission, police staff portal, accounts, databases, storage, authentication, or audit logs.
- Real AI model calls or a real fake-report classifier.
- Promises of untraceability, legal confidentiality, guaranteed anonymity, emergency response, or guaranteed police follow-up.