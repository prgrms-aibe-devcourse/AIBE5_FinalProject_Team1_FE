# CodeDock 인수인계 컨텍스트

이 문서는 CodeDock 프론트엔드 작업 컨텍스트를 다른 프로젝트나 새 대화로 옮기기 위한 요약본입니다. 새 프로젝트에서 이어서 작업할 때는 이 파일 내용을 먼저 읽고, 아래 규칙을 우선 기준으로 삼습니다.

## 한 줄 요약

CodeDock은 PR 리뷰, 보안 점검, API 명세, ERD, 문서, 팀 채팅을 하나의 흐름으로 묶는 AI 개발 워크스페이스 플랫폼입니다. 개발 도구의 밀도는 유지하되, 고양이 마스코트와 글래스모피즘 기반의 친근한 협업 경험을 목표로 합니다.

## 새 작업자가 반드시 알아야 할 핵심 원칙

- 사용자는 제안만 듣기보다 실제 구현과 검증까지 이어지는 작업 방식을 선호합니다.
- 단순 질문이 아니라 “해줘”, “고쳐줘”, “검증해”라고 하면 바로 파일을 확인하고 수정/검증까지 진행합니다.
- 디자인 수정은 화면 깨짐 여부가 가장 중요합니다. 텍스트가 두 줄로 깨지거나 요소를 침범하면 기능보다 먼저 잡습니다.
- 사용자가 “더미데이터는 건드리지 마”라고 여러 번 강조했습니다. 목 데이터는 번역/정규화/영문화 대상이 아닙니다.
- 기존 글래스모피즘, 고양이 마스코트, 영문 워드마크, 어두운 테마 감성은 CodeDock의 정체성이므로 함부로 단순화하지 않습니다.
- 사용자는 탭/헤더/사이드바의 부드러운 이동 애니메이션을 중요하게 봅니다.
- PR 리뷰를 요청하면 문제점만 선명하게 정리하는 것을 선호합니다. 칭찬이나 장황한 배경 설명은 줄입니다.
- Git 작업 중 rebase/merge/push 상태를 자주 확인합니다. 사용자가 터미널 로그를 붙이면 현재 브랜치와 충돌 상태부터 판단합니다.
- 빌드/검증 결과는 최종 답변에 반드시 요약합니다.

## 작업자 행동 규칙

- 먼저 `git status --short`로 현재 변경 상태를 확인합니다.
- 코드 읽기는 `rg`와 `Get-Content`를 우선 사용합니다.
- 수동 파일 수정은 `apply_patch`를 사용합니다.
- 이미 존재하는 사용자 변경을 되돌리지 않습니다.
- 기능 구현 후 가능하면 `npm.cmd run build`를 실행합니다.
- 프론트 화면 변경은 가능하면 브라우저에서 실제 라우트 확인까지 합니다.
- 브라우저 런타임이 실패하면 그 사실을 명확히 말하고, 코드/빌드 검증 결과로 대체합니다.
- 설명은 한국어로 합니다.
- 경로를 말할 때는 가능하면 실제 파일 경로를 명확히 적습니다.

## 하지 말아야 할 것

- 더미 데이터, 사람 이름, PR 제목, 이슈 제목, 채팅 샘플을 영어 모드라고 강제로 번역하지 않습니다.
- 고양이 마스코트를 제거하거나 단순 아이콘으로 대체하지 않습니다.
- 헤더 탭의 글래스모피즘 active 상태를 일반 border active로 바꾸지 않습니다.
- 번개 애니메이션이 버튼 영역 밖으로 나가게 두지 않습니다.
- 랜딩에 스캔라인, 형광 깜빡임, 크로스 라인을 다시 넣지 않습니다.
- `node_modules`, `dist`, 로그, AI 도구 찌꺼기를 커밋하지 않습니다.
- `git reset --hard`, `git checkout -- .` 같은 파괴적 복구는 사용자가 명시하지 않으면 하지 않습니다.
- rebase 중 충돌이 있는데 무리하게 push하지 않습니다.
- PR 브랜치 리뷰 중에는 본인 작업 브랜치와 섞지 않습니다.

## 기술 스택과 주요 구조

- Vite + React + TypeScript 기반 프론트엔드입니다.
- 주요 라우트와 페이지는 `src/app/pages`에 있습니다.
- 공통 레이아웃과 헤더/푸터/로고/채팅 컴포넌트는 `src/app/components`에 있습니다.
- 테마 색상과 애니메이션 대부분은 `src/styles/theme.css`에 있습니다.
- 한/영 번역은 `src/app/i18n/translations.ts`, 언어 상태는 `src/app/contexts/LanguageContext.tsx`에서 관리합니다.
- 테마 상태는 `src/app/contexts/ThemeContext.tsx`에서 관리합니다.
- 프로필/상태 데이터는 `src/app/contexts/ProfileContext.tsx`를 확인합니다.

## 중요 파일

- `src/app/App.tsx`: 라우팅 진입점. 404 catch-all 유무와 라우트 변경 시 확인.
- `src/app/components/Layout.tsx`: 로그인 후 헤더, nav, 프로필 메뉴, 언어/테마 버튼.
- `src/app/components/PublicLayout.tsx`: 랜딩/로그인/회원가입 계열 공개 레이아웃.
- `src/app/components/Footer.tsx`: 푸터 정보 구조. 깨진 링크 제거와 라우트 일치 여부 중요.
- `src/app/components/CoffeeLogo.tsx`: 고양이 마스코트 로고. hover 애니메이션과 표정 상태가 중요.
- `src/app/components/CodeDockWordmark.tsx`: 영문 CodeDock 워드마크. Code/Dock 폰트 조합과 hover 애니메이션 유지.
- `src/app/components/ThemeToggleButton.tsx`: 테마 변경 버튼. 번개 애니메이션은 버튼 박스 밖으로 벗어나면 안 됨.
- `src/app/components/LanguageToggleButton.tsx`: 언어 전환 버튼. 헤더 오른쪽에 있어야 함.
- `src/app/components/LanguageDomSync.tsx`: DOM 텍스트 번역 동기화.
- `src/app/i18n/translations.ts`: UI 번역 사전. 더미 데이터는 번역하지 않고 UI 라벨만 번역.
- `src/app/pages/HomePage.tsx`: 랜딩 페이지. 고양이 소개 애니메이션, 브랜딩, 기능 소개.
- `src/app/pages/LoginPage.tsx`: 채팅형 로그인. 이메일/비밀번호 단계별 등장, 비밀번호 찾기 링크.
- `src/app/pages/SignupPage.tsx`: 채팅형 회원가입. 이름, 이메일, 비밀번호, 확인, 약관, GitHub 연동.
- `src/app/pages/AccountRecoveryPage.tsx`: 비밀번호 찾기 페이지. 채팅형 흐름과 마스코트 피드백.
- `src/app/pages/WorkspacePage.tsx`: 대시보드/팀 목록/초대/팀 생성/워크스페이스 목록.
- `src/app/pages/ChatPage.tsx`: 워크스페이스 탭의 핵심 화면. 사이드바, 채널, 레포 채널, 임베드 패널 관리.
- `src/app/components/ChatPanel.tsx`: 메인 채팅. 메시지, 첨부, 링크, 이모지, 반응, typing indicator.
- `src/app/components/ChannelPanel.tsx`: 채널/스레드 성격의 패널. typing indicator와 스크롤 이슈 주의.
- `src/app/components/ThreadPanel.tsx`: 스레드 답글 패널.
- `src/app/components/PRReviewPanel.tsx`: PR 상세, AI 요약/피드백/Diff/스레드.
- `src/app/pages/ERDPage.tsx`: Mermaid ERD 렌더링, ERD 목록, 추가/삭제, 줌/다운로드.
- `src/app/pages/APISpecPage.tsx`: Swagger UI 연동과 API 명세 화면.
- `src/app/pages/DocsPage.tsx`: 문서 템플릿/작성/등록.
- `src/app/components/TeamPanel.tsx`: 팀 관리 화면.
- `src/app/components/WorkspaceSettingsModal.tsx`: 팀/워크스페이스 설정, 팀원/리포지토리 관리.
- `src/app/components/WorkBoardPanel.tsx`: 작업 보드.
- `src/styles/theme.css`: 전역 디자인 토큰, 글래스모피즘, hover, 애니메이션.
- `guidelines/Guidelines.md`: 팀 협업/컨벤션 문서로 유지.
- `README.md`: 프로젝트 소개와 실행 가이드.

