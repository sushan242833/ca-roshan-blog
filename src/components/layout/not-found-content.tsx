import Link from "next/link";

export default function NotFoundContent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <p className="font-serif text-6xl font-bold leading-none text-brand-teal md:text-7xl">
          404
        </p>
        <div className="mx-auto my-6 h-0.5 w-12 bg-brand-teal" />
        <h1 className="font-serif text-3xl font-bold text-brand-navy md:text-4xl">
          This page could not be found
        </h1>
        <p className="mx-auto mt-4 max-w-md text-gray-600">
          The article or page you are looking for may have been moved, renamed,
          or never existed.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/blogs"
            className="inline-flex items-center justify-center rounded-md bg-brand-teal px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-navy"
          >
            Browse all articles
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-brand-teal px-6 py-2.5 text-sm font-semibold text-brand-teal transition-colors hover:bg-brand-teal hover:text-white"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
