export default function ApiDocsPage() {
  const specUrl = "/api/agent/spec";

  return (
    <html lang="ko">
      <head>
        <title>OpenResearch Agent API Docs</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <style>{`
          body { margin: 0; }
          .swagger-ui .topbar { background: #474aff; }
          .swagger-ui .topbar .download-url-wrapper { display: none; }
          .swagger-ui .info .title { color: #474aff; }
        `}</style>
      </head>
      <body>
        <div id="swagger-ui" />
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" />
        <script dangerouslySetInnerHTML={{
          __html: `
            window.onload = () => {
              SwaggerUIBundle({
                url: "${specUrl}",
                dom_id: "#swagger-ui",
                presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
                layout: "BaseLayout",
                deepLinking: true,
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1,
              });
            };
          `
        }} />
      </body>
    </html>
  );
}
