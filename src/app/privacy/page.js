export const metadata = {
  title: "Privacy Policy — ResumeAI",
  description: "How ResumeAI collects, uses, and protects your data.",
};

const SECTIONS = [
  {
    heading: "Information We Collect",
    body: [
      "Account information: your email address, name, and date of birth, used to create and identify your account. We sign you in with one-time passcodes sent to your email, so we never store passwords.",
      "Resume data: the resume content you upload, paste, or edit (including AI-generated tailored resumes and cover letters), stored so you can access and reuse them.",
      "Usage and billing data: credit usage for AI features and, if you subscribe, payment-related records processed by Stripe. We never see or store your full card details.",
    ],
  },
  {
    heading: "How We Use Your Information",
    body: [
      "To provide the service: generating, tailoring, storing, and exporting your resumes and cover letters.",
      "To authenticate you: sending one-time login codes to your email address.",
      "To manage your subscription: processing payments through Stripe and tracking your plan credits.",
      "We do not sell your personal information or your resume content to third parties.",
    ],
  },
  {
    heading: "AI Processing",
    body: [
      "When you generate or edit a resume or cover letter, your content is sent to our AI provider solely to produce your requested output. It is not used to train models by us, and we only send the content needed for the task.",
    ],
  },
  {
    heading: "Data Sharing",
    body: [
      "We share data only with service providers necessary to operate ResumeAI: our database host (MongoDB Atlas), email delivery (Brevo), payments (Stripe), and our AI provider. Each processes data on our behalf under their own security commitments.",
    ],
  },
  {
    heading: "Data Retention & Deletion",
    body: [
      "Your resumes, cover letters, and account details are retained while your account is active. You may request account deletion at any time; deleting your account removes your profile and stored documents from our production systems.",
    ],
  },
  {
    heading: "Security",
    body: [
      "Sessions are protected with short-lived signed tokens in HttpOnly cookies, refresh-token rotation, and encrypted transport. Sensitive platform credentials, where applicable, are encrypted at rest.",
    ],
  },
  {
    heading: "Contact",
    body: [
      `Questions about this policy? Contact us at support@resumeai.app.`,
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen py-20">
      <div className="container mx-auto px-6 max-w-3xl">
        <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-slate-500 text-sm mb-10">Last updated: August 21, 2026</p>

        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="text-xl font-bold mb-3 text-white">{s.heading}</h2>
              <div className="space-y-3">
                {s.body.map((p, i) => (
                  <p key={i} className="text-slate-400 leading-relaxed">{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