## 파일별 우선 확인 포인트

| 파일 | 확인할 것 |
| --- | --- |
| `src/app/i18n/translations.ts` | 패턴 순서, 더미 데이터 제외, 캡처 그룹 재번역, 한글 잔류 여부 |
| `src/app/pages/HomePage.tsx` | 랜딩 인트로, 고양이 말풍선, 히어로 줄바꿈, 목업 한 줄 유지 |
| `src/app/pages/LoginPage.tsx` | 채팅형 입력 단계, 비밀번호 찾기 위치, 왼쪽 목업 비율 |
| `src/app/pages/SignupPage.tsx` | IME 조합, 단계별 포커스, 비밀번호 불일치 타이밍, GitHub 연동 |
| `src/app/pages/AccountRecoveryPage.tsx` | 비밀번호 찾기 문구, 이메일 오류 피드백, 마스코트 말풍선 위치 |
| `src/app/pages/ChatPage.tsx` | 사이드바, 채널/레포 구분선, 크게 보기, 임베드 라우팅 |
| `src/app/components/ChatPanel.tsx` | 메시지 전송, 자동 스크롤, 이모지/첨부/링크, typing indicator |
| `src/app/components/ThreadPanel.tsx` | 답글 입력, 스레드 자동 스크롤, typing indicator |
| `src/app/components/PRReviewPanel.tsx` | PR 탭 이동 흔들림, Diff 세부탭, PR 스레드 연결 |
| `src/app/pages/ERDPage.tsx` | Mermaid 렌더, 줌, 캔버스 크기, SVG 다운로드, 목록 CRUD |
| `src/app/pages/APISpecPage.tsx` | Swagger UI, API 그룹/summary 번역, 검은 화면 여부 |
| `src/app/pages/DocsPage.tsx` | 문서 템플릿 선택/작성/등록, 목록 잘림, 스크롤 |
| `src/app/components/WorkspaceSettingsModal.tsx` | 팀원 삭제/역할/소유권 이전, 리포지토리 추가/삭제 |
| `src/styles/theme.css` | 테마 변수, hover glow, 헤더/사이드 active 애니메이션, 스크롤/타이포 |

## 보관된 참고 파일

- `src/imports/preview.html`: 초기에 디자인 기준으로 저장한 preview 파일.
- `src/imports/design-reference-preview.html`: 디자인 레퍼런스용 preview.
- `src/imports/coffeeting_clear_ear_bubble_developer_cat_v14.html`: 고양이 마스코트 레퍼런스.
- `src/imports/pasted_text/secureflow-workspace-docs.md`: 문서/워크스페이스 레퍼런스 텍스트.
- `src/imports/*.png`: 과거 스크린샷/디자인 참고 이미지.
- 원본으로 사용자가 언급한 외부 파일:
  - `C:\Users\jeaju\Downloads\preview.html`
  - `C:\Users\jeaju\Downloads\CodeDock 기능 명세의 사본.xlsx`
  - `C:\Users\jeaju\Downloads\054941539a1a4a7c0aeee8abd7dad971.webp`
  - 여러 스크린샷과 PR/Diff 레퍼런스 이미지

## 디자인 원칙

- 기본 톤은 어두운 배경 + 사이버/해양 감성 + 글래스모피즘입니다.
- 고양이 마스코트는 CodeDock의 핵심 정체성입니다. 랜딩, 로그인, 회원가입, 비밀번호 찾기, 빈 상태에서 적극 사용합니다.
- 탭 선택 상태는 원래 글래스모피즘 느낌이 있어야 합니다. 갑작스러운 테두리나 단순한 active 스타일로 바꾸면 안 됩니다.
- 헤더와 왼쪽 사이드바 이동/선택 박스는 부드러운 spring 느낌이어야 합니다.
- 헤더는 스크롤 시 따라와야 합니다.
- 랜딩에서 스캔라인, 형광 깜빡임, 크로스 라인 장식은 제거해야 합니다.
- 오브젝트나 텍스트가 서로 침범하면 안 됩니다. 특히 고양이, 말풍선, 히어로 문구, 로그인 좌측 목업의 줄바꿈을 주의합니다.
- 버튼/아이콘은 가능하면 lucide-react 아이콘을 사용합니다.
- 카드 안에 카드를 중첩하지 않습니다.
- UI 텍스트가 컨테이너를 벗어나면 박스 크기/레이아웃을 조정합니다.
- landing hero 문구:
  - `코드가 안전하게`
  - `출항하는 곳, CodeDock`
- 브랜딩 문구:
  - `CodeDock은 PR 리뷰, 보안 점검, API 문서화를 하나의 흐름으로 연결해 팀의 코드가 더 안전하게 배포될 수 있도록 돕는 AI 개발 워크플로우 플랫폼입니다.`
  - 이 문구는 랜딩 인트로 애니메이션 쪽으로 쓰는 선호가 있었습니다.

## 사용자 디자인 취향 상세

- “예쁘게”는 장식 추가가 아니라 실제 기능 화면처럼 보이는 완성도를 뜻합니다.
- SaaS/개발 도구 화면은 랜딩 페이지처럼 과하게 넓은 카드보다, 밀도 있고 스캔 가능한 레이아웃을 선호합니다.
- 로그인/회원가입은 정적인 폼보다 대화형 채팅 UI를 선호합니다.
- 마스코트 말풍선은 기능 설명과 오류 피드백에 적극적으로 사용합니다.
- 호버 마이크로카피는 개발자 농담이 섞인 영어 문구를 선호합니다.
- 단, 영어 마이크로카피는 의도된 브랜딩이므로 언어 전환 로직이 한글로 바꾸지 않게 주석으로 보호합니다.
- 기본 UI의 라벨은 한국어 모드에서는 자연스러운 한국어, 영어 모드에서는 영어가 되어야 합니다.
- “PR을 읽는 시간”, “CodeDock은 해결할게요” 같은 긴 문구는 요소 침범을 일으키면 과감히 줄입니다.
- `PR`, `API`, `ERD`, `Docs`, `GitHub` 같은 전문/제품 용어는 필요하면 영어 그대로 둡니다.

## 레이아웃 깨짐 기준

다음 현상은 사용자가 바로 문제로 보는 영역입니다.

- 텍스트가 버튼/카드/탭 안에서 두 줄로 깨짐.
- 고양이 아이콘이 오른쪽으로 밀리거나 문구와 겹침.
- 로그인 좌측 목업 탭(`대시보드`, `PR 리뷰`, `API 명세`, `ERD`, `팀 채팅`)이 두 줄이 됨.
- 사이드바 active pill이 오른쪽에서 잘림.
- 구분선 추가 후 플러스 버튼/토글이 클릭되지 않음.
- 채널 하나 추가할 때마다 레이아웃이 서서히 밀림.
- 크게 보기 버튼과 다운로드/재생성/AI 생성 버튼이 겹침.
- 문서 목록 또는 ERD 캔버스가 아래/오른쪽에서 잘림.
- typing indicator가 메시지 리스트를 밀어 올림.
- hover 후 주황색/원치 않는 glow 잔상이 남음.

