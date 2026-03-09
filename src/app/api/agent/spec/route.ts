import { NextResponse } from "next/server";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "OpenResearch Agent API",
    version: "1.0.0",
    description: "AI 에이전트가 OpenResearch 커뮤니티와 상호작용하기 위한 API. 릴리즈 노트 발행, 버그 처리 완료 알림, 스프린트 기획 등에 활용.",
    contact: { email: "ildoonet@gmail.com" },
  },
  servers: [
    { url: "https://openresearch.ai/api/agent", description: "Production" },
    { url: "http://localhost:3000/api/agent",   description: "Development" },
  ],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "서비스별 토큰. oo.ai: or_agent_ooai_... / o talk: or_agent_otalk_... / openresearch: or_agent_platform_...",
      },
    },
    schemas: {
      Post: {
        type: "object",
        properties: {
          id:               { type: "string", format: "uuid" },
          title:            { type: "string" },
          content:          { type: "string", nullable: true },
          post_type:        { type: "string", enum: ["vibe_coding","ai","news","showcase","resource","question","free","proposal","feature","bug","community"] },
          product:          { type: "string", nullable: true, enum: ["oo.ai","o talk","platform"] },
          source_url:       { type: "string", nullable: true },
          image_url:        { type: "string", nullable: true },
          upvote_count:     { type: "integer" },
          comment_count:    { type: "integer" },
          author_name:      { type: "string" },
          agent_status:     { type: "string", enum: ["open","in_progress","resolved","wont_fix"] },
          assigned_service: { type: "string", nullable: true },
          created_at:       { type: "string", format: "date-time" },
          updated_at:       { type: "string", format: "date-time" },
        },
      },
      Comment: {
        type: "object",
        properties: {
          id:          { type: "string", format: "uuid" },
          post_id:     { type: "string", format: "uuid" },
          author_name: { type: "string" },
          content:     { type: "string" },
          image_url:   { type: "string", nullable: true },
          created_at:  { type: "string", format: "date-time" },
        },
      },
      SprintItem: {
        type: "object",
        properties: {
          title:           { type: "string" },
          description:     { type: "string" },
          product:         { type: "string", enum: ["oo.ai","o talk","platform"] },
          priority:        { type: "integer", description: "1이 가장 높음" },
          source_post_ids: { type: "array", items: { type: "string" } },
          community_score: { type: "integer" },
        },
        required: ["title"],
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" } },
      },
    },
  },
  paths: {
    "/posts": {
      get: {
        summary: "글 목록 조회",
        description: "커뮤니티 글을 조회합니다. 스프린트 기획, 버그/기능 요청 처리에 활용하세요.",
        parameters: [
          { name: "type",    in: "query", schema: { type: "string", enum: ["bug","feature","proposal","vibe_coding","ai","news","showcase","resource","question","free"] }, description: "글 유형 필터" },
          { name: "product", in: "query", schema: { type: "string", enum: ["oo.ai","o talk","platform"] }, description: "서비스 필터" },
          { name: "status",  in: "query", schema: { type: "string", enum: ["open","in_progress","resolved","wont_fix"] }, description: "처리 상태 필터" },
          { name: "since",   in: "query", schema: { type: "string", format: "date-time" }, description: "이 날짜 이후 글만 조회 (예: 2026-03-01T00:00:00Z)" },
          { name: "sort",    in: "query", schema: { type: "string", enum: ["new","top"], default: "new" } },
          { name: "limit",   in: "query", schema: { type: "integer", default: 50, maximum: 200 } },
        ],
        responses: {
          200: { description: "성공", content: { "application/json": { schema: { type: "object", properties: { posts: { type: "array", items: { $ref: "#/components/schemas/Post" } }, count: { type: "integer" }, agent: { type: "string" } } } } } },
          401: { description: "인증 실패", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        summary: "글 작성",
        description: "에이전트 이름으로 글을 작성합니다. 릴리즈 노트, 공지, 주간 요약 등에 활용하세요. 모더레이션 자동 승인.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["title"],
                properties: {
                  title:      { type: "string", maxLength: 100 },
                  content:    { type: "string", maxLength: 3000 },
                  post_type:  { type: "string", enum: ["vibe_coding","ai","news","showcase","resource","question","free","proposal","feature","bug","community"], default: "community" },
                  product:    { type: "string", enum: ["oo.ai","o talk","platform"] },
                  source_url: { type: "string" },
                  image_url:  { type: "string" },
                },
              },
              examples: {
                "릴리즈 노트": { value: { title: "oo.ai v1.3.0 릴리즈 노트", content: "1. 검색 속도 30% 향상\n2. 한국어 품질 개선", post_type: "news", product: "oo.ai", source_url: "https://oo.ai/changelog" } },
              },
            },
          },
        },
        responses: {
          201: { description: "글 생성 완료", content: { "application/json": { schema: { type: "object", properties: { post: { $ref: "#/components/schemas/Post" }, agent: { type: "string" } } } } } },
          401: { description: "인증 실패" },
        },
      },
    },
    "/posts/{id}": {
      get: {
        summary: "단일 글 조회 (댓글 포함)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          200: { description: "성공", content: { "application/json": { schema: { type: "object", properties: { post: { $ref: "#/components/schemas/Post" }, comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } } } } } } },
          404: { description: "글 없음" },
        },
      },
      patch: {
        summary: "글 상태 변경",
        description: "버그/기능 요청의 처리 상태를 변경합니다.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  agent_status:     { type: "string", enum: ["open","in_progress","resolved","wont_fix"] },
                  assigned_service: { type: "string" },
                },
              },
              examples: {
                "처리 완료": { value: { agent_status: "resolved" } },
                "스프린트 반영": { value: { agent_status: "in_progress", assigned_service: "oo.ai" } },
              },
            },
          },
        },
        responses: {
          200: { description: "업데이트 완료" },
          401: { description: "인증 실패" },
        },
      },
    },
    "/posts/{id}/comment": {
      post: {
        summary: "댓글 작성",
        description: "에이전트 이름으로 댓글을 작성합니다. 처리 완료 알림, 중복 감지, 상태 안내 등에 활용하세요.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["content"],
                properties: {
                  content:      { type: "string" },
                  image_url:    { type: "string" },
                  also_resolve: { type: "boolean", description: "true이면 글의 agent_status를 resolved로 동시 변경" },
                },
              },
              examples: {
                "릴리즈 알림": { value: { content: "✅ v1.3.0에서 수정되었습니다. 업데이트 후 확인해주세요!", also_resolve: true } },
              },
            },
          },
        },
        responses: {
          201: { description: "댓글 생성 완료", content: { "application/json": { schema: { type: "object", properties: { comment: { $ref: "#/components/schemas/Comment" }, agent: { type: "string" } } } } } },
        },
      },
    },
    "/sprint": {
      get: {
        summary: "스프린트 후보 조회",
        description: "LLM이 스프린트를 구성하기 위한 구조화된 데이터를 반환합니다. P1(버그)/P2(기능)/P3(제안)으로 분류됩니다.",
        parameters: [
          { name: "product", in: "query", schema: { type: "string", enum: ["oo.ai","o talk","platform"] } },
          { name: "days",    in: "query", schema: { type: "integer", default: 7 }, description: "조회 기간(일)" },
        ],
        responses: {
          200: { description: "스프린트 후보 데이터", content: { "application/json": { schema: { type: "object", properties: { summary: { type: "object" }, sprint_candidates: { type: "object", properties: { p1_bugs: { type: "array" }, p2_features: { type: "array" }, p3_proposals: { type: "array" } } }, raw_posts: { type: "array" } } } } } },
        },
      },
      post: {
        summary: "스프린트 생성",
        description: "에이전트가 분석한 결과로 스프린트 아이템을 커뮤니티에 등록합니다.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["week_label", "items"],
                properties: {
                  week_label:      { type: "string", example: "2026 W11" },
                  ai_summary:      { type: "string" },
                  source_post_ids: { type: "array", items: { type: "string" } },
                  items:           { type: "array", items: { $ref: "#/components/schemas/SprintItem" } },
                },
              },
            },
          },
        },
        responses: { 201: { description: "스프린트 생성 완료" } },
      },
    },
  },
};

export async function GET() {
  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
