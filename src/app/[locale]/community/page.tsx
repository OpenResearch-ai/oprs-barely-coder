import Header from "@/components/layout/Header";
import CommunityFeed from "@/components/home/CommunityFeed";
import ChatBot from "@/components/chatbot/ChatBot";

type Props = {
  searchParams: Promise<{ product?: string }>;
};

// URL param → filter value (must match STATIC_FILTERS value)
const PRODUCT_KEY: Record<string, string> = {
  "oo.ai":    "oo.ai",
  "o+talk":   "o talk",
  "o talk":   "o talk",
  "platform": "platform",
};

// Filter value → display label for page title
const PRODUCT_DISPLAY: Record<string, string> = {
  "oo.ai":    "oo.ai",
  "o talk":   "o talk",
  "platform": "openresearch.ai",
};

export default async function CommunityPage({ searchParams }: Props) {
  const { product } = await searchParams;

  // Raw filter key — passed to CommunityFeed for filter matching
  const productKey = product ? (PRODUCT_KEY[product] ?? null) : null;
  // Display label — shown in page title only
  const productDisplay = productKey ? (PRODUCT_DISPLAY[productKey] ?? productKey) : null;

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-6xl mx-auto px-4 pb-40 page-top">
        <CommunityFeed initialProduct={productKey} />
      </main>
      <ChatBot />
    </div>
  );
}