## 타이포그래피 기준

사용자가 KRDS Typography 가이드를 참고하자고 했습니다.

- 기본 한글/영문은 Pretendard 계열 감성을 유지합니다.
- 본문은 최소 16px 이상, 가능하면 17px 기준을 고려합니다.
- 줄 간격은 최소 150%를 기준으로 합니다.
- 굵기는 Regular 400과 Bold 700 중심으로 씁니다.
- 작은 UI 라벨은 가독성을 해치지 않게 조심합니다.
- 단, 기존 UI에서 레이아웃 깨짐 때문에 12px로 맞춘 영역은 무조건 일괄 상향하지 말고 실제 화면 기준으로 조정합니다.
- letter spacing은 과도하게 음수로 밀지 않는 것이 원칙입니다. 기존 스타일과 충돌하면 화면 검증을 우선합니다.

## 로고와 마스코트

- 영문 워드마크는 `CodeDockWordmark.tsx`와 `theme.css`에 걸쳐 관리합니다.
- Code 부분은 픽셀/모노 느낌, Dock 부분은 프로젝트 현재 디자인을 유지합니다.
- 과거 요청:
  - Code의 C를 크게 키움.
  - C에 Visual Studio 보라색 느낌을 적용.
  - Dock과 Code의 줄맞춤을 중요하게 봄.
  - Dock의 위치는 미세하게 위/아래 조정했으므로 함부로 변경하지 않습니다.
- 로고 hover 시 과하지 않은 glow/살짝 떠오르는 애니메이션이 있습니다.
- 고양이 헤더 로고 hover 시 귀/눈/입/컵이 반응해야 합니다.
- hover 후 주황색 잔광이 남으면 인라인 filter와 CSS hover filter 충돌을 의심합니다.

## 언어 전환 규칙

- 기본 언어는 한국어입니다.
- 영어 버튼을 누르면 UI 라벨은 영어로 바뀌어야 합니다.
- 목 데이터/더미 데이터는 영어로 바꾸지 않습니다.
  - 사람 이름: 김재준, 김진필, 김준우, 김진현, 안현 등
  - PR/이슈 제목
  - 채팅 메시지 예시
  - ERD 이름, 문서 샘플 데이터
  - 코드/JSON 예시 문자열
- 번역 누락이 생기면 `src/app/i18n/translations.ts`에 추가합니다.
- 패턴 번역은 구체적인 규칙이 먼저 와야 합니다.
  - 예: `(.+) 데모 보기`는 `(.+) 보기`보다 먼저.
- 캡처한 한국어 조각은 `translateCore(match[1])`로 재번역해야 합니다.
- 띄어쓰기/마침표 차이도 실제 렌더와 맞춰야 합니다.
  - 예: `자리비움`과 `자리 비움`
  - 예: `출항하는 곳`과 `출항하는 곳.`

## 언어 전환에서 실제로 났던 문제

- `(.+) 보기` 패턴이 `(.+) 데모 보기`보다 먼저 와서 `Dashboard 데모 보기`가 `Show Dashboard 데모`로 깨졌습니다.
- `(.+) 입력` 패턴에서 캡처 그룹을 재번역하지 않아 `계정 정보 입력`이 `Enter 계정 정보`로 남았습니다.
- `자리비움`과 `자리 비움`처럼 공백 차이 때문에 매칭이 실패했습니다.
- `출항하는 곳`과 `출항하는 곳.`처럼 마침표 유무 때문에 매칭이 실패했습니다.
- `3건`, `15건`, `명 접속 중`처럼 숫자와 조사/단위가 분리되어 보이는 경우 패턴 보강이 필요했습니다.
- API 명세의 카테고리/summary는 UI 정보 구조라 번역 대상입니다.
- JSON body, 담당자, PR 제목, 채팅 문장은 목 데이터라 번역하지 않습니다.

## i18n 검증 방법

- `src/app/i18n/translations.ts`에서 영어 결과 값에 한글이 남아 있는지 검사합니다.
- 문제 케이스를 직접 샘플로 찍습니다.
  - `Dashboard 데모 보기 -> View Dashboard demo`
  - `계정 정보 입력 -> Enter Account Info`
  - `자리 비움 -> Away`
  - `출항하는 곳. -> from dock to deploy.`
  - `3건 -> 3 items`
- 브라우저에서 언어 버튼을 눌러 주요 라우트 확인:
  - `/`
  - `/login`
  - `/signup`
  - `/workspace`
  - `/chat`
  - `/api-spec`
  - `/erd`
  - `/docs`
  - `/profile`
  - `/settings`

## 랜딩 페이지

- 첫 진입 시 고양이가 가운데 나오고 말풍선으로 순차 설명한 뒤 랜딩 본문이 나오는 흐름을 선호합니다.
- 랜딩 애니메이션은 약 5초 버전 요청이 있었습니다.
- 오른쪽 위에 랜딩 애니메이션 스킵/삭제 버튼이 있어 바로 본문을 볼 수 있어야 합니다.
- 고양이 말풍선은 고양이 옆에 나오는 편이 낫다고 했습니다.
- 문구가 고양이나 요소를 침범하면 문구를 줄이거나 컨테이너를 키웁니다.
- 반복 말풍선 문구:
  - `안녕하세요. CodeDock입니다.`
  - `PR 리뷰를 정리해요.`
  - `위험 신호를 먼저 알려요.`
  - `문서 초안도 챙겨요.`
- `PR을 읽는 시간 절약`, `보안 리뷰를 기본값으로`, `문서는 코드 옆에서` 같은 카드 영역의 스캔라인/형광 깜빡임은 제거 대상입니다.
- 랜딩의 실시간 작업 공간 목업은 글자가 두 줄로 깨지지 않도록 카드/박스 크기를 조정합니다.

## 로그인

- 로그인은 채팅형 단계 UI입니다.
- 이메일 입력 후 비밀번호 입력창이 부드럽게 등장합니다.
- 프롬프트 문구:
  - `로그인할 이메일을 알려주세요.`
  - `이메일 확인했어요! 비밀번호를 입력해주세요.`
- 비밀번호 찾기 링크는 비밀번호 입력 전에도 보여야 합니다.
- 로그인 버튼 hover 시 마이크로카피가 바뀌는 효과가 있습니다.
  - 이 영어 마이크로카피는 의도된 장난/브랜딩 문구이므로 i18n으로 한글화하지 않게 주석을 유지합니다.
- 로그인 버튼 안의 화살표는 제거 요청이 있었습니다.
- GitHub 버튼 hover 애니메이션이 있어야 합니다.
- 왼쪽 목업이 비밀번호 입력 때 밀리면 위 빈 공간에 환영 문구가 들어가도록 조정한 적이 있습니다.
- 로그인 좌측 목업은 너무 작아지면 안 되고, 한 줄 깨짐을 박스 크기로 해결하는 방향을 선호합니다.

## 로그인 세부 체크리스트

- 이메일 입력 전에도 비밀번호 찾기가 보이는지 확인합니다.
- 이메일 입력 후 비밀번호 필드가 부드럽게 열리는지 확인합니다.
- 이메일/비밀번호 입력창 focus 시 흰 배경으로 변하지 않아야 합니다.
- GitHub 버튼 hover 애니메이션이 작동해야 합니다.
- 로그인 버튼 hover 문구가 의도된 영어 마이크로카피로 바뀌어야 합니다.
- 왼쪽 목업의 탭 목록이 한 줄로 유지되어야 합니다.
- 왼쪽 목업이 비밀번호 단계에서 밀리면 빈 공간에 환영 문구가 자연스럽게 들어가야 합니다.
- 로그인 후 테스트 목적의 즉시 로그인 흐름이 필요할 수 있습니다.

