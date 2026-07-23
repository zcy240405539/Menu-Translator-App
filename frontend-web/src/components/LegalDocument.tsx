import Link from "next/link";

const SUPPORT_EMAIL = "support@agentscottystudio.com";
const ACCOUNT_DELETION_MAILTO =
  `mailto:${SUPPORT_EMAIL}?subject=AI%20Menu%20APP%20Account%20Deletion%20Request` +
  "&body=Please%20delete%20my%20AI%20Menu%20APP%20account.%0A%0ARegistered%20email%3A%20%0AUsername%20if%20known%3A%20%0A";

type LegalSection = {
  heading: string;
  items: string[];
};

type LegalDocumentProps = {
  kind: "privacy" | "account-deletion";
};

const privacySections: LegalSection[] = [
  {
    heading: "Information we collect",
    items: [
      "Account information, such as username, email address, optional phone number, and authentication identifiers.",
      "Profile preferences, such as dietary preferences, allergies, budget, and taste preferences when users choose to provide them.",
      "User-provided menu content, including menu photos, PDFs, documents, text, webpages, and delivery app share links.",
      "Generated menu results, including translated dish names, descriptions, ingredients, allergens, prices, menu history, and order list items.",
      "Technical data such as app interactions, diagnostics, device or advertising identifiers, and network request metadata.",
    ],
  },
  {
    heading: "How we use information",
    items: [
      "To provide menu OCR, translation, dish explanation, image matching, and AI recommendation features.",
      "To save account profiles, menu history, and order list data for signed-in users.",
      "To improve reliability, prevent abuse, debug errors, and maintain app security.",
      "To show advertising and measure ad performance where ads are enabled.",
      "To respond to support, account deletion, and privacy requests.",
    ],
  },
  {
    heading: "Third-party services",
    items: [
      "The app may process data through service providers used for hosting, database storage, authentication, AI model processing, image retrieval, analytics, and advertising.",
      "These providers may include Render, Supabase, OpenRouter, OpenAI, Google AdSense, Google AdMob, Pexels, Unsplash, and Wikimedia Commons depending on enabled features.",
    ],
  },
  {
    heading: "Your choices",
    items: [
      "You can avoid signing in and use supported features without an account where available.",
      "You can request account deletion at /account-deletion.",
      "You can contact us for privacy questions or deletion requests.",
    ],
  },
];

const deletionSections: LegalSection[] = [
  {
    heading: "How to request deletion",
    items: [
      "Send the request from the email address registered with your account.",
      "Include your registered email and username if available.",
      "We will verify the request and process account deletion.",
    ],
  },
  {
    heading: "Data deleted",
    items: [
      "Account profile data, authentication account, avatar, saved menu history, profile preferences, and saved order list data associated with the account will be deleted where technically feasible.",
    ],
  },
  {
    heading: "Data that may be retained",
    items: [
      "We may retain security logs, transaction records required by law, and anonymized or non-user-linked menu, dish, and image cache data that is no longer associated with your account.",
    ],
  },
];

export function LegalDocument({ kind }: LegalDocumentProps) {
  const isDeletion = kind === "account-deletion";
  const title = isDeletion ? "Delete your AnyMenu account" : "Privacy Policy";
  const subtitle = isDeletion
    ? "Request deletion of your account and associated account data."
    : "AnyMenu - Last updated: June 10, 2026";
  const sections = isDeletion ? deletionSections : privacySections;

  return (
    <main className="min-h-screen bg-[#fbf8f4] px-4 py-10">
      <article className="mx-auto max-w-4xl rounded-3xl border border-purple-100 bg-white p-6 shadow-sm md:p-10">
        <Link href="/" className="mb-8 inline-flex text-sm font-semibold text-purple-700 hover:text-purple-800">
          Back to AnyMenu
        </Link>
        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-purple-700">AnyMenu</p>
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-950">{title}</h1>
        <p className="mt-3 text-lg text-gray-600">{subtitle}</p>

        {isDeletion ? (
          <a
            href={ACCOUNT_DELETION_MAILTO}
            className="mt-8 inline-flex rounded-full bg-purple-700 px-5 py-3 font-bold text-white transition-colors hover:bg-purple-800"
          >
            Email account deletion request
          </a>
        ) : (
          <p className="mt-8 text-base leading-7 text-gray-700">
            AnyMenu helps users translate and understand restaurant menus from photos, files, documents, and menu links.
            This Privacy Policy explains what information we collect, how we use it, and the choices available to users.
          </p>
        )}

        <div className="mt-8 space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-2xl font-bold text-gray-950">{section.heading}</h2>
              <ul className="mt-4 space-y-3">
                {section.items.map((item) => (
                  <li key={item} className="flex gap-3 text-base leading-7 text-gray-700">
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-600" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <p className="mt-10 text-base text-gray-600">
          Contact:{" "}
          <a className="font-semibold text-purple-700 hover:text-purple-800" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </article>
    </main>
  );
}
