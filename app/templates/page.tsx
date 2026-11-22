'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { useAuth } from '@/components/AuthProvider';
import DesignGallery from '@/components/cv/DesignGallery';
import CvRenderer, { PAGE } from '@/components/cv/CvRenderer';
import ScaledSheet from '@/components/ScaledSheet';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { DESIGN_COUNT, FAMILIES, designById } from '@/lib/designs';
import { REGION_RULES, sampleCv } from '@/lib/cv-model';
import { newDocument, newProject, docHref } from '@/lib/projects';
import type { Region } from '@/lib/types';

function Gallery() {
  const params = useSearchParams();
  const [preview, setPreview] = useState<string | null>(params.get('design'));
  const { user, repo } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const design = preview ? designById(preview) : null;
  const region: Region = design?.family.regions?.[0] ?? 'international';
  const cv = sampleCv(region);
  if (design) cv.design = { ...cv.design, designId: design.id, pageSize: REGION_RULES[region].pageSize, dateFormat: REGION_RULES[region].dateFormat };

  const use = async () => {
    if (!design) return;
    if (!user || !repo) return router.push(`/login?mode=signup&next=${encodeURIComponent(`/templates?design=${design.id}`)}`);
    const project = await repo.saveProject(newProject(user.id, { name: `My CV — ${design.family.name}`, region }));
    const data = sampleCv(region);
    data.design = { ...data.design, designId: design.id, pageSize: REGION_RULES[region].pageSize };
    const doc = await repo.saveDocument(newDocument(project, 'cv', `CV — ${design.name}`, data));
    toast('Created a project with a sample CV in this design — replace the sample text with yours.', 'success');
    router.push(docHref(doc));
  };

  return (
    <div className="container-app py-10">
      <h1 className="font-display text-3xl font-bold">{DESIGN_COUNT} professional CV designs</h1>
      <p className="mt-2 max-w-3xl text-ink-soft">
        {FAMILIES.length} layout families — ATS-optimized, modern, executive, creative, academic, Europass and Canadian — each in a curated set of colours. Every design reads in a linear order with real text, so it is safe for applicant tracking systems; designs marked <span className="chip bg-emerald-50 text-emerald-700">ATS</span> use a single reading column for maximum compatibility.
      </p>
      <div className="mt-8">
        <DesignGallery cv={sampleCv()} onSelect={setPreview} selected={preview ?? undefined} thumbWidth={200} initialCategory="all" />
      </div>
      <Modal open={Boolean(design)} onClose={() => setPreview(null)} title={design?.name ?? ''} wide footer={<><button className="btn-secondary" onClick={() => setPreview(null)}>Close</button><button className="btn-primary" onClick={use}>Use this design</button></>}>
        {design && (
          <div>
            <p className="mb-3 text-sm text-ink-soft">{design.family.description}</p>
            <ScaledSheet width={PAGE[cv.design.pageSize].width} pageHeight={PAGE[cv.design.pageSize].height}>
              <CvRenderer cv={cv} region={region} links={false} />
            </ScaledSheet>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <AppShell>
      <Suspense>
        <Gallery />
      </Suspense>
    </AppShell>
  );
}
