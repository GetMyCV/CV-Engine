import AppShell from '@/components/AppShell';
import { SECTIONS, REGION_RULES } from '@/lib/cv-model';
import { REGIONS } from '@/lib/types';
import { ACTION_VERBS } from '@/lib/ats/vocab';

export const metadata = { title: 'CV guide — every section of a professional CV' };

export default function GuidePage() {
  return (
    <AppShell>
      <div className="container-app py-10">
        <h1 className="font-display text-3xl font-bold">The professional CV guide</h1>
        <p className="mt-2 max-w-2xl text-ink-soft">Every section a professional CV can include, when to use it, and how the rules change by country. CV Engine’s editor, ATS score and region presets follow this guide.</p>

        <h2 className="mt-10 font-display text-2xl font-bold">Sections of a professional CV</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-ink-mute">
              <tr><th className="px-4 py-3">Section</th><th className="px-4 py-3">Importance</th><th className="px-4 py-3">ATS-recognised headings</th><th className="px-4 py-3">How to write it</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-semibold">Contact header</td>
                <td className="px-4 py-3"><span className="chip bg-emerald-100 text-emerald-700">Essential</span></td>
                <td className="px-4 py-3 text-ink-mute">—</td>
                <td className="px-4 py-3 text-ink-soft">Full name, target job title, email, phone (with country code), city & country, LinkedIn, portfolio/GitHub. In the body of the document, never in a Word header/footer.</td>
              </tr>
              {SECTIONS.map((s) => (
                <tr key={s.key}>
                  <td className="px-4 py-3 font-semibold">{s.title}</td>
                  <td className="px-4 py-3"><span className={`chip ${s.importance === 'essential' ? 'bg-emerald-100 text-emerald-700' : s.importance === 'recommended' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>{s.importance}</span>{s.expectedIn && <div className="mt-1 text-[11px] text-ink-mute">Expected in: {s.expectedIn.join(', ')}</div>}</td>
                  <td className="px-4 py-3 text-xs text-ink-mute">{s.atsTitles.join(' · ')}</td>
                  <td className="px-4 py-3 text-ink-soft">{s.guidance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold">CV standards by country</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {REGIONS.map((r) => {
            const rules = REGION_RULES[r.id];
            return (
              <div key={r.id} className="card p-5">
                <h3 className="font-semibold">{r.label}</h3>
                <p className="text-xs text-ink-mute">{r.hint}</p>
                <dl className="mt-3 grid grid-cols-2 gap-1 text-xs">
                  <dt className="text-ink-mute">Max pages</dt><dd>{rules.maxPages > 5 ? 'No limit' : rules.maxPages}</dd>
                  <dt className="text-ink-mute">Photo</dt><dd className="capitalize">{rules.photo}</dd>
                  <dt className="text-ink-mute">Personal data</dt><dd className="capitalize">{rules.personalData}</dd>
                  <dt className="text-ink-mute">Paper</dt><dd>{rules.pageSize}</dd>
                </dl>
                <ul className="mt-3 space-y-1 text-xs text-ink-soft">{rules.notes.map((n) => <li key={n}>• {n}</li>)}</ul>
              </div>
            );
          })}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold">Action verbs for bullet points</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(ACTION_VERBS).map(([g, verbs]) => (
            <div key={g} className="card p-5">
              <h3 className="font-semibold">{g}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{[...new Set(verbs)].join(', ')}</p>
            </div>
          ))}
        </div>

        <h2 className="mt-12 font-display text-2xl font-bold">The bullet-point formula</h2>
        <div className="card mt-4 p-6 text-sm text-ink-soft">
          <p><b>Action verb</b> + <b>what you did</b> + <b>how / with what</b> + <b>measurable result</b>.</p>
          <ul className="mt-3 space-y-2">
            <li>✗ <span className="line-through">Responsible for the company’s social media accounts.</span></li>
            <li>✓ Grew Instagram following from 4k to 26k in 12 months by launching a weekly creator series, lifting web traffic from social by 140%.</li>
            <li>✗ <span className="line-through">Helped with month-end reporting.</span></li>
            <li>✓ Cut month-end close from 8 to 5 days by automating 12 reconciliations in Excel Power Query.</li>
          </ul>
        </div>
      </div>
    </AppShell>
  );
}
