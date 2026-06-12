import { FileText, Sparkles, BookOpen, FileCode, MessageSquare, Package, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";

interface DocsPageProps {
  embedded?: boolean;
  workspaceId?: number;
}

type DocumentCategoryId = 'pr-summary' | 'manual' | 'meeting' | 'release';
type DocumentSource = 'AI' | 'Template';

interface DocumentItem {
  id: number;
  category: DocumentCategoryId;
  title: string;
  titleEn?: string;
  generatedBy: DocumentSource;
  createdAt: string;
  updatedAt: string;
  author: string;
  authorEn?: string;
  relatedPR: number | null;
  content: string;
  contentEn?: string;
}

interface DocumentTemplate {
  id: string;
  category: DocumentCategoryId;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  tags: string[];
  tagsEn: string[];
  icon: typeof FileText;
  color: string;
  content: string;
  contentEn: string;
}

const CREATED_DOCS_STORAGE_KEY = "codedock-created-docs";

function getSavedCreatedDocs() {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(CREATED_DOCS_STORAGE_KEY);
    if (!storedValue) return [];

    const parsed = JSON.parse(storedValue);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((doc): doc is DocumentItem =>
      doc
      && typeof doc.id === "number"
      && typeof doc.category === "string"
      && typeof doc.title === "string"
      && (doc.generatedBy === "AI" || doc.generatedBy === "Template")
      && typeof doc.createdAt === "string"
      && typeof doc.updatedAt === "string"
      && typeof doc.author === "string"
      && typeof doc.content === "string"
    );
  } catch {
    return [];
  }
}