## 회원가입

- 회원가입도 로그인처럼 채팅형 단계 UI입니다.
- 단계:
  - 이름
  - 이메일
  - 비밀번호
  - 비밀번호 확인
  - 약관 동의
  - GitHub 연동
- 이름은 예시로 `김재준` 같은 실제 팀원 이름을 placeholder에 쓰면 안 됩니다.
- 한글 IME 조합 중 `김재주`처럼 미완성 이름이 말풍선에 잠깐 뜨는 문제를 조심합니다.
- 입력하고 Enter를 누르면 유효성 조건이 맞을 때만 다음 필드로 이동합니다.
- 애니메이션 등장 후 포커스해야 하므로 약 420ms 딜레이가 필요할 수 있습니다.
- 비밀번호 확인은 입력 중 바로 불일치 에러를 띄우지 말고, 길이가 원본 비밀번호 이상이거나 비교 준비가 된 시점부터 표시합니다.
- 비밀번호가 틀리면 고양이 표정이 찡그리거나 risk mood로 바뀌는 것이 좋습니다.
- 약관 문구가 여러 군데 중복되지 않게 역할을 나눕니다.
  - 체크박스 레이블은 법적 고지.
  - 오른쪽 ChatPrompt는 다음 액션.
  - 왼쪽 마스코트는 감정/상태 피드백.
- 마지막 완료 문구:
  - 왼쪽 마스코트는 `Happy Hacking!`
  - 오른쪽 안내는 `모든 준비가 끝났어요. 아래 버튼을 눌러 CodeDock을 시작하세요.`
- 회원가입 브랜딩 문구:
  - `코드가 안전하게`
  - `출항하는 곳.`
- 회원가입 CTA hover도 영어 마이크로카피로 바뀌는 의도된 효과가 있습니다.

## 비밀번호 찾기

- 아이디는 이메일이므로 별도 아이디 찾기보다 비밀번호 찾기만 두는 방향이 맞습니다.
- 비밀번호는 해시라 원문 복구가 불가능합니다. 하지만 사용자에게 굳이 해시 설명을 노출하지 않습니다.
- 비밀번호 찾기는 SMTP 재설정 링크 흐름을 전제로 합니다.
- 화면 제목은 `비밀번호 찾기`가 더 자연스럽고, 실제 동작은 이메일로 재설정 링크 발송입니다.
- `SMTP 복구 플로우`, `SMTP 메일`, `보안 인증`, `재설정 링크` 같은 설명형 배지는 제거 요청이 있었습니다.
- 이메일이 없거나 잘못되면 회원가입 고양이처럼 표정/말풍선 피드백을 줍니다.
- 말풍선은 너무 아래 있으면 올립니다.
- 빈 이메일 상태에서 비밀번호 찾기 버튼을 눌렀을 때 `로그인에 사용하는 이메일을 먼저 입력해주세요.` 같은 불필요한 중복 문구는 삭제 요청이 있었습니다.
- 버튼 hover 마이크로카피 후보:
  - 기본 한글 -> hover 영어
  - `Back aboard`
  - `Back to Dock`
  - `console.log("welcome back, sailor")`
- 영어 마이크로카피는 의도된 브랜딩이므로 i18n 자동 한글화 방지 주석을 답니다.

## 워크스페이스/대시보드

- 상단 탭 중 Workspace 탭 이름은 대시보드로 바꿨고, 탭 표시명은 영어권에서는 Dashboard/Workspace 일관성을 봐야 합니다.
- `My Repository dashboard`는 `My team`으로 바꾸는 요청이 있었습니다.
- 대시보드에서는 `team 생성하기` 성격의 버튼이 필요합니다.
- 워크스페이스 목록/내 팀 영역은 스크롤할 때 푸터까지 밀려 내려가거나 전역 스크롤락이 과하게 걸리면 안 됩니다.
- 스크롤락은 워크스페이스 탭에서만 필요한지 점검해야 합니다.
- 워크스페이스 탭 안에서 푸터가 필요 없으면 제거하는 방향도 검토했습니다.
- 내 팀 카드에서 팀 삭제, 팀 이름 수정, 팀 설정, 팀원 추가, 초대 확인, 초대 수락/거절이 중요합니다.
- 팀 생성 시 리포지토리 선택과 팀원 초대 프로세스가 있으면 좋습니다.
- 팀원 삭제와 역할 업데이트가 필요합니다.
- 팀원 삭제는 admin만 가능해야 합니다.
- 팀 관리 스코어가 무엇인지 불명확하면 제거하거나 의미를 명확히 합니다.
- 워크스페이스 접속중 인원 클릭 시 전체 몇 명이고 누가 접속 중인지 볼 수 있으면 좋습니다.
- 워크스페이스 경고 아이콘에는 툴팁이 필요합니다.
- 워크스페이스 드롭다운은 외부 클릭 시 닫혀야 합니다.

## 워크스페이스 상세 체크리스트

- 워크스페이스 목록에서 스크롤할 때 푸터가 같이 이상하게 내려오지 않아야 합니다.
- 전역 스크롤락이 헤더 nav나 다른 페이지에 영향을 주면 안 됩니다.
- 워크스페이스 탭 안에서만 필요한 스크롤락인지 확인합니다.
- 팀 카드 드래그 중 페이지가 흔들리면 드래그 중에만 스크롤 제어를 적용합니다.
- `초대 확인하기`, `팀 생성하기` 같은 버튼은 영어 모드에서 번역되어야 합니다.
- 팀 생성 모달:
  - 팀 이름 입력.
  - 리포지토리 선택.
  - 팀원 추가/초대.
  - 이전/다음/완료 버튼.
- 초대 확인 모달:
  - 초대 수락/거절.
  - 만료 시간 표시.
  - 초대가 없을 때 빈 상태.
- 팀 관리:
  - admin만 팀원 삭제 가능.
  - 역할 변경 가능.
  - 소유권 이전 가능.
  - 팀 삭제/나가기 경고 문구.

## 워크스페이스 채팅

- 채팅 탭 이름은 워크스페이스로 교체했습니다.
- 채팅은 Slack 같은 밀도 있는 스타일을 선호합니다.
- 내 메시지와 상대방 메시지는 구분되어야 하지만, `나` 대신 실제 이름을 표시합니다.
- 메시지 입력 영역 아이콘은 전송 버튼 왼쪽에 배치합니다.
- 메시지 전송, 입력 클리어, Enter/Shift+Enter, IME, 이모지, 첨부가 정상이어야 합니다.
- 메시지 추가 시 자동 스크롤이 되어야 합니다.
- 첫 입력 때 typing indicator가 스크롤 아래에 생기지 않도록 확인합니다.
- typing indicator는 메시지 박스를 밀어내지 않는 형태가 좋습니다.
  - 채팅 영역 외곽/입력창 위의 고정 라벨형이 선호됩니다.
- 여러 명이 입력 중일 때도 자연스럽게 표시되어야 합니다.
- typing indicator에는 애니메이션이 있어야 합니다.
- 채팅 메뉴 아이콘에는 툴팁이 필요합니다.
- 채팅 툴바 토글은 여러 팝업이 동시에 열리지 않게 합니다.
- 반응 이모지 팝업이 말풍선 안에서 잘리면 포털/위치 조정이 필요합니다.
- 북마크/공유/더보기/멘션 등 죽은 버튼은 실제 기능을 넣거나 제거/비활성화합니다.
- 채팅에서 파일, 사진, 링크 전송과 링크 미리보기가 필요합니다.
- 메시지에서 PR, ERD, Issue, API 명세, Docs 목록을 선택해 첨부할 수 있어야 합니다.
- 스레드 답글 N개 카운트는 실제 답글 수와 동기화해야 합니다.
- 반응은 채널 전환 후에도 유지되어야 합니다.

