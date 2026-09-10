import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 px-5 py-24">
      <p className="font-mono text-xs tracking-wide text-coral uppercase">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Nothing here.</h1>
      <p className="text-sm leading-6 text-dim">
        That page does not exist. If you were looking for a profile, the person may not have
        published a wrapped yet.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-lg border border-edge px-4 py-2 text-sm text-dim transition-colors hover:border-coral hover:text-coral"
      >
        Back to the start
      </Link>
    </div>
  );
}
