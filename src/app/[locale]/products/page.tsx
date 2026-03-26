import Header from "@/components/layout/Header";

// TEMP: 업데이트 준비 중 — 원래 내용은 git history에 보존됨 (복구 시 "원래대로 돌려줘" 하면 됨)
export default async function ProductsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="flex flex-col items-center justify-center" style={{ minHeight: "70vh" }}>
        <p className="text-xs font-semibold tracking-widest uppercase text-[var(--purple)] mb-4 opacity-70">
          OpenResearch Products
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-3 text-[var(--foreground)]">
          업데이트 준비 중
        </h1>
        <p className="text-sm text-[var(--text-tertiary)]">곧 더 나은 모습으로 돌아올게요.</p>
      </main>
    </div>
  );
}
