import Header from "@/components/layout/Header";
import HomeShell from "@/components/home/HomeShell";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pb-40 page-top">
        <HomeShell />
      </main>
    </div>
  );
}
