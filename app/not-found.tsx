import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-3xl font-bold">Page not found</h1>
        <Link href="/" className="btn-primary mt-4">Go home</Link>
      </div>
    </div>
  );
}
