import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

const USER_AGENTS = [
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  "Twitterbot/1.0",
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
];

interface PageMeta {
  title: string;
  description: string;
  siteName: string;
  imageUrl: string;
  videoUrl: string;
  text: string;
}

async function fetchPageMeta(url: string): Promise<PageMeta> {
  let html = "";

  for (const ua of USER_AGENTS) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
        },
        signal: AbortSignal.timeout(8000),
      });
      html = await res.text();
      if (html.length > 500) break;
    } catch { continue; }
  }

  const getOg = (prop: string) =>
    html.match(new RegExp(`property="og:${prop}"[^>]*content="([^"]*)"`))?.[1] ||
    html.match(new RegExp(`content="([^"]*)"[^>]*property="og:${prop}"`))?.[1] || "";

  const getMeta = (name: string) =>
    html.match(new RegExp(`name="${name}"[^>]*content="([^"]*)"`))?.[1] ||
    html.match(new RegExp(`content="([^"]*)"[^>]*name="${name}"`))?.[1] || "";

  const title = decode(getOg("title") || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() || "");
  const description = decode(getOg("description") || getMeta("description") || "");
  const siteName = decode(getOg("site_name") || new URL(url).hostname.replace("www.", ""));
  const imageUrl = decode(getOg("image") || getOg("image:secure_url") || "");
  const videoUrl = decode(getOg("video") || getOg("video:url") || "");

  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1500);

  return { title, description, siteName, imageUrl, videoUrl, text };
}

function decode(str: string): string {
  return str
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

// ── YouTube oEmbed + 썸네일 분석 ────────────────────────────────
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchYouTubeMeta(url: string): Promise<PageMeta | null> {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  try {
    // oEmbed API로 제목/채널 가져오기
    const oEmbedRes = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!oEmbedRes.ok) return null;
    const oEmbed = await oEmbedRes.json();

    return {
      title: oEmbed.title ?? "",
      description: `${oEmbed.author_name} 채널`,
      siteName: "YouTube",
      imageUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      videoUrl: url,
      text: oEmbed.title ?? "",
    };
  } catch { return null; }
}

// ── Gemini multimodal image analysis ──────────────────────────
async function analyzeImage(imageUrl: string, context: string): Promise<string> {
  if (!imageUrl) return "";
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { "User-Agent": "facebookexternalhit/1.1" },
      signal: AbortSignal.timeout(10000),
    });
    if (!imgRes.ok) return "";

    const buffer = await imgRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = (imgRes.headers.get("content-type") ?? "image/jpeg").split(";")[0];

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: { mimeType, data: base64 }
          },
          {
            text: `이 이미지를 분석해주세요. 컨텍스트: ${context || "(없음)"}

한국어로 핵심만 개조식으로 설명. ~함. ~임. ~있음. 스타일 사용.
- 무엇이 보이는지
- 텍스트/글자 내용 (있으면)
- 핵심 메시지`
          }
        ]
      }],
      config: { maxOutputTokens: 400 },
    });

    return response.text ?? "";
  } catch (err) {
    console.error("Image analysis error:", err);
    return "";
  }
}

// ── Main handler ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { url, category, product } = await req.json();
  if (!url) return Response.json({ error: "URL required" }, { status: 400 });

  const categoryHint = category && category !== "community"
    ? `사용자가 선택한 카테고리: ${category}`
    : product
    ? `사용자가 선택한 작품: ${product}`
    : "사용자가 선택한 카테고리: 없음 (AI가 적절히 판단)";

  try {
    // YouTube URL은 전용 파서로 처리
    const ytMeta = await fetchYouTubeMeta(url);
    const meta = ytMeta ?? await fetchPageMeta(url);

    // Analyze image/video thumbnail with Gemini multimodal
    const mediaUrl = meta.imageUrl || meta.videoUrl;
    const imageAnalysis = mediaUrl
      ? await analyzeImage(mediaUrl, `${meta.title} ${meta.description}`)
      : "";

    // Build combined context for final summary
    const context = [
      meta.title && `제목: ${meta.title}`,
      meta.description && `설명: ${meta.description}`,
      imageAnalysis && `이미지 분석: ${imageAnalysis}`,
      meta.text && `본문: ${meta.text.slice(0, 1200)}`,
    ].filter(Boolean).join("\n");

    const isYouTube = !!ytMeta;
    const isBlocked = !meta.title || meta.title === meta.siteName || meta.title === "Instagram";
    const notice = isBlocked && !imageAnalysis
      ? "이 링크는 내용을 자동으로 읽어올 수 없어요. 직접 제목과 내용을 수정해주세요."
      : "";

    const prompt = `다음 정보를 바탕으로 오픈리서치 커뮤니티(AI, 바이브코딩)에 올릴 한국어 포스트를 만들어주세요.

URL: ${url}
플랫폼: ${meta.siteName}${isYouTube ? " (YouTube 영상)" : ""}
${categoryHint}
${context}

## 작성 스타일 규칙 (필수)
- 말투: ~함. ~임. ~됨. ~있음. 형태로 간결하게 (경어 금지)
- 형식: 첫 줄에 핵심 한 문장 → 이후 개조식 목록 (- 또는 번호)으로 상세 설명
- 길이: 6~10줄 분량. 핵심 포인트를 충분히 담을 것
- 목록 항목은 단순 나열 말고, 각 항목마다 이유/의미/수치 등 구체적인 내용 포함
- 예시:
  "AI 에이전트로 직원 없이 회사 운영 중. 맥 미니 10대로 인건비 90% 절감.
  - 기존 직원 10명 대신 AI 에이전트 팀으로 전환, 월 운영비 $3천 수준
  - 에이전트가 코드 작성, 고객 응대, 마케팅까지 자동 처리
  - 창업자는 프롬프트 설계와 전략에만 집중하는 구조
  - AI 네이티브 스타트업의 실제 운영 사례로 주목받는 중
  - 이 모델이 소규모 창업자들의 새 기준이 될 가능성 있음"

## 카테고리 선택 기준
- vibe_coding: 바이브코딩, 노코드, AI로 뭔가 만든 경험/팁
- ai: AI 모델, LLM, 프롬프트, AI 기술 일반
- news: IT 뉴스, 테크 업계 소식, 신제품/서비스 발표
- showcase: 직접 만든 작품/프로젝트 공유
- resource: 유용한 툴, 라이브러리, 아티클, 튜토리얼
- question: 질문, 도움 요청
- free: 위 카테고리에 해당 안 되는 자유 토론
- proposal: 오픈리서치 새 서비스 아이디어

Output JSON only:
{
  "title": "제목 (60자 이내, 흥미롭게, ~함/~임 스타일)",
  "summary": "개조식 요약 (위 스타일 규칙 엄격 준수)",
  "category": "vibe_coding|ai|news|showcase|resource|question|free|proposal"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 900, responseMimeType: "application/json" },
    });

    const parsed = JSON.parse(response.text ?? "{}");

    return Response.json({
      title: parsed.title || meta.title || `${meta.siteName} 공유`,
      summary: parsed.summary || meta.description || imageAnalysis || "",
      category: parsed.category || "resource",
      siteName: meta.siteName,
      imageUrl: meta.imageUrl || null,
      hasImageAnalysis: !!imageAnalysis,
      notice,
    });

  } catch (err) {
    console.error("parse-url error:", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
