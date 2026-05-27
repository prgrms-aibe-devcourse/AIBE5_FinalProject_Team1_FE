8.1 워크스페이스 기능
팀 단위 공간을 생성하고 관리한다.
기능
회원가입/로그인
워크스페이스 생성
팀원 초대
팀원 역할 관리
프로젝트 생성
GitHub 저장소 연결
역할 예시:
Owner
Maintainer
Developer
Reviewer
Viewer

8.2 프로젝트 기능
하나의 개발 프로젝트를 관리하는 공간이다.
프로젝트 안에 포함되는 것
이슈 목록
PR 목록
PR Review Room
팀 대화
AI 분석 리포트
결정사항 로그
액션아이템

8.3 이슈 보드
간단한 칸반 형태의 이슈 관리 기능을 제공한다.
상태 예시
Todo
In Progress
Review
Done
Blocked
이슈 정보
제목
설명
담당자
우선순위
마감일
관련 PR
댓글
AI 요약
Jira나 Linear처럼 복잡하게 만들기보다는, PR과 연결되는 가벼운 이슈 보드를 목표로 한다.

8.4 PR Review Room
이 프로젝트의 핵심 기능이다.
GitHub PR 하나마다 전용 협업 공간이 생성된다.
PR Review Room 구성
PR 제목
작성자
브랜치 정보
변경 파일 목록
GitHub PR 링크
AI 변경 요약
위험도 점수
위험 항목 목록
리뷰 체크리스트
팀원 대화
결정사항
액션아이템
승인/보류 상태

8.5 협업 대화 기능
완전한 Slack 수준의 메신저를 구현하는 것이 아니라, 개발 작업 단위에 묶인 대화 기능을 제공한다.
MVP 기준 기능
프로젝트 공용 대화
PR별 댓글/스레드
이슈별 댓글/스레드
멘션
코드 블록 작성
메시지 수정/삭제
AI 요약 버튼
제외할 기능
DM
음성 통화
화상회의
복잡한 채널 구조
고급 이모지/리액션
앱 마켓플레이스
Slack 수준의 실시간 협업 기능

8.6 AI PR 분석 기능
PR diff를 기반으로 AI가 변경사항을 분석한다.
기능
PR 변경 요약
위험도 점수 생성
보안 위험 탐지
품질 위험 탐지
리뷰 체크리스트 생성
수정 가이드 생성
예시:
이번 PR은 로그인 API의 토큰 검증 로직을 수정하고, 세션 만료 처리 로직을 추가했습니다.
 다만 refresh token 재발급 API에 rate limit이 적용되어 있지 않아 보안상 주의가 필요합니다.

8.7 AI 대화 요약 기능
PR Room 또는 이슈 댓글에서 오간 대화를 AI가 요약한다.
기능
대화 요약
결정사항 추출
액션아이템 추출
담당자 추출
다음 작업 제안

9. MVP 범위
2~3달 안에 완성하기 위해 MVP는 다음 기능에 집중한다.
반드시 구현할 기능
회원가입/로그인
워크스페이스 생성
팀원 초대
프로젝트 생성
GitHub 저장소 연결
PR 목록 가져오기
PR 상세 정보 조회
PR별 Review Room 생성
PR별 대화/댓글 기능
AI PR 요약
AI 위험도 분석
AI 리뷰 체크리스트 생성
AI 대화 요약
결정사항/액션아이템 추출

10. MVP에서 제외할 기능
범위가 너무 커지는 것을 막기 위해 다음 기능은 1차 MVP에서 제외한다.
Slack 수준의 완전한 실시간 채팅
DM 기능
화상회의/음성회의
복잡한 권한 체계
Jira 수준의 이슈 관리
Notion 수준의 문서 관리
자체 코드 diff viewer 고도화
자동 코드 수정 PR 생성
배포 자동화
외부 Slack/Jira/Notion 연동

11. 화면 구성
11.1 로그인 화면
이메일 로그인 또는 소셜 로그인
회원가입
워크스페이스 선택

11.2 워크스페이스 대시보드
사용자가 속한 팀과 프로젝트를 보여준다.
표시 정보
내 워크스페이스 목록
최근 활동
진행 중인 프로젝트
리뷰 대기 PR
위험도 높은 PR

11.3 프로젝트 대시보드
프로젝트의 전체 상태를 보여준다.
표시 정보
열린 PR 수
위험도 높은 PR 수
진행 중 이슈 수
리뷰 대기 PR
최근 결정사항
오늘의 액션아이템

11.4 이슈 보드 화면
간단한 칸반 보드 형태로 이슈를 관리한다.
컬럼
Todo
In Progress
Review
Done
Blocked

11.5 PR 목록 화면
GitHub에서 가져온 PR 목록을 보여준다.
표시 정보
PR 제목
작성자
상태
위험도 점수
리뷰 상태
관련 이슈
마지막 활동 시간

11.6 PR Review Room 화면
가장 중요한 화면이다.
왼쪽 영역
PR 정보
변경 파일 목록
AI 변경 요약
위험도 점수
위험 항목
리뷰 체크리스트
오른쪽 영역
팀원 대화
댓글/스레드
결정사항
액션아이템
하단 기능
메시지 입력
AI 요약하기
결정사항 추출
액션아이템 추출
승인
보류
GitHub PR 열기