export function DocsPage({ embedded = false, workspaceId }: DocsPageProps) {
  const { language } = useLanguage();
  const [selectedDoc, setSelectedDoc] = useState<number | null>(1);
  const [createdDocs, setCreatedDocs] = useState<DocumentItem[]>(() => getSavedCreatedDocs());
  const [draftTemplate, setDraftTemplate] = useState<DocumentTemplate | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [docListTab, setDocListTab] = useState<"templates" | "documents">("templates");
  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(CREATED_DOCS_STORAGE_KEY, JSON.stringify(createdDocs));
    } catch {
      // Local edits still work in memory if storage is unavailable.
    }
  }, [createdDocs]);

  const categories = [
    { id: 'pr-summary', name: 'PR 요약', nameEn: 'PR Summary', icon: FileCode, color: 'var(--neon-cyan)', count: 8 },
    { id: 'manual', name: '기술 문서', nameEn: 'Technical Docs', icon: BookOpen, color: 'var(--matrix-green)', count: 5 },
    { id: 'meeting', name: '회의록', nameEn: 'Meetings', icon: MessageSquare, color: '#FFD93D', count: 12 },
    { id: 'release', name: '운영/릴리즈', nameEn: 'Ops & Release', icon: Package, color: 'var(--electric-blue)', count: 3 }
  ];

  const documentTemplates: DocumentTemplate[] = [
    {
      id: 'pr-review-summary',
      category: 'pr-summary',
      title: 'PR 리뷰 요약',
      titleEn: 'PR Review Summary',
      description: '변경 파일, 위험 신호, 리뷰 체크리스트를 한 문서로 정리합니다.',
      descriptionEn: 'Summarize changed files, risks, and review checklist in one document.',
      tags: ['PR', '리뷰', '위험'],
      tagsEn: ['PR', 'Review', 'Risk'],
      icon: FileCode,
      color: 'var(--neon-cyan)',
      content: `# PR 리뷰 요약

## 변경 목적
- 이번 PR이 해결하려는 문제:
- 사용자에게 바뀌는 점:
- 관련 이슈:

## 주요 변경 파일
- \`src/\`: 핵심 변경 내용
- \`test/\`: 검증 내용

## 위험 신호
- 인증/권한:
- 입력값 검증:
- 성능 영향:

## 리뷰 체크리스트
- [ ] 변경 범위가 PR 목적과 일치합니다.
- [ ] 보안 영향이 검토되었습니다.
- [ ] 테스트가 추가되거나 기존 테스트가 갱신되었습니다.

## 팀 결정
- 결정:
- 담당자:
- 후속 작업:`,
      contentEn: `# PR Review Summary

## Purpose
- Problem this PR solves:
- User-facing change:
- Related issue:

## Key Changed Files
- \`src/\`: core changes
- \`test/\`: verification changes

## Risk Signals
- Authentication/authorization:
- Input validation:
- Performance impact:

## Review Checklist
- [ ] The change scope matches the PR purpose.
- [ ] Security impact has been reviewed.
- [ ] Tests were added or updated.

## Team Decision
- Decision:
- Owner:
- Follow-up:`
    },
    {
      id: 'api-change-spec',
      category: 'manual',
      title: 'API 변경 명세',
      titleEn: 'API Change Specification',
      description: '엔드포인트, 요청/응답, 오류 코드, 호환성 변경을 정리합니다.',
      descriptionEn: 'Document endpoints, request/response shape, error codes, and compatibility notes.',
      tags: ['API', '명세', '호환성'],
      tagsEn: ['API', 'Spec', 'Compatibility'],
      icon: BookOpen,
      color: 'var(--matrix-green)',
      content: `# API 변경 명세

## 개요
- 변경 대상 API:
- 변경 이유:
- 배포 버전:

## 엔드포인트
\`\`\`http
METHOD /api/example
\`\`\`

## 요청
\`\`\`json
{
  "field": "value"
}
\`\`\`

## 응답
\`\`\`json
{
  "id": 1,
  "status": "ok"
}
\`\`\`

## 오류 코드
- 400: 잘못된 요청
- 401: 인증 필요
- 500: 서버 오류

## 호환성
- 하위 호환 여부:
- 마이그레이션 필요 여부:`,
      contentEn: `# API Change Specification

## Overview
- Target API:
- Reason for change:
- Release version:

## Endpoint
\`\`\`http
METHOD /api/example
\`\`\`

## Request
\`\`\`json
{
  "field": "value"
}
\`\`\`

## Response
\`\`\`json
{
  "id": 1,
  "status": "ok"
}
\`\`\`

## Error Codes
- 400: Bad request
- 401: Authentication required
- 500: Server error

## Compatibility
- Backward compatible:
- Migration needed:`
    },
    {
      id: 'erd-change-log',
      category: 'manual',
      title: 'ERD 변경 기록',
      titleEn: 'ERD Change Log',
      description: '엔티티, 관계, 컬럼 변경과 데이터 마이그레이션 여부를 남깁니다.',
      descriptionEn: 'Track entity, relationship, column changes, and migration needs.',
      tags: ['ERD', 'DB', '마이그레이션'],
      tagsEn: ['ERD', 'DB', 'Migration'],
      icon: FileText,
      color: 'var(--soft-mint)',
      content: `# ERD 변경 기록

## 변경 요약
- 변경 날짜:
- 변경 담당자:
- 관련 PR/이슈:

## 엔티티 변경
- 추가:
- 수정:
- 삭제:

## 관계 변경
- 새 관계:
- 변경된 관계:
- 제거된 관계:

## 컬럼 변경
- 추가 컬럼:
- 수정 컬럼:
- 삭제 컬럼:

## 마이그레이션
- 데이터 이전 필요 여부:
- 롤백 전략:
- 배포 전 확인 사항:`,
      contentEn: `# ERD Change Log

## Change Summary
- Date:
- Owner:
- Related PR/issue:

## Entity Changes
- Added:
- Updated:
- Deleted:

## Relationship Changes
- New relationships:
- Changed relationships:
- Removed relationships:

## Column Changes
- Added columns:
- Updated columns:
- Deleted columns:

## Migration
- Data migration needed:
- Rollback strategy:
- Pre-release checks:`
    },
    {
      id: 'decision-record',
      category: 'manual',
      title: '기술 결정 기록',
      titleEn: 'Architecture Decision Record',
      description: '왜 이 선택을 했는지 배경, 대안, 결정, 영향 범위를 남깁니다.',
      descriptionEn: 'Record context, alternatives, decision, and impact for technical choices.',
      tags: ['ADR', '설계', '결정'],
      tagsEn: ['ADR', 'Design', 'Decision'],
      icon: FileText,
      color: '#B692FF',
      content: `# 기술 결정 기록

## 배경
- 문제 상황:
- 제약 조건:
- 관련 팀/서비스:

## 검토한 대안
1. 대안 A
2. 대안 B
3. 대안 C

## 결정
- 선택한 방향:
- 결정 이유:

## 영향 범위
- 코드:
- 운영:
- 사용자 경험:

## 후속 작업
- [ ] 문서 반영
- [ ] 테스트 추가
- [ ] 팀 공유`,
      contentEn: `# Architecture Decision Record

## Context
- Problem:
- Constraints:
- Related teams/services:

## Alternatives
1. Option A
2. Option B
3. Option C

## Decision
- Selected direction:
- Reason:

## Impact
- Code:
- Operations:
- User experience:

## Follow-up
- [ ] Update documentation
- [ ] Add tests
- [ ] Share with team`
    },
    {
      id: 'meeting-note',
      category: 'meeting',
      title: '회의록',
      titleEn: 'Meeting Notes',
      description: '참석자, 논의 내용, 결정 사항, 액션 아이템을 정리합니다.',
      descriptionEn: 'Capture attendees, discussion, decisions, and action items.',
      tags: ['회의', '결정', '액션'],
      tagsEn: ['Meeting', 'Decision', 'Action'],
      icon: MessageSquare,
      color: '#FFD93D',
      content: `# 회의록

## 기본 정보
- 일시:
- 참석자:
- 주제:

## 논의 내용
- 안건 1:
- 안건 2:
- 안건 3:

## 결정 사항
- 결정 1:
- 결정 2:

## 액션 아이템
- [ ] 담당자 / 작업 / 기한
- [ ] 담당자 / 작업 / 기한

## 다음 회의
- 일정:
- 준비 사항:`,
      contentEn: `# Meeting Notes

## Basics
- Time:
- Attendees:
- Topic:

## Discussion
- Agenda 1:
- Agenda 2:
- Agenda 3:

## Decisions
- Decision 1:
- Decision 2:

## Action Items
- [ ] Owner / Task / Due date
- [ ] Owner / Task / Due date

## Next Meeting
- Schedule:
- Preparation:`
    },
    {
      id: 'release-note',
      category: 'release',
      title: '릴리즈 노트',
      titleEn: 'Release Notes',
      description: '새 기능, 버그 수정, 호환성, 배포 체크리스트를 정리합니다.',
      descriptionEn: 'Organize features, fixes, compatibility notes, and release checklist.',
      tags: ['릴리즈', '배포', '변경'],
      tagsEn: ['Release', 'Deploy', 'Change'],
      icon: Package,
      color: 'var(--electric-blue)',
      content: `# 릴리즈 노트

## 릴리즈 정보
- 버전:
- 배포일:
- 담당자:

## 새 기능
- 기능 1:
- 기능 2:

## 버그 수정
- 수정 1:
- 수정 2:

## 변경 사항
- API:
- 데이터베이스:
- 설정:

## 배포 체크리스트
- [ ] 테스트 통과
- [ ] 마이그레이션 확인
- [ ] 롤백 계획 확인
- [ ] 팀 공지 완료`,
      contentEn: `# Release Notes

## Release Info
- Version:
- Release date:
- Owner:

## New Features
- Feature 1:
- Feature 2:

## Bug Fixes
- Fix 1:
- Fix 2:

## Changes
- API:
- Database:
- Configuration:

## Release Checklist
- [ ] Tests passed
- [ ] Migration checked
- [ ] Rollback plan checked
- [ ] Team announcement sent`
    },
    {
      id: 'incident-report',
      category: 'release',
      title: '장애 대응 보고서',
      titleEn: 'Incident Report',
      description: '장애 영향, 원인, 조치, 재발 방지책을 기록합니다.',
      descriptionEn: 'Record incident impact, root cause, response, and prevention actions.',
      tags: ['운영', '장애', '회고'],
      tagsEn: ['Ops', 'Incident', 'Review'],
      icon: FileText,
      color: '#FF6B6B',
      content: `# 장애 대응 보고서

## 장애 개요
- 발생 시간:
- 종료 시간:
- 영향 범위:
- 심각도:

## 타임라인
- 00:00 감지
- 00:00 원인 파악
- 00:00 복구 완료

## 원인
- 직접 원인:
- 기여 요인:

## 조치 내용
- 즉시 조치:
- 추가 조치:

## 재발 방지
- [ ] 모니터링 강화
- [ ] 알림 기준 조정
- [ ] 테스트/문서 보완`,
      contentEn: `# Incident Report

## Overview
- Start time:
- End time:
- Impact:
- Severity:

## Timeline
- 00:00 detected
- 00:00 root cause identified
- 00:00 recovered

## Cause
- Direct cause:
- Contributing factors:

## Response
- Immediate action:
- Additional action:

## Prevention
- [ ] Improve monitoring
- [ ] Adjust alert thresholds
- [ ] Update tests/docs`
    },
    {
      id: 'test-plan',
      category: 'manual',
      title: '테스트 계획서',
      titleEn: 'Test Plan',
      description: '테스트 범위, 케이스, 담당자, 완료 기준을 정합니다.',
      descriptionEn: 'Define test scope, cases, owners, and completion criteria.',
      tags: ['테스트', 'QA', '검증'],
      tagsEn: ['Test', 'QA', 'Verify'],
      icon: BookOpen,
      color: 'var(--neon-cyan)',
      content: `# 테스트 계획서

## 테스트 목표
- 검증할 기능:
- 제외 범위:

## 테스트 환경
- 브라우저/OS:
- 서버 환경:
- 테스트 계정:

## 테스트 케이스
- [ ] 정상 흐름
- [ ] 예외 흐름
- [ ] 권한/인증
- [ ] 반응형 화면

## 완료 기준
- 필수 케이스 통과:
- 발견된 결함 처리:
- 승인 담당자:`,
      contentEn: `# Test Plan

## Goal
- Feature to verify:
- Out of scope:

## Environment
- Browser/OS:
- Server environment:
- Test account:

## Test Cases
- [ ] Happy path
- [ ] Error path
- [ ] Permission/authentication
- [ ] Responsive UI

## Completion Criteria
- Required cases passed:
- Defects handled:
- Approver:`
    }
  ];

  const baseDocs: DocumentItem[] = [
    {
      id: 1,
      category: 'pr-summary',
      title: 'PR #234 인증 미들웨어 추가 요약',
      generatedBy: 'AI',
      createdAt: '2시간 전',
      updatedAt: '1시간 전',
      author: 'AI 자동생성',
      relatedPR: 234,
      content: `# PR #234: 인증 미들웨어 추가

## 변경 요약
이 PR은 JWT 기반 인증 미들웨어를 추가하고 사용자 관련 API 라우트에 적용합니다.

## 주요 변경사항
- \`src/middleware/auth.ts\`: JWT 토큰 검증 미들웨어 추가
- \`src/routes/user.ts\`: 인증 미들웨어 적용
- \`src/routes/profile.ts\`: 인증 미들웨어 적용
- \`src/config/security.ts\`: 보안 설정 업데이트

## 보안 이슈
⚠️ **높음**: refresh token 재발급 API에 요청 제한 미적용
⚠️ **보통**: 토큰 검증 실패 시 에러 메시지에 민감한 정보 포함 가능성

## 리뷰 체크리스트
- [ ] refresh token API에 요청 제한 적용
- [ ] 에러 메시지에서 민감한 정보 제거
- [x] 토큰 만료 시간 환경변수로 관리
- [x] HTTPS 연결에서만 쿠키 전송하도록 설정
- [ ] 테스트 커버리지 80% 이상으로 개선

## 결정사항
- 요청 제한을 사용자 ID당 분당 5회로 설정
- 토큰 검증 실패 시 에러 메시지는 "Invalid token"으로 통일

## 다음 단계
1. 요청 제한 미들웨어 추가 (담당: 김진필)
2. 에러 메시지 검토 및 수정 (담당: 김진필)
3. 테스트 케이스 추가 (담당: 김진필)`
    },
    {
      id: 2,
      category: 'manual',
      title: '관리자 페이지 상품 등록 가이드',
      generatedBy: 'AI',
      createdAt: '1일 전',
      updatedAt: '12시간 전',
      author: 'AI 자동생성',
      relatedPR: null,
      content: `# 관리자 페이지 상품 등록 가이드

## 개요
이 매뉴얼은 관리자 페이지에서 새로운 상품을 등록하는 방법을 단계별로 설명합니다.

## 사전 준비
- 관리자 계정 로그인 필요
- 상품 이미지 파일 (JPG, PNG, 최대 5MB)
- 상품 상세 정보

## 등록 절차

### 1단계: 상품 목록 페이지 이동
1. 왼쪽 사이드바에서 "상품 관리" 클릭
2. "상품 목록" 메뉴 선택

### 2단계: 새 상품 등록 시작
1. 우측 상단의 "새 상품 등록" 버튼 클릭
2. 상품 등록 폼이 표시됩니다

### 3단계: 기본 정보 입력
1. **상품명**: 고객에게 표시될 상품 이름 입력
2. **카테고리**: 드롭다운에서 적절한 카테고리 선택
3. **가격**: 판매 가격 입력 (원화 기준)
4. **재고**: 초기 재고 수량 입력

### 4단계: 상품 이미지 업로드
1. "이미지 선택" 버튼 클릭
2. 파일 선택 대화상자에서 이미지 선택
3. 미리보기에서 이미지 확인
4. 추가 이미지가 있다면 "이미지 추가" 버튼으로 최대 5장까지 등록 가능

### 5단계: 상세 정보 입력
1. **상품 설명**: 고객에게 제공할 상세 설명 입력
2. **옵션 설정**: 사이즈, 색상 등의 옵션이 있다면 추가
3. **배송 정보**: 배송비, 배송 기간 입력

### 6단계: 저장
1. 모든 정보 입력 후 "저장" 버튼 클릭
2. 확인 메시지가 표시되면 "확인" 클릭
3. 상품 목록 페이지로 자동 이동

## 주의사항
⚠️ 상품명과 가격은 필수 입력 항목입니다
⚠️ 이미지는 JPG 또는 PNG 형식만 지원합니다
⚠️ 재고가 0이면 자동으로 "품절" 상태로 표시됩니다

## 문제 해결
**Q: 이미지 업로드가 안 돼요**
A: 파일 크기가 5MB를 초과하는지 확인하세요. JPG 또는 PNG 형식인지도 확인하세요.

**Q: 저장 버튼이 비활성화되어 있어요**
A: 필수 입력 항목(상품명, 가격)을 모두 입력했는지 확인하세요.`
    },
    {
      id: 3,
      category: 'meeting',
      title: '2024-05-15 스프린트 회고',
      generatedBy: 'AI',
      createdAt: '5시간 전',
      updatedAt: '5시간 전',
      author: 'AI 자동생성',
      relatedPR: null,
      content: `# 2024-05-15 스프린트 회고

**일시**: 2024년 5월 15일 14:00 - 15:30
**참석자**: 김재준, 김진필, 김준우, 김진현, 안현

## 진행 상황
- 인증 시스템 구현 완료 (PR #234)
- API 명세 문서화 80% 완료
- ERD 설계 완료

## 잘한 점
✅ PR 리뷰 속도가 이전 스프린트 대비 30% 향상
✅ 팀원 간 코드 리뷰 코멘트 품질 개선
✅ CI/CD 파이프라인 안정화

## 개선할 점
⚠️ 테스트 커버리지가 목표치(80%)에 미달 (현재 67%)
⚠️ API 문서화가 코드 변경에 비해 지연됨
⚠️ 보안 리뷰 프로세스가 체계화되지 않음

## 결정사항
1. **보안 룰 엔진 도입**: refresh token API에 요청 제한 적용 (담당: 김진필)
2. **문서 자동화**: API 변경 시 자동으로 문서 갱신되도록 프로세스 개선 (담당: 김준우)
3. **테스트 강화**: PR 머지 기준을 커버리지 75% 이상으로 상향 (전체)

## 액션아이템
- [ ] 요청 제한 미들웨어 구현 및 적용 (김진필, ~5/20)
- [ ] API 문서 자동 생성 스크립트 작성 (김준우, ~5/22)
- [ ] 테스트 커버리지 75% 달성 (전체, ~5/25)
- [ ] 보안 체크리스트 문서 작성 (김재준, ~5/18)

## 다음 스프린트 목표
- 사용자 프로필 기능 완료
- API 문서화 100% 달성
- 테스트 커버리지 75% 이상 유지
- 보안 리뷰 프로세스 정립`
    },
    {
      id: 4,
      category: 'release',
      title: 'v1.2.0 릴리즈 노트',
      generatedBy: 'AI',
      createdAt: '3일 전',
      updatedAt: '3일 전',
      author: 'AI 자동생성',
      relatedPR: null,
      content: `# v1.2.0 릴리즈 노트

**릴리즈 일자**: 2024년 5월 12일
**버전**: 1.2.0

## 🎉 새로운 기능
- **JWT 인증 시스템**: 보안 강화를 위한 JWT 기반 인증 미들웨어 추가
- **사용자 프로필 API**: 사용자 정보 조회 및 수정 기능 추가
- **PR 자동 분석**: AI 기반 PR 위험도 분석 기능 도입

## 🐛 버그 수정
- CORS 설정 오류로 인한 프론트엔드 요청 실패 문제 해결
- 사용자 세션 만료 시 무한 로딩 문제 수정
- API 응답 시간 개선 (평균 200ms → 120ms)

## 🔧 개선사항
- API 문서 자동 생성 기능 추가
- ERD 다이어그램 자동 갱신
- 테스트 커버리지 67% 달성

## ⚠️ 호환성 변경
없음

## 📦 의존성 업데이트
- express: 4.18.2 → 4.19.0
- jsonwebtoken: 9.0.0 → 9.0.2
- typescript: 5.2.0 → 5.4.5

## 🔐 보안
- refresh token 재발급 API에 요청 제한 적용
- 민감한 정보가 에러 메시지에 노출되지 않도록 개선
- HTTPS 전용 쿠키 설정 강제

## 📝 문서
- API 명세 문서 업데이트
- ERD 다이어그램 갱신
- 배포 가이드 추가

## 🙏 기여자
- 김진필 (인증 시스템)
- 김준우 (API 문서화)
- 김진현 (CORS 수정)
- 김재준 (릴리즈 관리)

## 다음 버전 계획 (v1.3.0)
- 실시간 알림 시스템
- 팀 채팅 기능 강화
- AI 매뉴얼 자동 생성`
    }
  ];

  const docs = [...createdDocs, ...baseDocs];
  const selectedDocData = docs.find(doc => doc.id === selectedDoc);
  const docContentEn: Record<number, string> = {
    1: `# PR #234: Add authentication middleware

## Change Summary
This PR adds JWT-based authentication middleware and applies it to user-related API routes.

## Key Changes
- \`src/middleware/auth.ts\`: add JWT token validation middleware
- \`src/routes/user.ts\`: apply authentication middleware
- \`src/routes/profile.ts\`: apply authentication middleware
- \`src/config/security.ts\`: update security settings

## Security Issues
Warning **High**: rate limiting is missing on the refresh token API.
Warning **Medium**: token validation errors may expose sensitive information.

## Review Checklist
- [ ] Apply rate limiting to the refresh token API
- [ ] Remove sensitive information from error messages
- [x] Manage token expiration time through environment variables
- [x] Send cookies only over HTTPS connections
- [ ] Improve test coverage to 80% or higher

## Decisions
- Set refresh token API rate limiting to 5 requests per minute per user ID
- Use "Invalid token" consistently for token validation failures

## Next Steps
1. Add rate limit middleware (Owner: Dev Kim)
2. Review and update error messages (Owner: Dev Kim)
3. Add test cases (Owner: Dev Kim)`,
    2: `# Admin Product Registration Guide

## Overview
This manual explains how to register a new product in the admin page step by step.

## Prerequisites
- Admin account access
- Product image file (JPG, PNG, up to 5 MB)
- Product detail information

## Registration Steps

### Step 1: Open the product list
1. Click "Product Management" in the left sidebar
2. Select the "Product List" menu

### Step 2: Start creating a product
1. Click the "New Product" button in the upper right
2. The product registration form appears

### Step 3: Enter basic information
1. **Product name**: enter the customer-facing product name
2. **Category**: choose the proper category from the dropdown
3. **Price**: enter the sale price
4. **Stock**: enter the initial stock quantity

### Step 4: Upload product images
1. Click "Select Image"
2. Choose an image in the file dialog
3. Check the preview
4. Add up to five images if needed

### Step 5: Enter detailed information
1. **Product description**: enter customer-facing details
2. **Options**: add size, color, or other options if needed
3. **Shipping information**: enter delivery fee and period

### Step 6: Save
1. Click "Save" after entering all information
2. Confirm the prompt
3. Move back to the product list automatically

## Notes
Warning: product name and price are required.
Warning: only JPG and PNG images are supported.
Warning: products with zero stock are shown as sold out.

## Troubleshooting
**Q: Image upload does not work**
A: Check whether the file is larger than 5 MB and confirm it is JPG or PNG.

**Q: The save button is disabled**
A: Check that every required field, including product name and price, is filled in.`,
    3: `# 2024-05-15 Sprint Retrospective

**Time**: May 15, 2024, 14:00 - 15:30
**Attendees**: Dev Kim, Reviewer Park, Code Lee, Lead Choi

## Progress
- Authentication system completed (PR #234)
- API specification documentation 80% complete
- ERD design completed

## What Went Well
- PR review speed improved by 30% from the previous sprint
- Code review comment quality improved across the team
- CI/CD pipeline stabilized

## Areas to Improve
- Test coverage is below the 80% target (currently 67%)
- API documentation lags behind code changes
- Security review process is not yet systematic

## Decisions
1. **Introduce security rule engine**: apply rate limiting to the refresh token API (Owner: Dev Kim)
2. **Automate documentation**: improve the process so API changes update docs automatically (Owner: Reviewer Park)
3. **Strengthen tests**: raise PR merge coverage criteria to 75% or higher (All)

## Action Items
- [ ] Implement and apply rate limit middleware (Dev Kim, by 5/20)
- [ ] Write API documentation generation script (Reviewer Park, by 5/22)
- [ ] Reach 75% test coverage (All, by 5/25)
- [ ] Write security checklist document (Lead Choi, by 5/18)

## Next Sprint Goals
- Complete user profile features
- Reach 100% API documentation coverage
- Maintain test coverage at 75% or higher
- Establish the security review process`,
    4: `# v1.2.0 Release Notes

**Release date**: May 12, 2024
**Version**: 1.2.0

## New Features
- **JWT authentication system**: added JWT-based authentication middleware for stronger security
- **User profile API**: added user information lookup and update features
- **Automatic PR analysis**: introduced AI-based PR risk analysis

## Bug Fixes
- Fixed frontend request failures caused by CORS configuration
- Fixed infinite loading when user sessions expire
- Improved API response time (average 200 ms to 120 ms)

## Improvements
- Added automatic API documentation generation
- Added automatic ERD diagram refresh
- Reached 67% test coverage

## Breaking Changes
None

## Dependency Updates
- express: 4.18.2 -> 4.19.0
- jsonwebtoken: 9.0.0 -> 9.0.2
- typescript: 5.2.0 -> 5.4.5

## Security
- Applied rate limiting to the refresh token API
- Prevented sensitive information from appearing in error messages
- Enforced HTTPS-only cookie settings

## Documentation
- Updated API specification documents
- Refreshed ERD diagrams
- Added deployment guide

## Contributors
- Dev Kim (authentication system)
- Reviewer Park (API documentation)
- Code Lee (CORS fix)
- Lead Choi (release management)

## Next Version Plan (v1.3.0)
- Real-time notification system
- Stronger team chat features
- Automatic AI manual generation`,
  };
  const selectedDocContent = selectedDocData
    ? language === "en"
      ? selectedDocData.contentEn ?? docContentEn[selectedDocData.id] ?? selectedDocData.content
      : selectedDocData.content
    : "";

  const getCategoryLabel = (category: typeof categories[number]) => (
    language === "en" ? category.nameEn : category.name
  );

  const getDocTitle = (doc: DocumentItem) => (
    language === "en" ? doc.titleEn ?? doc.title : doc.title
  );

  const getDocAuthor = (doc: DocumentItem) => {
    if (language !== "en") return doc.author;
    return doc.authorEn ?? (doc.author === "AI 자동생성" ? "AI generated" : doc.author);
  };

  const handleSelectTemplate = (template: DocumentTemplate) => {
    setEditingDocId(null);
    setEditTitle("");
    setEditContent("");
    setDraftTemplate(template);
    setDraftTitle(language === "en" ? template.titleEn : template.title);
    setDraftContent(language === "en" ? template.contentEn : template.content);
    setSelectedDoc(null);
  };

  const handleCancelDraft = () => {
    setDraftTemplate(null);
    setDraftTitle("");
    setDraftContent("");
    setSelectedDoc(docs[0]?.id ?? null);
  };

  const handleRegisterDraft = () => {
    if (!draftTemplate || !draftTitle.trim() || !draftContent.trim()) return;

    const nextId = Date.now();
    const newDoc: DocumentItem = {
      id: nextId,
      category: draftTemplate.category,
      title: language === "en" ? draftTemplate.title : draftTitle.trim(),
      titleEn: language === "en" ? draftTitle.trim() : draftTemplate.titleEn,
      generatedBy: 'Template',
      createdAt: language === "en" ? "Just now" : "방금",
      updatedAt: language === "en" ? "Just now" : "방금",
      author: "사용자 작성",
      authorEn: "User draft",
      relatedPR: null,
      content: language === "en" ? draftTemplate.content : draftContent.trim(),
      contentEn: language === "en" ? draftContent.trim() : draftTemplate.contentEn
    };

    setCreatedDocs((prevDocs) => [newDoc, ...prevDocs]);
    setSelectedDoc(nextId);
    setDocListTab("documents");
    setEditingDocId(null);
    setDraftTemplate(null);
    setDraftTitle("");
    setDraftContent("");
  };

  const handleGenerateAiDocument = (template: DocumentTemplate) => {
    const nextId = Date.now();
    const generatedTitle = `${template.title} AI 자동 생성`;
    const generatedTitleEn = `AI Generated ${template.titleEn}`;
    const generatedContent = `# ${generatedTitle}

## AI 자동 생성 초안
- 선택한 템플릿: ${template.title}
- 문서 유형: ${categories.find((category) => category.id === template.category)?.name ?? "문서"}
- 생성 상태: 검토 필요

${template.content}`;
    const generatedContentEn = `# ${generatedTitleEn}

## AI Generated Draft
- Template: ${template.titleEn}
- Document type: ${categories.find((category) => category.id === template.category)?.nameEn ?? "Document"}
- Status: Needs review

${template.contentEn}`;

    const newDoc: DocumentItem = {
      id: nextId,
      category: template.category,
      title: generatedTitle,
      titleEn: generatedTitleEn,
      generatedBy: 'AI',
      createdAt: language === "en" ? "Just now" : "방금",
      updatedAt: language === "en" ? "Just now" : "방금",
      author: "AI 자동 생성",
      authorEn: "AI generated",
      relatedPR: template.category === "pr-summary" ? 234 : null,
      content: generatedContent,
      contentEn: generatedContentEn
    };

    setCreatedDocs((prevDocs) => [newDoc, ...prevDocs]);
    setSelectedDoc(nextId);
    setDocListTab("documents");
    setEditingDocId(null);
    setDraftTemplate(null);
    setDraftTitle("");
    setDraftContent("");
  };

  const isCreatedDoc = (docId: number) => createdDocs.some((doc) => doc.id === docId);

  const handleStartEditDocument = (doc: DocumentItem) => {
    if (!isCreatedDoc(doc.id)) return;

    setDraftTemplate(null);
    setEditingDocId(doc.id);
    setEditTitle(language === "en" ? doc.titleEn ?? doc.title : doc.title);
    setEditContent(language === "en" ? doc.contentEn ?? doc.content : doc.content);
  };

  const handleCancelEditDocument = () => {
    setEditingDocId(null);
    setEditTitle("");
    setEditContent("");
  };

  const handleSaveEditDocument = () => {
    if (!editingDocId || !editTitle.trim() || !editContent.trim()) return;

    setCreatedDocs((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === editingDocId
          ? {
              ...doc,
              title: language === "en" ? doc.title : editTitle.trim(),
              titleEn: language === "en" ? editTitle.trim() : doc.titleEn,
              content: language === "en" ? doc.content : editContent.trim(),
              contentEn: language === "en" ? editContent.trim() : doc.contentEn,
              updatedAt: language === "en" ? "Just now" : "방금",
            }
          : doc,
      ),
    );
    handleCancelEditDocument();
  };

  const handleDeleteDocument = (docId: number) => {
    if (!isCreatedDoc(docId)) return;

    setCreatedDocs((prevDocs) => {
      const nextCreatedDocs = prevDocs.filter((doc) => doc.id !== docId);
      const nextDocs = [...nextCreatedDocs, ...baseDocs];

      if (selectedDoc === docId) {
        setSelectedDoc(nextDocs[0]?.id ?? null);
      }

      return nextCreatedDocs;
    });
    handleCancelEditDocument();
    setDocListTab("documents");
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.icon : FileText;
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.color : 'var(--muted)';
  };

  const renderDocumentPreview = (content: string) => (
    <div className="mx-auto grid w-full max-w-[900px] gap-4">
      {content.split("\n").map((line, index) => {
        const trimmedLine = line.trim();

        if (!trimmedLine) {
          return <div key={`spacer-${index}`} className="h-2" />;
        }

        if (trimmedLine.startsWith("# ")) {
          return (
            <h1 key={index} className="m-0 leading-[1.1] tracking-[-0.055em]" style={{
              color: 'var(--white)',
              fontSize: embedded ? '28px' : '36px',
              fontWeight: 950
            }}>
              {trimmedLine.replace(/^#\s+/, "")}
            </h1>
          );
        }

        if (trimmedLine.startsWith("## ")) {
          return (
            <h2 key={index} className="m-0 mt-4 leading-[1.2] tracking-[-0.035em]" style={{
              color: 'var(--soft-mint)',
              fontSize: embedded ? '18px' : '22px',
              fontWeight: 950
            }}>
              {trimmedLine.replace(/^##\s+/, "")}
            </h2>
          );
        }

        if (trimmedLine.startsWith("- [")) {
          return (
            <div key={index} className="rounded-xl px-4 py-3 tracking-tight" style={{
              background: 'rgba(234, 247, 255, 0.045)',
              border: '1px solid rgba(234, 247, 255, 0.08)',
              color: 'rgba(234, 247, 255, 0.88)',
              fontSize: '14px',
              fontWeight: 800,
              lineHeight: 1.65
            }}>
              {trimmedLine}
            </div>
          );
        }

        if (trimmedLine.startsWith("- ")) {
          return (
            <div key={index} className="flex gap-3 rounded-xl px-4 py-3 tracking-tight" style={{
              background: 'rgba(234, 247, 255, 0.035)',
              border: '1px solid rgba(234, 247, 255, 0.07)',
              color: 'rgba(234, 247, 255, 0.86)',
              fontSize: '14px',
              fontWeight: 780,
              lineHeight: 1.65
            }}>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 950 }}>•</span>
              <span>{trimmedLine.replace(/^-\s+/, "")}</span>
            </div>
          );
        }

        if (trimmedLine.startsWith("```")) {
          return null;
        }

        return (
          <p key={index} className="m-0 tracking-tight" style={{
            color: 'rgba(234, 247, 255, 0.86)',
            fontSize: '15px',
            fontWeight: 760,
            lineHeight: 1.85
          }}>
            {trimmedLine}
          </p>
        );
      })}
    </div>
  );

  return (
    <div className={embedded ? "codedock-scrollbar-hidden flex h-full min-h-0 flex-col overflow-hidden px-5 py-5" : "w-[min(1400px,calc(100vw-36px))] mx-auto py-12 pb-20"}>
      <div className={embedded ? "mb-5" : "mb-8"}>
        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: embedded ? 'clamp(30px, 3vw, 44px)' : 'clamp(48px, 6vw, 72px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: '0 0 22px rgba(var(--codedock-primary-rgb), 0.18)'
        }}>
          문서 관리
        </h1>
        <p className="m-0 tracking-tight" style={{
          fontSize: embedded ? '14px' : '18px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          AI가 자동으로 생성한 문서와 매뉴얼을 관리합니다
        </p>
      </div>

      <div className={embedded ? "grid grid-cols-2 gap-3 mb-5 xl:grid-cols-4" : "grid md:grid-cols-4 gap-4 mb-9"}>
        {categories.map((category) => {
          const Icon = category.icon;
          const addedCount = createdDocs.filter((doc) => doc.category === category.id).length;
          return (
            <div key={category.id} className={embedded ? "px-4 py-4 rounded-2xl" : "px-5 py-5 rounded-3xl"} style={{
              background: 'rgba(11, 22, 40, 0.82)',
              border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
              boxShadow: embedded ? '0 12px 30px rgba(0, 0, 0, 0.26)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
              backdropFilter: 'blur(16px)'
            }}>
              <Icon size={20} style={{ color: category.color, marginBottom: '8px' }} />
              <p className="m-0 mb-2 tracking-tight" style={{
                color: 'var(--muted)',
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 900
              }}>
                {getCategoryLabel(category)}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{
                fontSize: '32px',
                fontWeight: 950,
                color: category.color
              }}>
                {category.count + addedCount}
              </p>
            </div>
          );
        })}
      </div>

      <div className={embedded ? "grid min-h-0 flex-1 gap-5 xl:grid-cols-[330px_1fr]" : "grid lg:grid-cols-[360px_1fr] gap-6"}>
        <section className={embedded ? "flex min-h-0 flex-col overflow-hidden px-5 py-5 rounded-2xl" : "flex max-h-[calc(100vh-170px)] min-h-[620px] flex-col overflow-hidden px-6 py-6 rounded-[30px]"} style={{
          background: 'rgba(11, 22, 40, 0.82)',
          border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
          boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(16px)'
        }}>
          <h2 className="m-0 mb-6 flex-shrink-0 leading-none tracking-[-0.075em]" style={{
            fontSize: '20px',
            fontWeight: 950
          }}>
            문서 목록
          </h2>

          <div className="mb-4 grid flex-shrink-0 grid-cols-2 gap-2 rounded-2xl p-1" style={{
            background: 'rgba(5, 11, 20, 0.54)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.14)'
          }}>
            {[
              { id: "templates" as const, label: language === "en" ? "Templates" : "템플릿", count: documentTemplates.length },
              { id: "documents" as const, label: language === "en" ? "Documents" : "문서", count: docs.length },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDocListTab(tab.id)}
                className="rounded-xl border-0 px-3 py-2.5 tracking-tight transition-all"
                style={{
                  background: docListTab === tab.id ? 'rgba(var(--codedock-primary-rgb), 0.16)' : 'transparent',
                  border: docListTab === tab.id ? '1px solid rgba(var(--codedock-primary-rgb), 0.26)' : '1px solid transparent',
                  color: docListTab === tab.id ? 'var(--white)' : 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 950
                }}
              >
                {tab.label}
                <span style={{ marginLeft: 6, color: docListTab === tab.id ? 'var(--neon-cyan)' : 'inherit' }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {docListTab === "templates" && (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl px-3 py-3" style={{
            background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.10), rgba(var(--codedock-secondary-rgb), 0.055)), rgba(5, 11, 20, 0.52)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
            boxShadow: 'inset 0 1px 0 rgba(234, 247, 255, 0.08)'
          }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="m-0 tracking-tight" style={{
                  color: 'var(--white)',
                  fontSize: '14px',
                  fontWeight: 950
                }}>
                  {language === "en" ? "Template Gallery" : "문서 템플릿"}
                </p>
                <p className="m-0 mt-1 tracking-tight" style={{
                  color: 'var(--muted)',
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 800
                }}>
                  {language === "en" ? "Pick a format, write, then register" : "양식을 선택해 작성한 뒤 등록하세요"}
                </p>
              </div>
              <span className="rounded-full px-2 py-1 tracking-tight" style={{
                background: 'rgba(var(--codedock-primary-rgb), 0.12)',
                border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                color: 'var(--neon-cyan)',
                fontSize: "var(--krds-body-xsmall)",
                fontWeight: 950
              }}>
                {documentTemplates.length}
              </span>
            </div>

            <div className="codedock-scrollbar-hidden grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
              {documentTemplates.map((template) => {
                const Icon = template.icon;
                const templateTitle = language === "en" ? template.titleEn : template.title;
                const templateDescription = language === "en" ? template.descriptionEn : template.description;
                const templateTags = language === "en" ? template.tagsEn : template.tags;

                return (
                  <div
                    key={template.id}
                    className="w-full rounded-xl px-2.5 py-2.5 transition-all hover:translate-y-[-1px]"
                    style={{
                      background: draftTemplate?.id === template.id ? 'rgba(var(--codedock-primary-rgb), 0.13)' : 'rgba(5, 11, 20, 0.58)',
                      border: draftTemplate?.id === template.id ? '1px solid rgba(var(--codedock-primary-rgb), 0.34)' : '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                      boxShadow: draftTemplate?.id === template.id ? '0 0 24px rgba(var(--codedock-primary-rgb), 0.10)' : 'none'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full border-0 bg-transparent p-0 text-left"
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex items-start gap-2.5">
                      <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-xl" style={{
                        background: `${template.color === 'var(--neon-cyan)' ? 'rgba(var(--codedock-primary-rgb), 0.14)' : 'rgba(234, 247, 255, 0.07)'}`,
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)'
                      }}>
                        <Icon size={17} style={{ color: template.color }} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate tracking-tight" style={{
                          color: 'var(--white)',
                          fontSize: '13px',
                          fontWeight: 950
                        }}>
                          {templateTitle}
                        </span>
                        <span className="mt-1 line-clamp-1 block tracking-tight" style={{
                          color: 'var(--muted)',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 780,
                          lineHeight: 1.45
                        }}>
                          {templateDescription}
                        </span>
                      </span>
                      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full" style={{
                        background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                        color: '#021014'
                      }}>
                        <Plus size={15} strokeWidth={3} />
                      </span>
                      </div>
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {templateTags.slice(0, 2).map((tag) => (
                        <span key={tag} className="rounded-full px-2 py-0.5 tracking-tight" style={{
                          background: 'rgba(234, 247, 255, 0.06)',
                          border: '1px solid rgba(234, 247, 255, 0.08)',
                          color: 'var(--soft-mint)',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 850
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          )}

          {docListTab === "documents" && (
          <div className="codedock-scrollbar-hidden grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
            {docs.map((doc) => {
              const Icon = getCategoryIcon(doc.category);
              const color = getCategoryColor(doc.category);
              return (
                <button
                  key={doc.id}
                  onClick={() => {
                    setDraftTemplate(null);
                    setEditingDocId(null);
                    setEditTitle("");
                    setEditContent("");
                    setSelectedDoc(doc.id);
                  }}
                  className="w-full px-3 py-3 rounded-xl border-0 text-left transition-all hover:translate-y-[-1px]"
                  style={{
                    background: selectedDoc === doc.id ? 'rgba(var(--codedock-primary-rgb), 0.15)' : 'rgba(5, 11, 20, 0.42)',
                    border: selectedDoc === doc.id ? '1px solid rgba(var(--codedock-primary-rgb), 0.3)' : '1px solid rgba(var(--codedock-primary-rgb), 0.10)',
                    cursor: 'pointer'
                  }}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                    <Icon size={16} style={{ color }} />
                    {doc.generatedBy === 'AI' && (
                      <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} />
                    )}
                    {doc.generatedBy === 'Template' && (
                      <Plus size={14} style={{ color: 'var(--soft-mint)' }} />
                    )}
                    </span>
                    <span className="rounded-full px-2 py-0.5 tracking-tight" style={{
                      background: doc.generatedBy === 'AI' ? 'rgba(var(--codedock-primary-rgb), 0.11)' : 'rgba(var(--codedock-secondary-rgb), 0.10)',
                      color: doc.generatedBy === 'AI' ? 'var(--neon-cyan)' : 'var(--soft-mint)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}>
                      {doc.generatedBy}
                    </span>
                  </div>
                  <p className="m-0 mb-2 leading-[1.3] tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: 'var(--white)'
                  }}>
                    {getDocTitle(doc)}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="tracking-tight" style={{
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {getDocAuthor(doc)}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>•</span>
                    <span className="tracking-tight" style={{
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {doc.createdAt}
                    </span>
                  </div>
                  {doc.relatedPR && (
                    <span className="inline-block mt-2 px-2 py-0.5 rounded tracking-tight" style={{
                      background: 'rgba(var(--codedock-secondary-rgb), 0.15)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 900,
                      color: 'var(--matrix-green)'
                    }}>
                      PR #{doc.relatedPR}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          )}
        </section>

        {draftTemplate && (
          <section className={embedded ? "flex min-h-0 flex-col overflow-hidden px-5 py-5 rounded-2xl" : "px-8 py-8 rounded-[30px]"} style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
            boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <div className="mb-5 flex flex-shrink-0 items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1" style={{
                  background: 'rgba(var(--codedock-secondary-rgb), 0.12)',
                  border: '1px solid rgba(var(--codedock-secondary-rgb), 0.24)'
                }}>
                  <Plus size={15} style={{ color: 'var(--soft-mint)' }} />
                  <span className="tracking-tight" style={{
                    color: 'var(--soft-mint)',
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 900
                  }}>
                    {language === "en" ? "Writing from template" : "템플릿 작성 중"}
                  </span>
                </div>
                <h2 className="m-0 leading-[1.2] tracking-[-0.065em]" style={{
                  color: 'var(--white)',
                  fontSize: embedded ? '24px' : '30px',
                  fontWeight: 950
                }}>
                  {language === "en" ? "Write Document" : "문서 작성"}
                </h2>
                <p className="m-0 mt-2 tracking-tight" style={{
                  color: 'var(--muted)',
                  fontSize: '13px',
                  fontWeight: 800
                }}>
                  {language === "en"
                    ? "Edit the template content and register it to the document list."
                    : "선택한 템플릿 내용을 수정한 뒤 문서 목록에 등록합니다."}
                </p>
              </div>
              <div className="hidden shrink-0 items-center gap-2 rounded-2xl px-3 py-2 sm:flex" style={{
                background: 'rgba(var(--codedock-primary-rgb), 0.08)',
                border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)'
              }}>
                {(() => {
                  const TemplateIcon = draftTemplate.icon;
                  return <TemplateIcon size={17} style={{ color: draftTemplate.color }} />;
                })()}
                <span className="tracking-tight" style={{
                  color: 'var(--soft-mint)',
                  fontSize: "var(--krds-body-xsmall)",
                  fontWeight: 900
                }}>
                  {language === "en" ? draftTemplate.titleEn : draftTemplate.title}
                </span>
              </div>
            </div>

            <div className={embedded ? "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1" : ""}>
              <div className="mx-auto w-full max-w-[980px]">
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="tracking-tight" style={{
                    color: 'var(--muted)',
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 950
                  }}>
                    {language === "en" ? "Title" : "제목"}
                  </span>
                  <input
                    value={draftTitle}
                    onChange={(event) => setDraftTitle(event.target.value)}
                    className="rounded-2xl border-0 px-4 py-3 outline-none tracking-tight"
                    style={{
                      background: 'rgba(5, 11, 20, 0.62)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                      color: 'var(--white)',
                      fontSize: '15px',
                      fontWeight: 850
                    }}
                  />
                </label>

                <label className="grid min-h-0 gap-2">
                  <span className="tracking-tight" style={{
                    color: 'var(--muted)',
                    fontSize: "var(--krds-body-xsmall)",
                    fontWeight: 950
                  }}>
                    {language === "en" ? "Body" : "본문"}
                  </span>
                  <textarea
                    value={draftContent}
                    onChange={(event) => setDraftContent(event.target.value)}
                    className={`codedock-scrollbar-hidden min-h-[360px] resize-none rounded-2xl border-0 px-5 py-5 font-mono outline-none ${embedded ? "h-[min(48vh,520px)]" : "h-[500px]"}`}
                    style={{
                      background: 'rgba(5, 11, 20, 0.62)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                      color: 'var(--white)',
                      fontSize: '13px',
                      fontWeight: 750,
                      lineHeight: 1.7
                    }}
                  />
                </label>
              </div>
              </div>
            </div>

            <div className="mt-5 flex flex-shrink-0 flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelDraft}
                className="rounded-xl border-0 px-4 py-3 tracking-tight"
                style={{
                  background: 'rgba(234, 247, 255, 0.06)',
                  border: '1px solid rgba(234, 247, 255, 0.12)',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 950
                }}
              >
                {language === "en" ? "Cancel" : "취소"}
              </button>
              <button
                type="button"
                onClick={() => handleGenerateAiDocument(draftTemplate)}
                className="inline-flex items-center gap-2 rounded-xl border-0 px-5 py-3 tracking-tight transition-all hover:scale-[1.01]"
                style={{
                  background: 'linear-gradient(135deg, rgba(var(--codedock-primary-rgb), 0.20), rgba(var(--codedock-secondary-rgb), 0.12)), rgba(234, 247, 255, 0.055)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.28)',
                  boxShadow: 'inset 0 1px 0 rgba(234, 247, 255, 0.12), 0 0 22px rgba(var(--codedock-primary-rgb), 0.08)',
                  color: 'var(--neon-cyan)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 950
                }}
              >
                <Sparkles size={16} strokeWidth={2.6} />
                {language === "en" ? "AI Generate" : "AI 자동 생성"}
              </button>
              <button
                type="button"
                onClick={handleRegisterDraft}
                disabled={!draftTitle.trim() || !draftContent.trim()}
                className="inline-flex items-center gap-2 rounded-xl border-0 px-5 py-3 tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                  color: '#021014',
                  cursor: draftTitle.trim() && draftContent.trim() ? 'pointer' : 'not-allowed',
                  opacity: draftTitle.trim() && draftContent.trim() ? 1 : 0.48,
                  fontSize: '13px',
                  fontWeight: 950
                }}
              >
                <Plus size={16} strokeWidth={3} />
                {language === "en" ? "Register" : "등록하기"}
              </button>
            </div>
          </section>
        )}

        {!draftTemplate && selectedDocData && (
          <section className={embedded ? "flex min-h-0 flex-col overflow-hidden px-5 py-5 rounded-2xl" : "px-8 py-8 rounded-[30px]"} style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(var(--codedock-primary-rgb), 0.16)',
            boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <div className="flex flex-shrink-0 items-start justify-between mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  {selectedDocData.generatedBy === 'AI' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                      background: 'rgba(var(--codedock-primary-rgb), 0.15)',
                      border: '1px solid rgba(var(--codedock-primary-rgb), 0.3)'
                    }}>
                      <Sparkles size={16} style={{ color: 'var(--neon-cyan)' }} />
                      <span className="tracking-tight" style={{
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 900,
                        color: 'var(--neon-cyan)'
                      }}>
                        AI 자동생성
                      </span>
                    </div>
                  )}
                  {selectedDocData.generatedBy === 'Template' && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{
                      background: 'rgba(var(--codedock-secondary-rgb), 0.12)',
                      border: '1px solid rgba(var(--codedock-secondary-rgb), 0.24)'
                    }}>
                      <Plus size={15} style={{ color: 'var(--soft-mint)' }} />
                      <span className="tracking-tight" style={{
                        fontSize: "var(--krds-body-xsmall)",
                        fontWeight: 900,
                        color: 'var(--soft-mint)'
                      }}>
                        {language === "en" ? "Template draft" : "템플릿 초안"}
                      </span>
                    </div>
                  )}
                </div>
                <h2 className="m-0 mb-3 leading-[1.2] tracking-[-0.065em]" style={{
                  fontSize: '28px',
                  fontWeight: 950,
                  color: 'var(--white)'
                }}>
                  {getDocTitle(selectedDocData)}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--muted)'
                  }}>
                    {language === "en" ? "Author" : "작성"}: {getDocAuthor(selectedDocData)}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>•</span>
                  <span className="tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--muted)'
                  }}>
                    {selectedDocData.createdAt}
                  </span>
                  {selectedDocData.updatedAt !== selectedDocData.createdAt && (
                    <>
                      <span style={{ color: 'var(--muted)' }}>•</span>
                      <span className="tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 800,
                      color: 'var(--muted)'
                    }}>
                        {language === "en" ? "Updated" : "수정"}: {selectedDocData.updatedAt}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {isCreatedDoc(selectedDocData.id) && (
                <div className="ml-4 flex flex-shrink-0 flex-wrap justify-end gap-2">
                  {editingDocId === selectedDocData.id ? (
                    <>
                      <button
                        type="button"
                        onClick={handleCancelEditDocument}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(234, 247, 255, 0.06)',
                          border: '1px solid rgba(234, 247, 255, 0.12)',
                          color: 'var(--muted)',
                          cursor: 'pointer',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <X size={15} strokeWidth={2.7} />
                        {language === "en" ? "Cancel" : "취소"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditDocument}
                        disabled={!editTitle.trim() || !editContent.trim()}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                          color: '#021014',
                          cursor: editTitle.trim() && editContent.trim() ? 'pointer' : 'not-allowed',
                          opacity: editTitle.trim() && editContent.trim() ? 1 : 0.48,
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <Check size={15} strokeWidth={3} />
                        {language === "en" ? "Save" : "저장"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEditDocument(selectedDocData)}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(var(--codedock-primary-rgb), 0.10)',
                          border: '1px solid rgba(var(--codedock-primary-rgb), 0.22)',
                          color: 'var(--neon-cyan)',
                          cursor: 'pointer',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <Pencil size={15} strokeWidth={2.5} />
                        {language === "en" ? "Edit" : "수정"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteDocument(selectedDocData.id)}
                        className="inline-flex items-center gap-2 rounded-xl border-0 px-3 py-2 tracking-tight"
                        style={{
                          background: 'rgba(255, 107, 107, 0.10)',
                          border: '1px solid rgba(255, 107, 107, 0.22)',
                          color: '#FF9C9C',
                          cursor: 'pointer',
                          fontSize: "var(--krds-body-xsmall)",
                          fontWeight: 950
                        }}
                      >
                        <Trash2 size={15} strokeWidth={2.5} />
                        {language === "en" ? "Delete" : "삭제"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {selectedDocData.relatedPR && (
              <div className="px-5 py-4 mb-6 rounded-2xl" style={{
                background: 'rgba(var(--codedock-secondary-rgb), 0.08)',
                border: '1px solid rgba(var(--codedock-secondary-rgb), 0.22)'
              }}>
                <p className="m-0 tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  color: 'var(--matrix-green)'
                }}>
                  관련 PR #{selectedDocData.relatedPR}
                </p>
              </div>
            )}

            {editingDocId === selectedDocData.id ? (
              <div className={embedded ? "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1" : ""}>
                <div className="mx-auto grid w-full max-w-[980px] gap-4">
                  <label className="grid gap-2">
                    <span className="tracking-tight" style={{
                      color: 'var(--muted)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}>
                      {language === "en" ? "Title" : "제목"}
                    </span>
                    <input
                      value={editTitle}
                      onChange={(event) => setEditTitle(event.target.value)}
                      className="rounded-2xl border-0 px-4 py-3 outline-none tracking-tight"
                      style={{
                        background: 'rgba(5, 11, 20, 0.62)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        color: 'var(--white)',
                        fontSize: '15px',
                        fontWeight: 850
                      }}
                    />
                  </label>
                  <label className="grid gap-2">
                    <span className="tracking-tight" style={{
                      color: 'var(--muted)',
                      fontSize: "var(--krds-body-xsmall)",
                      fontWeight: 950
                    }}>
                      {language === "en" ? "Body" : "본문"}
                    </span>
                    <textarea
                      value={editContent}
                      onChange={(event) => setEditContent(event.target.value)}
                      className={`codedock-scrollbar-hidden min-h-[360px] resize-none rounded-2xl border-0 px-5 py-5 font-mono outline-none ${embedded ? "h-[min(48vh,520px)]" : "h-[500px]"}`}
                      style={{
                        background: 'rgba(5, 11, 20, 0.62)',
                        border: '1px solid rgba(var(--codedock-primary-rgb), 0.18)',
                        color: 'var(--white)',
                        fontSize: '13px',
                        fontWeight: 750,
                        lineHeight: 1.7
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className={embedded ? "codedock-scrollbar-hidden min-h-0 flex-1 overflow-y-auto pr-1" : "codedock-scrollbar-hidden max-h-[760px] overflow-y-auto pr-2"}>
                <div className="rounded-3xl px-6 py-6" style={{
                  background: 'rgba(5, 11, 20, 0.46)',
                  border: '1px solid rgba(var(--codedock-primary-rgb), 0.12)',
                  boxShadow: 'inset 0 1px 0 rgba(234, 247, 255, 0.06)'
                }}>
                  {renderDocumentPreview(selectedDocContent)}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
