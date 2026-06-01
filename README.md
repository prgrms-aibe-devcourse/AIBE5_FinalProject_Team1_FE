# CodeDock

> 코드가 안전하게 출항하는 곳, CodeDock

CodeDock은 PR 리뷰, 보안 점검, API 문서화, ERD 관리, 팀 채팅을 하나의 흐름으로 연결하는 AI 개발 워크플로우 플랫폼입니다.
팀원이 코드 변경의 맥락을 빠르게 파악하고, 리뷰와 문서 작업을 같은 워크스페이스 안에서 이어갈 수 있도록 돕습니다.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=061015" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6.3.5-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-TSX-3178C6?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4.x-38BDF8?style=flat-square&logo=tailwindcss&logoColor=061015" />
</p>

## 주요 기능

| 영역 | 설명 |
| --- | --- |
| 랜딩 / 인증 | CodeDock 브랜딩, 채팅형 로그인/회원가입, 테마/언어 전환 |
| 대시보드 | 팀과 리포지토리 기준의 리뷰 현황, 위험 신호, 최근 활동 확인 |
| 워크스페이스 | 채널 기반 협업, 팀 채팅, 리포지토리별 작업 공간 |
| PR 리뷰 | PR 목록, AI 리뷰 요약, Diff 확인, 라인 코멘트와 스레드 |
| API 명세 | Swagger UI 기반 API 명세 확인 |
| ERD | Mermaid 기반 ERD 작성, 미리보기, 확대/축소, 다운로드 |
| 문서 | PR 리뷰 요약, API 변경 명세, ERD 변경 기록 등 템플릿 기반 문서 작성 |
| 프로필 / 설정 | 사용자 프로필, GitHub 연동 관리, 테마 설정 |

## 기술 스택

| 분류 | 사용 기술 |
| --- | --- |
| Core | React, TypeScript, Vite |
| Routing | React Router |
| UI | Tailwind CSS, Radix UI, lucide-react |
| Animation | motion |
| Diagram / Docs | Mermaid, Swagger UI |
| Interaction | react-dnd, resizable panels |

## 시작하기

### 요구 환경

- Node.js 18 이상 권장
- npm

### 설치

```bash
npm install
```

### 개발 서버 실행

```bash
npm run dev
```

또는:

```bash
npm start
```

기본 Vite 주소는 `http://localhost:5173` 입니다.

### 빌드

```bash
npm run build
```

## 주요 라우트

| Route | 화면 |
| --- | --- |
| `/` | 랜딩 페이지 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/workspace` | 대시보드 |
| `/chat` | 워크스페이스 / 팀 채팅 |
| `/prs` | PR 목록 |
| `/pr/:id` | PR 리뷰 룸 |
| `/api-spec` | API 명세 |
| `/erd` | ERD |
| `/docs` | 문서 |
| `/profile` | 프로필 |
| `/settings` | 설정 |

## 프로젝트 구조

```text
src/
  app/
    components/      # 공통 UI, 레이아웃, 채팅/리뷰 패널
    contexts/        # 테마, 언어 컨텍스트
    pages/           # 라우트 단위 페이지
    i18n/            # 다국어 번역 데이터
  styles/            # 전역 스타일, 테마, 폰트
```

## 협업 규칙

- 이슈 단위로 브랜치를 생성합니다.
- 커밋 메시지는 `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` 등의 prefix를 사용합니다.
- PR은 최소 1명 이상의 리뷰 승인을 받은 뒤 병합합니다.
- 로컬 설정 파일, 빌드 결과물, 로그 파일은 커밋하지 않습니다.

## 팀

AIBE5 Final Project Team 1 Frontend

