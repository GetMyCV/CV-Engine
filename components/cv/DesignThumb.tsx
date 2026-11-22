import CvRenderer, { PAGE } from './CvRenderer';
import type { CvData, Region } from '@/lib/types';

/** A first-page thumbnail of a CV in a given design (pure CSS scaling, no measuring). */
export default function DesignThumb({ cv, designId, width = 220, region = 'international' }: { cv: CvData; designId: string; width?: number; region?: Region }) {
  const page = PAGE[cv.design.pageSize] ?? PAGE.A4;
  const scale = width / page.width;
  return (
    <div className="relative overflow-hidden bg-white" style={{ width, height: page.height * scale }} aria-hidden="true">
      <div style={{ width: page.width, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
        <CvRenderer cv={cv} designId={designId} links={false} region={region} />
      </div>
    </div>
  );
}
