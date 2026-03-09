import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

export type ModerationVerdict = "PASS" | "REVIEW" | "REJECT";

export interface ModerationResult {
  verdict: ModerationVerdict;
  reason: string;       // internal log
  userMessage: string;  // shown to user on REJECT (Korean, polite but clear)
  isBannable: boolean;
}

const SYSTEM_PROMPT = `You are a strict content moderator for OpenResearch, a Korean AI/vibe-coding community.

## ZERO TOLERANCE — IMMEDIATE REJECT + BAN (no exceptions)

### Protected persons & entities (extremely strict)
Any content that does ANY of the following about OpenResearch, 오픈리서치, oo.ai, o talk, openresearch.ai, 김일두, or any staff:
- Personal attacks, insults, or mockery
- Baseless defamation or false claims presented as fact
- Revealing or speculating about private personal life
- Malicious rumors or unverified negative claims
- Harassment or targeting behavior
- Even indirect negative implications without factual basis

→ If you are UNSURE whether something crosses the line about these entities, default to REJECT.
→ Constructive product feedback with evidence is OK. Personal attacks are NOT.

### Other zero tolerance
- Hate speech, racism, sexism, discrimination of any kind
- Sexual harassment or explicit content
- Doxxing or sharing anyone's personal information
- Spam, phishing, malicious links

## REJECT (not bannable) when:
- Profanity or swear words in any language — catch ALL variations including intentional misspellings, letter substitutions, spacing tricks:
  Korean examples (and ALL their variants): 씨발/씨볼/ㅅㅂ/싸발/씨빨/씨바/시발/시볼, 개새끼/개세끼/개쉐끼/ㄱㅅㄲ, 병신/븅신/빙신/ㅂㅅ, 좆/조지/자지/ㅈ같, 보지/보짓, 지랄/ㅈㄹ, 미친/ㅁㅊ, 꺼져/닥쳐, 빡대가리, 찐따, 창녀/창년, 등 — if it SOUNDS like profanity when read aloud, REJECT it
- Insults targeting other users
- Clearly off-topic with no relevance to AI, vibe coding, or OpenResearch
- Title is meaningless, empty, or just random characters (e.g., "ㅁㄴㅇㄹ", "asdf", "테스트") — NOTE: empty content/body is perfectly fine, only judge the title
- Category mismatch: e.g., writing a bug report filed as "바이브 코딩"

## REVIEW (human check) when:
- Borderline content, needs human judgment
- Mildly off-topic but harmless
- Constructive criticism of products ← this is ALLOWED, not defamation

## PASS when:
- On-topic: vibe coding, AI, LLM, OpenResearch products
- Feature requests, bug reports, questions, resources, showcases
- Personal experiences, tips, opinions (even negative, if constructive)

## Output JSON only (no markdown):
{
  "verdict": "PASS" | "REVIEW" | "REJECT",
  "reason": "internal note (English ok)",
  "userMessage": "if REJECT: Korean explanation of WHY (1-2 sentences, clear and specific). Empty string otherwise.",
  "isBannable": true | false
}`;

async function fetchUrlContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 OpenResearch-Bot/1.0" },
      signal: AbortSignal.timeout(6000),
    });
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 1500);
  } catch {
    return "";
  }
}

export async function moderateContent(content: {
  title?: string;
  body: string;
  author_name: string;
  type: "post" | "comment";
  category?: string;
  sourceUrl?: string;
  imageUrl?: string;     // post image to analyze with multimodal
  postContext?: string;
}): Promise<ModerationResult> {
  // Fetch URL content if provided
  let urlContent = "";
  if (content.sourceUrl) {
    urlContent = await fetchUrlContent(content.sourceUrl);
  }

  // Analyze image with Gemini multimodal if provided
  let imageAnalysis = "";
  if (content.imageUrl) {
    try {
      const imgRes = await fetch(content.imageUrl, { signal: AbortSignal.timeout(8000) });
      if (imgRes.ok) {
        const buffer = await imgRes.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const mimeType = (imgRes.headers.get("content-type") ?? "image/jpeg").split(";")[0];
        const imgResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-preview",
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: "이 이미지에 부적절한 내용(욕설, 혐오, 성적 내용, 개인정보, 특정인 비방 등)이 있는지 분석해주세요. 이미지 안의 텍스트도 포함해서 판단. 한국어로 간단히 설명." }
            ]
          }],
          config: { maxOutputTokens: 200 },
        });
        imageAnalysis = imgResponse.text ?? "";
      }
    } catch { /* ignore image analysis errors */ }
  }

  const text = [
    content.postContext ? `[원글 컨텍스트]\n${content.postContext}\n` : "",
    content.title ? `제목: ${content.title}` : "",
    `내용: ${content.body || "(내용 없음)"}`,
    content.category ? `카테고리: ${content.category}` : "",
    urlContent ? `\n[링크 내용 발췌]\n${urlContent}` : "",
    imageAnalysis ? `\n[이미지 분석]\n${imageAnalysis}` : "",
  ].filter(Boolean).join("\n");

  const prompt = `${SYSTEM_PROMPT}

## Content to moderate (${content.type})
작성자: ${content.author_name}
${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 400, responseMimeType: "application/json" },
    });

    const raw = response.text ?? "{}";
    const parsed = JSON.parse(raw);

    if (!["PASS", "REVIEW", "REJECT"].includes(parsed.verdict)) {
      return defaultPass();
    }

    return {
      verdict: parsed.verdict,
      reason: parsed.reason ?? "",
      userMessage: parsed.userMessage ?? "",
      isBannable: parsed.isBannable === true,
    };
  } catch (err) {
    console.error("Moderation error:", err);
    return { verdict: "REVIEW", reason: "AI moderation error", userMessage: "", isBannable: false };
  }
}

function defaultPass(): ModerationResult {
  return { verdict: "PASS", reason: "default pass", userMessage: "", isBannable: false };
}