## 채널/사이드바

- chat 탭 오른쪽 사이드 탭에서 team/settings는 맨 아래로 배치하는 요청이 있었습니다.
- documentation/operation 아래에 API, ERD, DOCS를 넣는 구조를 사용한 적이 있습니다.
- 나중에 chat에서 ai review/documentation/operation은 제거 요청이 있었습니다.
- Overview 클릭 시 프로젝트 대시보드 내용이 채팅창에 임베드되어야 합니다.
- API, ERD, Docs도 같은 방식으로 임베드됩니다.
- 채팅 크게 보기 모드가 필요합니다.
  - 크게 보기 시 헤더를 없애고, chat 탭 전체가 커져야 합니다.
  - 옆 사이드탭도 나올 수 있어야 합니다.
  - ESC를 누르면 원래 상태로 돌아가야 합니다.
- Channels 영역에서 팀 채팅 접기/펼치기가 가능해야 합니다.
- 채널 옆 추가 버튼으로 하위 채팅을 만들 수 있어야 합니다.
- 채널 이름은 한 번 클릭이 아니라 두 번 클릭해야 수정창이 뜨는 방향이 맞습니다.
- 채널과 리포지토리 채널 사이에 구분선이 있으면 좋지만, 구분선 때문에 추가 버튼/토글/레이아웃이 깨지면 안 됩니다.
- 플러스 버튼 토글바가 잘리지 않도록 overflow와 레이아웃을 확인합니다.

## 채팅/사이드바 상세 체크리스트

- 워크스페이스 진입 시 첫 번째 리포지토리 채널을 기본으로 펼치는 이슈가 있었습니다.
- 단, 사용자가 직접 접으면 다시 강제로 열리지 않아야 합니다.
- 리포지토리가 없으면 마스코트가 말풍선으로 `리포지토리가 없습니다. 추가해주세요.` 같은 빈 상태를 안내합니다.
- `리포지토리 가져오기`를 누른 후에는 원래 채널/레포 메뉴가 표시되어야 합니다.
- 채팅 채널과 리포지토리 채널 사이 구분선은 클릭 영역을 막으면 안 됩니다.
- 채널 추가 버튼을 한 번 더 누르면 토글이 접히는 동작을 기대합니다.
- 채널 이름 수정은 더블클릭으로 들어갑니다.
- 채팅 메뉴 기능이 불명확하면 툴팁을 붙입니다.
- 채팅 입력창 바깥으로 팝업/이모지/첨부 메뉴가 잘리지 않아야 합니다.

## PR/Diff/스레드

- Chat 안에서 PR 목록을 누르면 PR 상세 창이 뜨고, 그 안에 Diff 탭이 있어야 합니다.
- Diff는 PR 상세의 세부 탭이어야 합니다.
- PR 하나당 하나의 스레드 채팅방이 생겨야 합니다.
- Diff에서 특정 라인을 클릭하면 PR 스레드에 해당 파일/라인 참조를 붙여 댓글을 남길 수 있어야 합니다.
- Diff에서 실제 수정도 가능하면 좋습니다.
- 오른쪽에는 PR 하나에 연결된 스레드 채팅방이 따로 있어야 하고, 메인 채팅에서 임베드해오는 느낌이어야 합니다.
- PR 탭의 `PR 내용`은 `AI 피드백`으로 바꾸고, 현재 코드와 AI 추천 코드를 반반 Diff처럼 보여주는 방향을 선호합니다.
- 고쳐야 할 파일, 취약점, 개선 코드가 명확해야 합니다.
- PR 첫 번째 탭에는 사용자의 실제 PR 내용이 먼저 나오는 느낌이 좋습니다.
- PR 탭 이동 시 요소가 흔들리거나 레이아웃이 움직이면 안 됩니다.
- dead code는 제거합니다. 예: 호출 안 되는 `renderEmbeddedDiffThreadChat` 안의 오래된 absolute typing indicator.

## ERD

- ERD는 Mermaid와 연동되어야 합니다.
- Mermaid 코드 입력 시 실제 다이어그램이 갱신되어야 합니다.
- Mermaid 초기화는 매 렌더/타이핑마다 반복하지 말고 싱글톤/한 번 초기화가 바람직합니다.
- Mermaid 렌더링은 off-screen container에서 SVG 추출 후 cleanup하는 방식이 안전합니다.
- ERD 목록이 있어야 하며, 레포/프로젝트별 ERD를 선택, 추가, 삭제할 수 있어야 합니다.
- 목록이 없으면 `ERD를 추가하세요` 같은 빈 상태 문구가 필요합니다.
- ERD 캔버스는 Figma/ERDCloud처럼 큰 캔버스 안에서 다이어그램을 확대/축소하는 느낌을 선호합니다.
- Ctrl + wheel로 확대/축소가 되어야 합니다.
- 크게 보기에서도 아래까지 확대/축소가 적용되어야 합니다.
- 100% 버튼이 실제로 fit-to-canvas 동작이면 라벨을 맞춤으로 바꾸거나, 100%면 실제 100%로 이동해야 합니다.
- 캔버스 크기와 SVG width 때문에 오른쪽이 잘리는 문제를 주의합니다.
- Mermaid SVG에 `width: min(100%, 520px)` 같은 강제 제한이 있으면 잘림의 원인이 될 수 있습니다.
- 다운로드는 드롭다운으로 SVG 이미지와 Mermaid 소스(.mmd)를 선택할 수 있으면 좋습니다.
- 재생성 버튼이 사실 초기화라면 라벨을 `초기화` 또는 `기본값으로`로 바꿔야 합니다.
- 다이어그램 연결선/테두리가 너무 튀면 투명화하거나 테마에 맞게 낮춥니다.
- 머메이드 문법 오류가 푸터/하단에 반복 노출되면 DOM cleanup 문제를 의심합니다.
- ERD 내부 스타일은 CodeDock 테마를 해치지 않으면서 시인성이 좋아야 합니다.

## ERD 상세 체크리스트

- ERD 탭 진입 시 검은 화면이 아니어야 합니다.
- Mermaid 문법 오류가 발생하면 에러 박스가 다이어그램 영역에 보여야 하며, 푸터에 반복 출력되면 안 됩니다.
- `Syntax error in text mermaid version ...`가 여러 번 하단에 뜨면 render artifact cleanup을 확인합니다.
- ERD 목록 CRUD:
  - 추가.
  - 이름 변경이 필요하면 추후 확장.
  - 삭제.
  - 목록이 비면 빈 상태 안내.
- 줌 컨트롤:
  - Ctrl + wheel.
  - minus/plus.
  - fit 또는 100% 버튼 라벨과 실제 동작 일치.
- 다운로드:
  - SVG 이미지.
  - Mermaid 소스 `.mmd`.
  - 드롭다운 외부 클릭 시 닫힘.
- 캔버스:
  - 큰 캔버스 안에 다이어그램이 들어가야 합니다.
  - 축소해도 오른쪽 검은 빈 공간만 크게 남지 않아야 합니다.
  - 확대 제한은 캔버스/뷰포트 기준으로 자연스럽게 잡습니다.
- 스타일:
  - ERDCloud처럼 시인성이 좋아야 하지만, CodeDock 테마를 해치면 안 됩니다.
  - 흰색 단순 스타일로 튀는 것은 선호하지 않았습니다.

## API 명세

