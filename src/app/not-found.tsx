import NotFoundContent from "@/components/layout/not-found-content";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <main id="main-content" className="flex-1">
        <NotFoundContent />
      </main>
    </div>
  );
}
