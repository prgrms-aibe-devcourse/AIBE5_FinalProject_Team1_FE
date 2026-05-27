import { Link } from "react-router";
import { GitPullRequest, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";

export function PRListPage() {
  const allPRs = [
    {
      id: 104,
      title: '[Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화',
      author: '김재준',
      status: 'open',
      risk: 'medium',
      files: 6,
      additions: 318,
      deletions: 74,
      reviewers: ['김진필'],
      time: '방금 전',
      branch: 'refactor/ai-interview-preserve'
    },
    {
      id: 233,
      title: '사용자 프로필 API 정리',
      author: '김준우',
      status: 'open',
      risk: 'medium',
      files: 5,
      additions: 167,
      deletions: 134,
      reviewers: ['김진현'],
      time: '1시간 전',
      branch: 'refactor/user-profile'
    },
    {
      id: 232,
      title: 'CORS 설정 수정',
      author: '김진현',
      status: 'merged',
      risk: 'low',
      files: 2,
      additions: 12,
      deletions: 8,
      reviewers: ['김진필', '김준우'],
      time: '3시간 전',
      branch: 'fix/cors-config'
    },
    {
      id: 231,
      title: '공개 API 요청 제한 추가',
      author: '김재준',
      status: 'open',
      risk: 'medium',
      files: 6,
      additions: 203,
      deletions: 45,
      reviewers: ['김진필'],
      time: '5시간 전',
      branch: 'feature/rate-limit'
    },
    {
      id: 230,
      title: 'API 문서 업데이트',
      author: '김준우',
      status: 'merged',
      risk: 'low',
      files: 1,
      additions: 89,
      deletions: 23,
      reviewers: ['김진현'],
      time: '어제',
      branch: 'docs/api-update'
    }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFD93D';
      case 'low': return '#6BCF7F';
      default: return 'var(--muted)';
    }
  };

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '미분석';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <GitPullRequest size={20} style={{ color: 'var(--neon-cyan)' }} />;
      case 'merged': return <CheckCircle2 size={20} style={{ color: 'var(--matrix-green)' }} />;
      case 'closed': return <XCircle size={20} style={{ color: '#FF6B6B' }} />;
      default: return <Clock size={20} style={{ color: 'var(--muted)' }} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return '열림';
      case 'merged': return '병합됨';
      case 'closed': return '닫힘';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="w-[min(1180px,calc(100vw-36px))] mx-auto py-12 pb-20">
      <div className="mb-8">
        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: 'clamp(48px, 6vw, 72px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: '0 0 22px rgba(32, 227, 255, 0.18)'
        }}>
          PR 목록
        </h1>
        <p className="m-0 tracking-tight" style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          GitHub에서 동기화된 PR 목록을 확인합니다
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-9">
        {[
          { label: '열림', value: '3', color: 'var(--neon-cyan)', icon: GitPullRequest },
          { label: '병합됨', value: '2', color: 'var(--matrix-green)', icon: CheckCircle2 },
          { label: '주의 필요', value: '3', color: '#FFD93D', icon: AlertTriangle },
          { label: '리뷰 대기', value: '3', color: 'var(--soft-mint)', icon: Clock }
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="px-5 py-5 rounded-3xl" style={{
              background: 'rgba(11, 22, 40, 0.82)',
              border: '1px solid rgba(32, 227, 255, 0.16)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
              backdropFilter: 'blur(16px)'
            }}>
              <Icon size={24} style={{ color: stat.color, marginBottom: '12px' }} />
              <p className="m-0 mb-2 tracking-tight" style={{
                color: 'var(--muted)',
                fontSize: '13px',
                fontWeight: 900
              }}>
                {stat.label}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{
                fontSize: '36px',
                fontWeight: 950,
                color: stat.color
              }}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <section className="px-9 py-9 rounded-[30px]" style={{
        background: 'rgba(11, 22, 40, 0.82)',
        border: '1px solid rgba(32, 227, 255, 0.16)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
        backdropFilter: 'blur(16px)'
      }}>
        <div className="grid gap-4">
          {allPRs.map((pr) => (
            <Link
              key={pr.id}
              to={`/pr/${pr.id}`}
              className="no-underline block px-6 py-6 rounded-3xl transition-all hover:scale-[1.01]"
              style={{
                background: 'rgba(234, 247, 255, 0.055)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.22)'
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(pr.status)}
                  <div className="flex-1">
                    <h3 className="m-0 mb-1 tracking-[-0.065em]" style={{
                      fontSize: '20px',
                      fontWeight: 950,
                      color: 'var(--white)'
                    }}>
                      #{pr.id} {pr.title}
                    </h3>
                    <p className="m-0 tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--muted)'
                    }}>
                      {pr.branch}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full flex-shrink-0" style={{
                  background: `${getRiskColor(pr.risk)}22`,
                  border: `1px solid ${getRiskColor(pr.risk)}`,
                  fontSize: '12px',
                  fontWeight: 900,
                  color: getRiskColor(pr.risk)
                }}>
                  <AlertTriangle size={14} />
                  {getRiskLabel(pr.risk)}
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className="px-3 py-1 rounded-full tracking-tight" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--matrix-green)'
                }}>
                  작성자: {pr.author}
                </span>
                <span className="px-3 py-1 rounded-full tracking-tight" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--neon-cyan)'
                }}>
                  파일 {pr.files}개
                </span>
                <span className="px-3 py-1 rounded-full tracking-tight" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: 'var(--matrix-green)'
                }}>
                  +{pr.additions}
                </span>
                <span className="px-3 py-1 rounded-full tracking-tight" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#FF6B6B'
                }}>
                  -{pr.deletions}
                </span>
                <span className="px-3 py-1 rounded-full tracking-tight" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: pr.status === 'open' ? 'var(--neon-cyan)' : pr.status === 'merged' ? 'var(--matrix-green)' : '#FF6B6B'
                }}>
                  {getStatusLabel(pr.status)}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--muted)'
                }}>
                  리뷰어: {pr.reviewers.join(', ')}
                </span>
                <span className="tracking-tight" style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--muted)'
                }}>
                  • {pr.time}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
