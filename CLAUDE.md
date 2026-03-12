# CLAUDE.md

## 브랜치 전략 및 배포

### 개발 브랜치
- **모든 개발 작업은 `dev` 브랜치에서 진행한다.**
- GCP VM은 `dev` 브랜치를 추적하며, `dev.openresearch.ai`로 서빙된다.
- 커밋 후 push는 `dev` 브랜치로 한다.

### 프로덕션 배포
- **유저가 명시적으로 배포를 요청할 때만** `dev` → `main` 머지 후 push한다.
- `main` 브랜치는 `openresearch.ai`에 배포된다.
- 자동으로 main에 머지하거나 배포하지 않는다.

### 요약
| 브랜치 | 환경 | URL |
|--------|------|-----|
| `dev`  | 개발 | dev.openresearch.ai |
| `main` | 프로덕션 | openresearch.ai |