- API 명세는 Swagger UI와 연동되는 방향입니다.
- API/ERD/DOCS가 검은 화면이 되는 경우 ErrorBoundary/라우트/임베드 렌더링을 확인합니다.
- `APISpecPage.tsx`의 API 그룹, summary, UI 라벨은 영어 모드 번역 대상입니다.
- JSON body 예시, 담당자 이름, PR/이슈 샘플은 더미 데이터로 유지합니다.

## API 명세 상세 체크리스트

- `/api-spec` 클릭 시 검은 화면이면 다음을 확인합니다.
  - Swagger CSS import.
  - ErrorBoundary.
  - 라우트 경로.
  - 임베드 모드에서 container 높이.
- API 카테고리명은 번역 대상입니다.
  - 인증 API.
  - 사용자 API.
  - 워크스페이스 API.
  - 이슈 API.
  - 문서 API.
  - 스레드 댓글 API.
  - 리포지토리 API.
  - 초대 API.
  - PR 분석 API.
- `리포지토리 연동 해제`, `Swagger UI 연동 미리보기` 같은 UI 라벨은 영어 모드에서 번역합니다.

## 문서

- 문서 탭은 다양한 템플릿을 선택해 작성하고 등록할 수 있어야 합니다.
- 문서 템플릿 목록 스크롤은 기본 브라우저 스크롤이 못생기면 숨기거나 커스텀 처리합니다.
- 문서 목록이 잘리거나 스크롤이 안 내려가는 문제를 주의합니다.
- 문서 관리는 API 명세, ERD, PR 리뷰 요약, 이슈 트래킹 등 여러 템플릿 흐름이 필요합니다.

## 프로필/유저 메뉴

- 유저 메뉴 추천:
  - 내 프로필
  - GitHub 연동 관리
  - 알림 설정
  - 활동 상태 설정
  - 비밀번호 변경
  - 로그아웃
- 프로필 페이지는 구체화가 필요합니다.
- 프로필 사진 변경 기능이 있어야 합니다.
- 닉네임 변경 기능이 있으면 좋습니다.
- 내 비밀번호 변경 기능이 있으면 좋습니다.
- GitHub 잔디 연동은 GitHub API로 가능할 수 있지만 인증/권한/요청 제한을 고려해야 합니다.
- 프로필 드롭다운이 열릴 때 헤더가 밀리면 안 됩니다.
- 로고 클릭 시 로그아웃되는 버그가 있었으니 로고 링크 동작을 주의합니다.

## 계정/프로필 기능 상세

- 아이디 찾기는 별도 기능으로 두지 않는 방향이 맞습니다. 계정 ID가 이메일이기 때문입니다.
- 비밀번호 찾기는 로그인 페이지와 비밀번호 찾기 페이지에서 접근 가능해야 합니다.
- 프로필에서 비밀번호 변경이 가능하면 좋습니다.
- 프로필에서 닉네임 변경이 가능하면 좋습니다.
- 프로필 사진 변경은 우선 구현 대상으로 언급되었습니다.
- GitHub 연동 관리는 프로필 보기와 같은 메뉴에 섞이면 혼란스럽습니다. 별도 섹션 또는 별도 페이지가 낫습니다.
- GitHub 잔디 연동은 가능하나 GitHub API 권한/토큰/사용량 제한을 고려해야 합니다.

## 설정/테마

- 화이트 모드보다 우선은 블루 모드/그린 모드 전환을 생각했습니다.
- 테마 변경 버튼은 클릭 시 번개 애니메이션이 있어야 합니다.
- 번개는 일자로 치고 버튼 박스 밖으로 벗어나면 안 됩니다.
- 테마 변경 적용이 안 된 부분이 있으면 CSS 변수/색상 하드코딩을 점검합니다.
- 버튼 색상과 사이드 메뉴바 색상은 테마에 일관되게 반응해야 합니다.

## CRUD/기능 명세 메모

사용자가 기능 명세 엑셀을 기준으로 빠진 엔티티 CRUD를 언급했습니다.

- 사용자: Delete 없음, 회원 탈퇴 필요.
- 워크스페이스: Update/Delete 없음, 이름 수정/삭제 필요.
- 이슈: Delete 없음.
- Docs 문서: Update/Delete 없음.
- 스레드 댓글: Update/Delete 없음.
- Repository 연동: Delete 정책 명시 필요.
- 초대 링크: Delete 없음, 링크 취소/만료 처리 필요.

## 팀 회의에서 나온 기능 묶음

다음 메모들은 사용자가 이슈로 묶어 작업하려고 했던 항목입니다.

- 공통 네비게이션/푸터 정보 구조:
  - nav바 PR 메뉴 삭제.
  - nav 메뉴 최종 결정.
  - API, ERD, 문서 메뉴 노출 위치 확정.
  - footer 간격 축소.
  - footer 불필요 메뉴 삭제.
  - 로고 클릭 시 로그아웃되는 문제 수정.
  - 프로필 드롭다운 열릴 때 헤더 밀림 수정.
- 계정/프로필:
  - 비밀번호 찾기.
  - 프로필 페이지 구체화.
  - 프로필 이미지 변경.
  - 닉네임 변경.
  - GitHub 연동 관리 분리.
- 워크스페이스/팀 관리:
  - 팀원 삭제 admin만 가능.
  - 팀원 역할 업데이트.
  - 워크스페이스 내부 팀 관리 페이지 팀원 추가.
  - 팀 만들 때 팀원 추가.
  - 워크스페이스 목록에서 팀 삭제 또는 설정.
  - 팀 관리 스코어 의미 재정의 또는 제거.
- 대시보드:
  - 최근 활동 구체화.
  - 상단 PR 개수 의미 구체화.
  - 접속중 인원 클릭 시 상세 목록.
- 채팅:
  - 북마크/더보기 기능 정의.
  - 채팅 메뉴 툴팁.
  - 이모지 팝업 잘림 수정.
  - 툴바 토글 중복 방지.
- 작업 보드:
  - 위아래 드래그 앤 드롭 순서 변경은 욕심일 수 있으나 검토.
- ERD/문서:
  - ERD마다 크기 차이 해결.
  - 문서 탭 전체 정리.
- 설정:
  - 화이트모드보다 블루/그린 모드 중심.
- 스크롤/레이아웃:
  - 빠른 스크롤 시 흰 배경 깜박임 방지.
  - 전역 스크롤이 헤더 nav에 적용되는 문제 수정.
  - 스크롤락 전역 적용 해제.
  - 화면 비율 동적 설정.
  - 랜딩 12px 텍스트를 14px로 상향하되 깨짐 여부 확인.
  - 워크스페이스 왼쪽 사이드 메뉴바 깨짐/버튼 색상 일관화.

## 협업/깃 컨벤션

사용자가 제공한 팀 규칙을 우선합니다.

- 데일리 스크럼: 팀 활동 시작 시 전날 작업 리뷰, 컨디션/이슈 공유.
- 주간 회의: 월요일 수업 시간 또는 멘토링 전 진척도 점검.
- 회의록 순번: 김준우 -> 김진필 -> 김재준 -> 김진현 -> 안현.
- 멘토링: 수요일 저녁, 가능하면 전원 참석.
- 멘토링 일지 순번: 김준우 -> 김진필 -> 김재준 -> 김진현 -> 안현.
- 30분 고민한 문제는 팀에 공유.
- GitHub push 전 스스로 리뷰.
- 이슈 생성 시 리뷰 받고 개발 진행.
- PR 병합 전 리뷰 승인 1개 이상 필수.
- Slack 공지 확인 시 체크 이모지.
- 이슈/작업 관련 내용은 Slack에 기록하고, 논의는 이슈 URL과 스레드로 이어가기.

