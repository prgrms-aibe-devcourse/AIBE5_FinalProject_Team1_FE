import { Link } from "react-router";
import { AlertCircle, ArrowRight, Plus } from "lucide-react";

export function WorkspacePage() {
  const mockOrganizations = [
    { id: 1, name: 'SecureFlow Workspace', openPRs: 7, highRisk: 2, activeIssues: 12 },
    { id: 2, name: 'AI Chat Platform', openPRs: 3, highRisk: 0, activeIssues: 8 },
    { id: 3, name: 'Dashboard UI Kit', openPRs: 5, highRisk: 1, activeIssues: 6 }
  ];

  const recentActivity = [
    { type: 'pr', user: '김진필', action: 'PR 열림', target: '#234: 인증 미들웨어 추가', time: '10분 전', risk: 'high' },
    { type: 'comment', user: '김준우', action: '댓글 작성', target: 'PR #233', time: '25분 전', risk: 'low' },
    { type: 'merge', user: '김진현', action: '병합', target: 'PR #232: CORS 문제 수정', time: '1시간 전', risk: 'medium' },
    { type: 'issue', user: '안현', action: '이슈 생성', target: '#145: 요청 제한이 작동하지 않음', time: '2시간 전', risk: 'high' }
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFD93D';
      case 'low': return '#6BCF7F';
      default: return 'var(--muted)';
    }
  };

  return (
    <div className="w-[min(1600px,calc(100vw-36px))] mx-auto py-12 pb-20">
      <div className="mb-8">
        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: 'clamp(48px, 6vw, 72px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: '0 0 22px rgba(32, 227, 255, 0.18)'
        }}>
          대시보드
        </h1>
        <p className="m-0 tracking-tight" style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          PR, 이슈, 위험 신호를 한눈에 확인합니다
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5 mb-9">
        {[
          { label: '전체 팀', value: '3', color: 'var(--neon-cyan)' },
          { label: '리뷰 대기 PR', value: '15', color: 'var(--matrix-green)' },
          { label: '위험도 높은 PR', value: '3', color: '#FF6B6B' }
        ].map((stat) => (
          <div key={stat.label} className="px-6 py-6 rounded-3xl" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <p className="m-0 mb-3 tracking-tight" style={{
              color: 'var(--muted)',
              fontSize: '14px',
              fontWeight: 900
            }}>
              {stat.label}
            </p>
            <p className="m-0 tracking-[-0.06em]" style={{
              fontSize: '48px',
              fontWeight: 950,
              color: stat.color
            }}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="mb-9 px-9 py-9 rounded-[30px]" style={{
        background: 'rgba(11, 22, 40, 0.82)',
        border: '1px solid rgba(32, 227, 255, 0.16)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
        backdropFilter: 'blur(16px)'
      }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="m-0 leading-none tracking-[-0.075em]" style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 950
          }}>
            내 팀
          </h2>
          <button className="px-5 py-3 rounded-xl border-0 flex items-center gap-2 tracking-tight transition-all" style={{
            background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
            color: '#021014',
            fontSize: '14px',
            fontWeight: 900,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(32, 227, 255, 0.3)'
          }}>
            <Plus size={18} />
            팀 생성하기
          </button>
        </div>

        <div className="grid gap-4">
          {mockOrganizations.map((org) => (
            <Link
              key={org.id}
              to="/chat"
              className="no-underline block px-6 py-6 rounded-3xl transition-all hover:scale-[1.01]"
              style={{
                background: 'rgba(234, 247, 255, 0.055)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                boxShadow: '0 14px 36px rgba(0, 0, 0, 0.22)'
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="m-0 mb-3 tracking-[-0.065em]" style={{
                    fontSize: '22px',
                    fontWeight: 950,
                    color: 'var(--white)'
                  }}>
                    {org.name}
                  </h3>
                  <div className="flex flex-wrap gap-4">
                    <span className="tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--muted)'
                    }}>
                      진행 중인 PR: <span style={{ color: 'var(--neon-cyan)' }}>{org.openPRs}</span>
                    </span>
                    <span className="tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--muted)'
                    }}>
                      높은 위험: <span style={{ color: org.highRisk > 0 ? '#FF6B6B' : 'var(--matrix-green)' }}>{org.highRisk}</span>
                    </span>
                    <span className="tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--muted)'
                    }}>
                      이슈: <span style={{ color: 'var(--soft-mint)' }}>{org.activeIssues}</span>
                    </span>
                  </div>
                </div>
                <ArrowRight size={24} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-9 py-9 rounded-[30px]" style={{
        background: 'rgba(11, 22, 40, 0.82)',
        border: '1px solid rgba(32, 227, 255, 0.16)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
        backdropFilter: 'blur(16px)'
      }}>
        <h2 className="m-0 mb-6 leading-none tracking-[-0.075em]" style={{
          fontSize: 'clamp(28px, 4vw, 44px)',
          fontWeight: 950
        }}>
          최근 활동
        </h2>

        <div className="grid gap-3">
          {recentActivity.map((activity, idx) => (
            <div
              key={idx}
              className="px-5 py-4 rounded-2xl"
              style={{
                background: 'rgba(5, 11, 20, 0.42)',
                border: '1px solid rgba(32, 227, 255, 0.10)'
              }}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-5 w-5 flex-shrink-0 place-items-center" style={{ marginTop: '2px' }}>
                  {activity.risk === 'high' && (
                    <AlertCircle size={20} style={{ color: getRiskColor(activity.risk) }} />
                  )}
                </span>
                <div className="flex-1">
                  <p className="m-0 mb-1 tracking-tight" style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    color: 'var(--white)'
                  }}>
                    <span style={{ color: 'var(--matrix-green)' }}>{activity.user}</span> {activity.action} <span style={{ color: 'var(--neon-cyan)' }}>{activity.target}</span>
                  </p>
                  <p className="m-0 tracking-tight" style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    {activity.time}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
