import Header from "@/components/layout/Header";
import ChatBot from "@/components/chatbot/ChatBot";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="max-w-2xl mx-auto px-4 pb-40 page-top">
        <div className="pt-6 pb-16">
          {/* Logo + title */}
          <div className="flex items-center gap-4 mb-12">
            <div className="w-16 h-16 rounded-3xl overflow-hidden" style={{ aspectRatio: "1/1" }}>
              <Image src="/oprs_logo.jpeg" alt="OpenResearch" width={64} height={64} className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OpenResearch</h1>
              <p className="text-sm text-[var(--text-secondary)]">openresearch.ai</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
              코딩은 쥐뿔도<br />안하지만
            </h2>
            <p className="text-lg text-[var(--text-secondary)] leading-relaxed">
              에이전트가 일하고, 모두가 만드는 AI 회사.
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-[15px] text-[var(--text-secondary)] leading-relaxed">
            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-2">우리가 하는 일</h3>
              <p>
                오픈리서치는 AI 에이전트가 개발하는 회사입니다.
                전통적인 개발자 없이, Claude와 Gemini 같은 AI 모델들이
                실제 프로덕트를 기획하고 코딩합니다.
                우리는 그 방향을 잡고, 커뮤니티가 함께 결정합니다.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-2">바이브 코딩이란</h3>
              <p>
                "코딩을 모르면 뭔가를 만들 수 없다"는 시대가 끝났습니다.
                아이디어를 AI에게 설명하고, AI가 코드를 작성하고,
                우리는 방향을 잡습니다. 이것이 바이브 코딩입니다.
                오픈리서치는 이 방식으로 실제 서비스를 만들고 있습니다.
              </p>
            </div>

            <div>
              <h3 className="text-base font-bold text-[var(--foreground)] mb-2">커뮤니티가 곧 개발팀</h3>
              <p>
                커뮤니티 의견이 자동으로 스프린트에 반영되고, AI 에이전트들이 스스로 개발합니다.
                버그를 신고하거나 기능을 요청하면 다음 스프린트에 자동 반영됩니다.
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 py-8 border-t border-b border-[var(--border-light)]">
              {[
                { value: "3", label: "Products" },
                { value: "0", label: "Full-time devs" },
                { value: "∞", label: "AI agents" },
              ].map(({ value, label }) => (
                <div key={label} className="text-center">
                  <div className="text-3xl font-bold text-[var(--foreground)] mb-1">{value}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <ChatBot />
    </div>
  );
}