## 커밋 컨벤션

- `feat`: 새로운 기능
- `fix`: 버그 수정
- `style`: 코드 스타일 변경
- `refactor`: 리팩토링
- `design`: CSS 등 디자인 수정
- `comment`: 주석 추가/수정
- `docs`: 문서 수정
- `test`: 테스트 추가/수정
- `chore`: 설정/빌드 등 기타 변경
- `rename`: 파일명/폴더명 변경
- `remove`: 파일 삭제

예시: `feat: 로그인 기능 구현`

## 브랜치 컨벤션

- 이슈 단위로 브랜치를 생성합니다.
- 예시: `feat/61-account-recovery-profile`
- 예시: `fix/18-erd-ui`
- 예시: `refactor/44-open-first-repo-channel`
- 브랜치 이름은 대체로 `prefix/이슈번호-작업요약` 형태입니다.
- 원격 브랜치 생성:
  - `git push -u origin 브랜치명`
- `git fetch`는 가져오기만 하고 rebase가 아닙니다.
- rebase:
  - `git fetch origin`
  - `git rebase origin/main`
- rebase 후 이미 원격에 올린 브랜치라면:
  - `git push --force-with-lease origin 브랜치명`
- `git pull origin main`은 merge를 만들 수 있습니다. rebase와 다릅니다.

## Git 문제 해결 메모

- `fatal: detected dubious ownership`가 나오면:
  - `git config --global --add safe.directory "$(pwd -W)"`
  - 또는 절대 경로를 safe.directory에 추가합니다.
- `fatal: branch cannot be resolved to branch`는 브랜치명 대소문자/오타를 확인합니다.
  - 예: `fix/18-ERD-Ui`와 `fix/18-ERD-ui`.
- `git push -c`는 잘못된 옵션입니다.
  - 원격 브랜치 생성은 `git push -u origin 브랜치명`.
- rebase 중 프롬프트가 `REBASE 1/4`처럼 보이면 4개 커밋 중 1번째를 적용 중이라는 뜻입니다.
- rebase 충돌 시:
  - 충돌 파일 확인.
  - 충돌 해결.
  - `git add 파일`.
  - `git rebase --continue`.
- 이미 rebase 후 원격 브랜치가 non-fast-forward면:
  - `git push --force-with-lease origin 브랜치명`.
- main 최신에서 새 브랜치를 만들려면:
  - `git switch main`
  - `git fetch origin`
  - `git pull --ff-only origin main`
  - `git switch -c prefix/issue-title`
- PR 브랜치를 로컬에서 확인하려면:
  - `git fetch origin`
  - `git switch --track origin/브랜치명`
  - 또는 GitHub CLI가 있으면 `gh pr checkout PR번호`.

## 이슈 템플릿

```md
## 📝 무엇을 하나요?

설명 작성

## 📌 To do

- [ ] 할 일 1
- [ ] 할 일 2
- [ ] 할 일 3

## 📌 참고

- 참고 1
- 참고 2
- 참고 3

## 📌 제외 범위

- 제외 범위 1
- 제외 범위 2
- 제외 범위 3

## 🎯 완료 기준

- 완료 기준 1
- 완료 기준 2
- 완료 기준 3
```

## PR 템플릿

```md
## 🔎 What

- 한 일 1
- 한 일 2
- 한 일 3

## 🔗 Issue

- Closes: #이슈번호

## ✅ 체크리스트

- [ ] 브랜치 base가 적절한가요?
- [ ] 제목이 이슈 제목과 동일한가요?
- [ ] 최소 1명의 리뷰를 받았나요?
```

## 보안/백엔드 협업 메모

- JWT + Spring Security 적용.
- BCrypt로 비밀번호 암호화.
- 비밀번호는 해시라 원문 복구가 불가능하고, 비밀번호 찾기는 재설정 링크 방식.
- 관리자/사용자 권한 분리.
- Native Query 최소화, JPA 권장.
- 입력 검증: `@Valid`, `@NotNull` 등.
- 로그/에러 메시지에 민감정보 포함 금지.
- 민감정보는 `.env`, GitHub Secrets로 관리.
- `application.yml` 하드코딩 금지.
- HTTPS 환경 테스트/배포.
- WebSocket 인증, Rate Limiting, Redis 로그인 시도 제한은 추천/고급 항목.

## 백엔드 API 연결 컨텍스트

프론트 세션에서 백엔드 API를 붙일 때는 “이미 열린 백엔드 API” 기준으로 작업합니다. 채널 생성/수정/삭제 API는 아직 없으므로 제외하고, 조회/채팅/답글/리액션/문서 쪽부터 연결합니다.

### 연결 작업 우선순위

1. 공통 API 타입/클라이언트 정리
   - `ApiResponse<T>`
   - 에러 응답
   - `X-User-Id` 임시 헤더 자동 주입
2. 워크스페이스/채널 목록 연결
   - `GET /api/v1/workspaces`
   - `GET /api/workspaces/{workspaceId}/channels`
3. 채널 메시지 연결
   - `GET /api/channels/{channelId}/messages?cursor=&limit=`
   - WebSocket send: `/app/channels/{channelId}/messages`
   - WebSocket subscribe: `/topic/channels/{channelId}/events`
4. 스레드 답글 연결
   - `GET /api/threads/{threadId}/replies`
   - `POST /api/threads/{threadId}/replies`
5. 리액션 연결
   - `GET /api/channels/{channelId}/reactions`
   - `POST /api/channels/{channelId}/reactions/toggle`
6. 문서 CRUD 연결
   - `/api/workspaces/{workspaceId}/documents`

### 공통 타입

```ts
export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  code?: string;
  message?: string;
};

export type ISODateTime = string;
export type Role = "owner" | "admin" | "editor" | "viewer";
export type ChannelType = "general" | "repository" | "custom";
export type ReactionTargetType = "thread" | "thread_reply";
```

### 임시 인증

현재 백엔드는 일부 API에서 임시로 `X-User-Id` 헤더를 사용합니다.

```ts
headers: {
  "X-User-Id": currentUser.id
}
```

JWT가 붙으면 `Authorization: Bearer {accessToken}` 기반으로 바뀔 가능성이 큽니다. 프론트에서는 API client에서 `X-User-Id`를 자동 주입하도록 분리해두면 나중에 교체하기 쉽습니다.

### 채널

```ts
export type Channel = {
  id: number;
  workspaceId: number;
  githubRepositoryId: number | null;
  name: string;
  channelType: ChannelType;
  isDeletable: boolean;
  description: string | null;
};
```

현재 가능한 API:

```ts
GET /api/workspaces/{workspaceId}/channels
// ApiResponse<Channel[]>
```

채널 생성/수정/삭제 API는 아직 없습니다. 프론트에서 해당 기능을 연결 작업 범위에 넣지 않습니다.

### 채널 메시지

```ts
export type ChannelMessage = {
  id: number;
  channelId: number;
  senderMemberId: number;
  senderName: string;
  content: string;
  createdAt: ISODateTime;
};

export type ChannelMessageCreateRequest = {
  senderMemberId: number;
  content: string;
};
```

```ts
GET /api/channels/{channelId}/messages?cursor={messageId}&limit=30
Header: X-User-Id: userId
// ApiResponse<ChannelMessage[]>
```

WebSocket:

```ts
SEND /app/channels/{channelId}/messages
Body: ChannelMessageCreateRequest

SUBSCRIBE /topic/channels/{channelId}/events
// ChatEvent<ChannelMessage | ReactionToggleResponse | ...>
```

### 스레드 답글

```ts
export type ThreadReply = {
  id: number;
  threadId: number;
  senderMemberId: number;
  senderName: string;
  content: string;
  createdAt: ISODateTime;
};

export type ThreadReplyCreateRequest = {
  content: string;
};
```

