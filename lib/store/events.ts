/**
 * "Something was saved" notifications, so open documents can react in real
 * time — e.g. a letter linked to a CV re-writes itself when the CV changes,
 * even when the CV is open in another tab.
 */
export type ChangeEvent = { type: 'document' | 'project'; id: string };

const NAME = 'cv-engine-changes';
let channel: BroadcastChannel | null = null;
const getChannel = () => {
  if (typeof BroadcastChannel === 'undefined') return null;
  channel ??= new BroadcastChannel(NAME);
  return channel;
};

export function notifyChange(e: ChangeEvent) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<ChangeEvent>(NAME, { detail: e })); // same tab
  getChannel()?.postMessage(e); // other tabs
}

export function onChange(cb: (e: ChangeEvent) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const local = (ev: Event) => cb((ev as CustomEvent<ChangeEvent>).detail);
  const remote = new (typeof BroadcastChannel === 'undefined' ? class { onmessage: unknown = null; close() {} } : BroadcastChannel)(NAME) as BroadcastChannel;
  remote.onmessage = (ev: MessageEvent<ChangeEvent>) => cb(ev.data);
  window.addEventListener(NAME, local);
  return () => {
    window.removeEventListener(NAME, local);
    remote.close();
  };
}