12. 기술 스택 예시
프론트엔드
Next.js
TypeScript
Tailwind CSS
React Query
Zustand 또는 Redux Toolkit
백엔드
Spring Boot 또는 FastAPI
REST API
JWT 인증
GitHub API 연동
AI 분석 API
메시지/댓글 API
데이터베이스
PostgreSQL
비동기 처리
Redis Queue
Celery, BullMQ, 또는 Spring Scheduler
AI
LLM API
PR diff 요약
위험도 분석
체크리스트 생성
대화 요약
액션아이템 추출
배포
Docker
GitHub Actions
Vercel
Render, Fly.io, AWS, 또는 Railway

13. 데이터베이스 주요 테이블 예시
users
workspaces
workspace_members
projects
github_repositories
issues
pull_requests
pr_files
messages
message_threads
ai_analysis_results
risk_items
review_checklists
decisions
action_items

14. 5명 역할 분배
역할
담당 내용
1명
GitHub 연동, PR/Repo 동기화, Webhook
1명
협업 기능, 메시지/댓글, PR Review Room 백엔드
1명
AI 분석, PR 요약, 위험도 분석, 체크리스트 생성
1명
프론트엔드, 워크스페이스/대시보드/PR Room UI
1명
이슈 보드, 배포, 테스트, 발표 시나리오


15. 발표 데모 시나리오
데모 흐름
팀원이 GitHub에 PR을 생성한다.
SecureFlow Workspace에서 PR이 동기화된다.
PR Review Room이 생성된다.
AI가 PR 변경사항을 요약한다.
AI가 위험도와 리뷰 체크리스트를 생성한다.
팀원들이 PR Room에서 대화한다.
AI가 대화 내용을 요약한다.
AI가 결정사항과 액션아이템을 추출한다.
리뷰어가 승인 또는 보류한다.
프로젝트 대시보드에서 리뷰 상태와 액션아이템을 확인한다.

16. 예시 데모 PR
위험한 PR을 일부러 만들어서 데모하면 좋다.
예시 변경사항:
.env.example에 API key 형태의 문자열 추가
인증이 필요한 API에 middleware 누락
사용자 입력값을 그대로 LLM prompt에 삽입
테스트 코드 없이 핵심 로직 변경
CORS 설정을 *로 변경
AI 분석 결과 예시:
이 PR은 사용자 프로필 수정 API를 추가합니다.
 다만 인증 미들웨어가 적용되지 않은 라우트가 존재하며, 사용자 입력값이 별도 검증 없이 LLM 프롬프트에 삽입되고 있습니다.
 보안 위험도가 높으므로 머지 전 인증 처리와 입력값 검증이 필요합니다.

17. 차별점
SecureFlow Workspace는 단순한 채팅 서비스가 아니다.
또한 단순한 GitHub PR 분석 도구도 아니다.
핵심 차별점은 다음과 같다.
PR과 이슈 같은 개발 작업 단위에 대화, AI 분석, 결정사항, 액션아이템이 함께 묶인다.
Slack에서는 대화가 채널에 흩어진다.
 GitHub에서는 코드 리뷰 중심이라 팀 전체 논의와 액션아이템 관리가 약하다.
 Jira는 이슈 관리는 강하지만 PR 대화와 AI 분석은 약하다.
SecureFlow Workspace는 이 사이를 연결한다.

18. 기대 효과
PR 리뷰 과정이 명확해진다.
팀원 간 논의가 PR 단위로 남는다.
코드 변경사항을 빠르게 이해할 수 있다.
보안/품질 위험을 사전에 발견할 수 있다.
리뷰 체크리스트를 자동으로 얻을 수 있다.
결정사항과 액션아이템을 자동으로 정리할 수 있다.
작은 개발팀도 체계적인 리뷰 프로세스를 운영할 수 있다.

19. 리스크와 대응 방안
리스크 1. 범위가 너무 커질 수 있음
대응:
Slack, Jira, GitHub, Notion을 모두 대체하려 하지 않는다.
 MVP에서는 PR Review Room을 핵심으로 한다.

리스크 2. 채팅 구현이 커질 수 있음
대응:
완전한 실시간 메신저가 아니라 PR/이슈별 댓글형 대화로 시작한다.
 필요하면 프로젝트 공용 채팅만 WebSocket으로 구현한다.

리스크 3. AI 분석 정확도가 낮을 수 있음
대응:
AI만 사용하지 않고 룰 기반 분석과 함께 사용한다.
 AI는 주로 요약, 설명, 체크리스트 생성에 활용한다.

리스크 4. 보안 도구처럼 과장될 수 있음
대응:
“완벽한 취약점 탐지”가 아니라 “소규모 팀을 위한 리뷰 보조 도구”로 포지셔닝한다.

20. 최종 정리
SecureFlow Workspace는 개발팀이 우리 플랫폼 안에서 협업할 수 있도록 돕는 AI 기반 개발 협업 서비스다.
핵심은 모든 협업 기능을 다 만드는 것이 아니라, PR과 이슈를 중심으로 대화와 AI 분석을 연결하는 것이다.
최종적으로 이 서비스는 다음과 같이 설명할 수 있다.
SecureFlow Workspace는 개발팀이 GitHub PR과 이슈를 중심으로 대화하고, AI가 코드 변경 위험도, 리뷰 포인트, 결정사항, 액션아이템을 자동 정리해주는 개발 협업 플랫폼입니다.
MVP에서는 특히 다음 흐름에 집중한다.
GitHub PR 동기화 → PR Review Room 생성 → 팀원 대화 → AI PR 분석 → AI 대화 요약 → 결정사항/액션아이템 정리
이 흐름만 제대로 구현해도, 단순 채팅 서비스나 단순 코드 리뷰 도구가 아니라 개발팀 협업을 실제로 개선하는 서비스로 보일 수 있다.

