import type { Selection } from './requests';
import { designById } from './designs';
import { cloudEnabled } from './store';
import { supabase } from './store/supabase';
import { selectionImportUrl } from './requests';

/**
 * Delivers a client's template choice to the admin, using every route this
 * deployment has: Supabase (saved online, shows up in the admin inbox) and/or
 * Web3Forms (emailed to the admin). Returns which routes succeeded; the client
 * page always also offers a one-click email as a fallback.
 */
export async function submitSelection(sel: Selection): Promise<{ saved: boolean; emailed: boolean }> {
  const result = { saved: false, emailed: false };
  if (cloudEnabled) {
    const { error } = await supabase().from('template_selections').insert({
      request_id: sel.requestId,
      design_id: sel.designId,
      client_name: sel.name,
      client_email: sel.email,
      client_phone: sel.phone,
      notes: sel.notes,
    });
    result.saved = !error;
  }
  const key = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
  if (key) {
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: key,
          subject: `CV template chosen: ${designById(sel.designId).name} — ${sel.name || 'client'}`,
          from_name: 'CV Engine',
          name: sel.name,
          email: sel.email || undefined,
          phone: sel.phone,
          template: `${designById(sel.designId).name} (${sel.designId})`,
          notes: sel.notes,
          import_link: selectionImportUrl(sel),
        }),
      });
      result.emailed = res.ok && ((await res.json()) as { success?: boolean }).success === true;
    } catch {
      result.emailed = false;
    }
  }
  return result;
}
