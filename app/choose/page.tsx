'use client';
import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DesignGallery from '@/components/cv/DesignGallery';
import DesignThumb from '@/components/cv/DesignThumb';
import CvRenderer, { PAGE } from '@/components/cv/CvRenderer';
import ScaledSheet from '@/components/ScaledSheet';
import Modal from '@/components/ui/Modal';
import { TextArea, TextInput } from '@/components/ui/fields';
import { sampleCv } from '@/lib/cv-model';
import { designById } from '@/lib/designs';
import { decodeRequestLink, encodeSelection, selectionImportUrl, type Selection } from '@/lib/requests';
import { submitSelection } from '@/lib/submit-selection';
import { nowIso } from '@/lib/utils';

/**
 * The only page clients ever see: a template picker reached through a link the
 * administrator sends. No sign-in, no navigation, no other features.
 */
function Chooser() {
  const token = useSearchParams().get('r') ?? '';
  const link = useMemo(() => decodeRequestLink(token), [token]);
  const [preview, setPreview] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [name, setName] = useState(link?.name ?? '');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ sel: Selection; saved: boolean; emailed: boolean } | null>(null);
  const [copied, setCopied] = useState(false);

  // Thumbnails show a sample CV carrying the client's own name.
  const cv = useMemo(() => {
    const c = sampleCv();
    const [first, ...rest] = (link?.name || 'Your Name').split(' ');
    c.personal.firstName = first ?? '';
    c.personal.lastName = rest.join(' ');
    return c;
  }, [link?.name]);

  if (!link)
    return (
      <Shell>
        <div className="card mx-auto mt-16 max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold">This link is not valid</h1>
          <p className="mt-2 text-sm text-ink-mute">It may be incomplete. Please ask for a new template link.</p>
        </div>
      </Shell>
    );

  const submit = async () => {
    if (!chosen) return;
    setBusy(true);
    const sel: Selection = { requestId: link.id, designId: chosen, name: name.trim(), email: email.trim(), phone: phone.trim(), notes: notes.trim(), at: nowIso() };
    const res = await submitSelection(sel).catch(() => ({ saved: false, emailed: false }));
    setSent({ sel, ...res });
    setBusy(false);
  };

  if (sent) {
    const design = designById(sent.sel.designId);
    const delivered = sent.saved || sent.emailed;
    const mail = `mailto:${encodeURIComponent(link.admin)}?subject=${encodeURIComponent(`My CV template choice: ${design.name}`)}&body=${encodeURIComponent(
      `Hello,\n\nI have chosen the CV template "${design.name}".\n\nName: ${sent.sel.name}\nEmail: ${sent.sel.email}\nPhone: ${sent.sel.phone}\nNotes: ${sent.sel.notes}\n\nOpen my selection: ${selectionImportUrl(sent.sel)}\n`,
    )}`;
    return (
      <Shell>
        <div className="card mx-auto mt-10 max-w-2xl p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="mx-auto shrink-0 overflow-hidden rounded-lg shadow-sheet ring-1 ring-slate-200">
              <DesignThumb cv={cv} designId={design.id} width={170} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">{delivered ? 'Thank you — your choice is sent!' : 'One last step'}</h1>
              <p className="mt-2 text-ink-soft">
                You chose <b>{design.name}</b>.{' '}
                {delivered ? 'We will build your CV in this template and get back to you.' : 'Please tap the button below to send your choice by email.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href={mail} className={delivered ? 'btn-secondary' : 'btn-primary'}>
                  {delivered ? 'Also send by email' : 'Send my choice by email'}
                </a>
                <button
                  className="btn-ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(encodeSelection(sent.sel));
                      setCopied(true);
                    } catch {
                      /* clipboard unavailable */
                    }
                  }}
                >
                  {copied ? 'Copied ✓' : 'Copy selection code'}
                </button>
              </div>
              <button className="mt-6 text-sm font-semibold text-brand-600 hover:underline" onClick={() => setSent(null)}>
                ← Choose a different template
              </button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  const design = preview ? designById(preview) : null;
  return (
    <Shell>
      <div className="container-app py-8">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{link.name ? `Hi ${link.name.split(' ')[0]}, choose your CV template` : 'Choose your CV template'}</h1>
        {link.message && <p className="mt-3 max-w-3xl whitespace-pre-line rounded-xl bg-brand-50 p-4 text-sm text-brand-900">{link.message}</p>}
        <p className="mt-3 text-sm text-ink-mute">
          {link.designIds.length ? `${link.designIds.length} templates selected for you.` : 'Browse the designs below.'} Tap a template to preview it, then choose the one you like. The sample text shows the layout only — your CV will contain your own details.
        </p>
        <div className="mt-6">
          <DesignGallery cv={cv} onSelect={setPreview} selected={chosen ?? undefined} only={link.designIds} initialCategory={link.designIds.length ? 'all' : link.category} thumbWidth={190} />
        </div>
      </div>

      <Modal
        open={Boolean(design)}
        onClose={() => setPreview(null)}
        title={design?.name ?? ''}
        wide
        footer={
          <>
            <button className="btn-secondary" onClick={() => setPreview(null)}>Back to templates</button>
            <button
              className="btn-primary"
              onClick={() => {
                setChosen(preview);
                setPreview(null);
              }}
            >
              Choose this template
            </button>
          </>
        }
      >
        {design && (
          <div>
            <p className="mb-3 text-sm text-ink-soft">{design.family.description}</p>
            <ScaledSheet width={PAGE.A4.width} pageHeight={PAGE.A4.height}>
              <CvRenderer cv={{ ...cv, design: { ...cv.design, designId: design.id } }} links={false} />
            </ScaledSheet>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(chosen) && !preview}
        onClose={() => setChosen(null)}
        title="Send your choice"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setChosen(null)}>Change template</button>
            <button className="btn-primary" onClick={submit} disabled={busy || !name.trim() || (!email.trim() && !phone.trim())}>
              {busy ? 'Sending…' : 'Send my choice'}
            </button>
          </>
        }
      >
        {chosen && (
          <div className="flex flex-col gap-5 sm:flex-row">
            <div className="mx-auto shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200">
              <DesignThumb cv={cv} designId={chosen} width={140} />
            </div>
            <div className="flex-1 space-y-3">
              <p className="text-sm">
                Template: <b>{designById(chosen).name}</b>
              </p>
              <TextInput label="Your name" value={name} onChange={setName} autoComplete="name" />
              <TextInput label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
              <TextInput label="Phone / WhatsApp" type="tel" value={phone} onChange={setPhone} autoComplete="tel" hint="Email or phone is required so we can reach you." />
              <TextArea label="Anything we should know? (optional)" value={notes} onChange={setNotes} rows={3} placeholder="e.g. prefer a blue colour, need it by Friday…" />
            </div>
          </div>
        )}
      </Modal>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="container-app flex h-14 items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-sm text-white">CV</span>
          CV template selection
        </div>
      </header>
      {children}
    </div>
  );
}

export default function ChoosePage() {
  return (
    <Suspense>
      <Chooser />
    </Suspense>
  );
}
