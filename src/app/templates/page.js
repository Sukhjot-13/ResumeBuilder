import Link from "next/link";

const TEMPLATES = [
  {
    name: "Professional",
    description:
      "Centered header, bold uppercase section titles with a double border, and cleanly organized sections. A safe, polished choice for corporate roles.",
    tag: "Most Popular",
  },
  {
    name: "Modern",
    description:
      "Two-column layout with a dark sidebar for skills and contact info, keeping your experience front and center. Great for tech and design roles.",
    tag: "Two-Column",
  },
  {
    name: "Classic",
    description:
      "Traditional single-column layout in Helvetica with time-tested section ordering. Trusted by conservative industries like finance, law, and government.",
    tag: "Traditional",
  },
  {
    name: "Classic 2",
    description:
      "A variant of our Classic template with an alternate section order — skills appear earlier for recruiters who scan quickly.",
    tag: "Traditional",
  },
  {
    name: "Creative",
    description:
      "Serif aesthetics with a centered layout and bordered container. Designed to be memorable while staying fully ATS-parseable.",
    tag: "Distinctive",
  },
  {
    name: "Simple",
    description:
      "Minimal styling with no borders or background colors and dash-style bullets. Maximum readability for any applicant tracking system.",
    tag: "Minimal",
  },
];

export default function TemplatesPage() {
  return (
    <div className="min-h-screen">
      <section className="relative pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 -z-10" />
        <div className="container mx-auto px-6 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            ATS-Friendly <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Resume Templates</span>
          </h1>
          <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Every template is built to pass applicant tracking systems while still looking
            great to human recruiters. Pick one when you download your resume — switch anytime.
          </p>
        </div>
      </section>

      <section className="pb-24">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {TEMPLATES.map((t) => (
              <div key={t.name} className="glass-card p-8 rounded-2xl hover:bg-white/5 transition-colors flex flex-col">
                <span className="inline-block self-start px-3 py-1 mb-4 text-xs font-medium text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  {t.tag}
                </span>
                <h2 className="text-xl font-bold mb-3">{t.name}</h2>
                <p className="text-slate-400 leading-relaxed flex-1">{t.description}</p>
              </div>
            ))}
          </div>

          <div className="glass-card rounded-3xl p-12 mt-16 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/10 to-violet-600/10 -z-10" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Try Them All With Your Resume</h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Generate your AI-tailored resume once, then preview and export it in any template.
            </p>
            <Link
              href="/login"
              className="inline-block px-8 py-4 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