```ts
GET /api/threads/{threadId}/replies
Header: X-User-Id: userId
// ApiResponse<ThreadReply[]>

POST /api/threads/{threadId}/replies
Header: X-User-Id: userId
Body: { content: string }
// ApiResponse<ThreadReply>
```

### 리액션

```ts
export type ReactionToggleRequest = {
  workspaceMemberId: number;
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
};

export type ReactionToggleResponse = {
  channelId: number;
  workspaceMemberId: number;
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
  reacted: boolean;
  count: number;
};

export type ReactionSummary = {
  targetType: ReactionTargetType;
  targetId: number;
  emoji: string;
  count: number;
};
```

```ts
GET /api/channels/{channelId}/reactions
// ApiResponse<ReactionSummary[]>

POST /api/channels/{channelId}/reactions/toggle
Body: ReactionToggleRequest
// ApiResponse<ReactionToggleResponse>
```

### WebSocket 이벤트

```ts
export type ChatEventType =
  | "MESSAGE_CREATED"
  | "MESSAGE_UPDATED"
  | "MESSAGE_DELETED"
  | "THREAD_REPLY_CREATED"
  | "REACTION_UPDATED"
  | "TYPING"
  | "NOTIFICATION_CREATED";

export type ChatEvent<T> = {
  type: ChatEventType;
  payload: T;
};
```

### 연결 시 주의점

- API client를 먼저 만들고, 페이지/컴포넌트에서 직접 `fetch`를 흩뿌리지 않습니다.
- `X-User-Id`는 임시 인증 계층에 숨깁니다.
- 나중에 JWT로 바뀌어도 호출부 변경이 작게 끝나야 합니다.
- WebSocket payload는 `ChatEvent<T>` 형태로 수신한다고 가정합니다.
- 기존 localStorage 메시지/리액션/스레드 상태는 API 연결 후 점진적으로 대체합니다.
- 실패 시 더미 데이터 fallback을 둘지, 에러 UI를 보여줄지는 화면별로 결정합니다.
- 채널 생성/수정/삭제는 백엔드 API가 열리기 전까지 UI만 있더라도 실제 연동 범위에서 제외합니다.

## 멘토링 질문 후보

- 프론트에서 더미 데이터와 실제 API 연동 경계는 어디까지 분리하는 게 좋은가?
- ERD Mermaid 렌더링을 클라이언트에서 계속 처리할지, 서버에서 SVG 생성/캐싱하는 것이 나은가?
- 채팅 메시지/반응/스레드 localStorage 저장을 실제 WebSocket/API로 전환할 때 상태 구조를 어떻게 잡는 게 좋은가?
- GitHub OAuth와 Repository 권한 범위를 최소화하려면 어떤 scope가 적절한가?
- PR Diff 라인 댓글과 메인 채팅 스레드를 같은 도메인 모델로 볼 수 있는가?
- 팀원 권한 관리에서 owner/admin/editor/viewer 권한을 프론트와 백엔드 어디서 어떻게 검증해야 하는가?
- Swagger UI/RestDocs/API 명세를 프로젝트에서 어떻게 연결하는 게 포트폴리오 설득력이 높은가?
- 다국어 처리를 현재 DOM sync 방식에서 i18n key 방식으로 전환할 필요가 있는가?
- 접근성 기준으로 KRDS 타이포그래피와 현재 사이버 테마를 어떻게 조화시킬 수 있는가?

## 불필요 파일/ignore 메모

- `node_modules/`, `dist/`, `build/`, `.env`, 로그, 캐시, `tmp/`, OS/에디터 파일은 ignore 대상입니다.
- `.claude/launch.json` 같은 AI 도구 찌꺼기가 git에 잡히면 추적 해제/삭제를 검토합니다.
- 다만 이미 추적 중인 파일을 제거할 때는 사용자가 의도한 파일인지 확인합니다.
- `package.json`과 `package-lock.json`은 일반적으로 npm 프로젝트에서 원격에 올리는 것이 맞습니다.

## 검증 기준

- 변경 후 기본적으로 `npm.cmd run build`를 돌립니다.
- 프론트 UI 변경은 가능하면 브라우저에서 실제 라우트 확인합니다.
- 언어 전환 작업은 더미 데이터 제외 UI 라벨 기준으로 확인합니다.
- 채팅/스레드/typing indicator는 첫 입력, 여러 명 입력, 새 메시지 후 자동 스크롤을 확인합니다.
- ERD는 Mermaid 정상 코드, 문법 오류, 빈 코드, 줌, 다운로드, 추가/삭제, 새로고침 저장을 확인합니다.
- Git 작업 전 `git status --short`로 변경 파일을 확인합니다.

## 페이지별 최소 검증 시나리오

| 페이지 | 검증 |
| --- | --- |
| `/` | 랜딩 인트로, 스킵 버튼, 헤더 sticky, 히어로 줄바꿈, 스캔라인 없음 |
| `/login` | 이메일/비밀번호 단계, 비밀번호 찾기, GitHub hover, 목업 한 줄 유지 |
| `/signup` | 이름 IME, Enter 다음 필드, 비밀번호 불일치, 약관, GitHub 연동 |
| `/account-recovery` | 이메일 오류, 성공 말풍선, 버튼 hover, 로그인 복귀 |
| `/workspace` | 팀 목록, 초대 확인, 팀 생성, 스크롤/푸터, 영어 번역 |
| `/chat` | 채널/레포 사이드바, 메시지 전송, 첨부/이모지/링크, 자동 스크롤 |
| `/api-spec` | Swagger UI, API 목록, 영어 번역, 검은 화면 없음 |
| `/erd` | Mermaid 렌더, 문법 오류, 줌, 다운로드, 목록 추가/삭제 |
| `/docs` | 템플릿 선택, 문서 작성, 등록, 목록 스크롤 |
| `/profile` | 프사/닉네임/상태, GitHub 연동 영역, 영어 번역 |
| `/settings` | 블루/그린 모드, 테마 일관성, 저장 동작 |

## PR 리뷰 체크리스트

- 변경 목적이 이슈 제목과 맞는가?
- 더미 데이터까지 번역하거나 바꾸지 않았는가?
- UI 텍스트가 박스 밖으로 나가거나 두 줄로 깨지지 않는가?
- 새 버튼이 죽은 버튼이 아닌가?
- hover/focus/disabled 상태가 있는가?
- 모달/드롭다운은 외부 클릭으로 닫히는가?
- 스크롤 영역이 푸터나 헤더에 영향을 주지 않는가?
- 모바일/좁은 화면에서 최소한 깨지지 않는가?
- 빌드가 통과하는가?
- 기존 사용자가 만든 변경을 되돌리지 않았는가?

## 명령어 치트시트

```bash
npm install
npm run dev
npm run build
npm audit --audit-level=high
git status --short
git fetch origin
git pull --ff-only origin main
git rebase origin/main
git push -u origin 브랜치명
git push --force-with-lease origin 브랜치명
```

PowerShell에서 Vite dev 서버가 이미 떠 있는지 확인:

```powershell
netstat -ano | Select-String ':5173'
```

## 새 프로젝트에서 이어갈 때 첫 요청 예시

```md
아래 인수인계 컨텍스트를 기준으로 CodeDock 프론트엔드 작업을 이어서 도와줘.
더미 데이터는 영어 모드로 바꾸지 말고, UI 라벨만 번역해.
디자인은 고양이 마스코트 + 글래스모피즘 + KRDS 타이포그래피 기준을 유지해.

[여기에 CODEDOCK_HANDOFF_CONTEXT.md 전체 내용 붙여넣기]
```
