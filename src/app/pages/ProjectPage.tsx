import { GitPullRequest, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface ProjectPageProps {
  embedded?: boolean;
}

export function ProjectPage({ embedded = false }: ProjectPageProps) {
  const projectStats = [
    { label: '열린 PR', value: '7', color: 'var(--neon-cyan)', icon: GitPullRequest },
    { label: '위험도 높은 PR', value: '2', color: '#FF6B6B', icon: AlertTriangle },
    { label: '진행 중 이슈', value: '12', color: 'var(--matrix-green)', icon: Clock },
    { label: '완료된 PR (이번주)', value: '15', color: 'var(--soft-mint)', icon: CheckCircle2 }
  ];

  const pendingPRs = [
    { id: 234, title: '인증 미들웨어 추가', author: '김진필', risk: 'high', files: 8, time: '10분 전' },
    { id: 233, title: '사용자 프로필 API 정리', author: '김준우', risk: 'medium', files: 5, time: '1시간 전' },
    { id: 232, title: 'CORS 설정 수정', author: '김진현', risk: 'low', files: 2, time: '3시간 전' }
  ];

  const recentDecisions = [
    { text: '요청 제한을 모든 공개 API에 적용하기로 결정', time: '2시간 전', pr: 234 },
    { text: 'refresh token 재발급 시 이전 토큰 즉시 무효화', time: '5시간 전', pr: 234 },
    { text: 'CORS origin을 환경변수로 관리', time: '어제', pr: 232 }
  ];

  const actionItems = [
    { text: 'PR #234 인증 미들웨어 적용 범위 확인', assignee: '김재준', status: 'pending' },
    { text: 'API 요청 제한 테스트 케이스 작성', assignee: '김진필', status: 'pending' },
    { text: 'CORS 설정 문서 업데이트', assignee: '김진현', status: 'completed' }
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

  const pageClassName = embedded
    ? "codedock-scrollbar-hidden h-full overflow-y-auto px-5 py-5"
    : "w-[min(1180px,calc(100vw-36px))] mx-auto py-12 pb-20";
  const sectionClassName = embedded
    ? "mb-5 px-5 py-5 rounded-2xl"
    : "mb-9 px-9 py-9 rounded-[30px]";
  const compactSectionClassName = embedded
    ? "px-5 py-5 rounded-2xl"
    : "px-9 py-9 rounded-[30px]";
  const sectionStyle = {
    background: 'rgba(11, 22, 40, 0.82)',
    border: '1px solid rgba(32, 227, 255, 0.16)',
    boxShadow: embedded ? '0 14px 36px rgba(0, 0, 0, 0.28)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
    backdropFilter: 'blur(16px)'
  };

  return (
    <div className={pageClassName}>
      <div className={embedded ? "mb-5" : "mb-8"}>
        <div className={`inline-flex items-center gap-2 rounded-full ${embedded ? 'mb-3 px-3 py-1.5' : 'mb-4 px-4 py-2'}`} style={{
          background: 'rgba(32, 227, 255, 0.09)',
          border: '1px solid rgba(32, 227, 255, 0.22)',
          color: 'var(--neon-cyan)',
          boxShadow: '0 0 24px rgba(32, 227, 255, 0.08)'
        }}>
          <span className="w-2 h-2 rounded-full" style={{
            background: 'var(--matrix-green)',
            boxShadow: '0 0 0 5px rgba(57,255,136,0.13), 0 0 16px rgba(57,255,136,0.7)'
          }} />
          <span className="font-black text-sm tracking-tight">SecureFlow Workspace</span>
        </div>

        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: embedded ? 'clamp(30px, 3vw, 44px)' : 'clamp(48px, 6vw, 72px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: '0 0 22px rgba(32, 227, 255, 0.18)'
        }}>
          프로젝트 대시보드
        </h1>
        <p className="m-0 tracking-tight" style={{
          fontSize: embedded ? '14px' : '18px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          프로젝트의 전체 상태를 한눈에 확인합니다
        </p>
      </div>

      <div className={embedded ? "grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5" : "grid grid-cols-2 md:grid-cols-4 gap-4 mb-9"}>
        {projectStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={embedded ? "px-4 py-4 rounded-2xl" : "px-5 py-5 rounded-3xl"} style={{
              background: 'rgba(11, 22, 40, 0.82)',
              border: '1px solid rgba(32, 227, 255, 0.16)',
              boxShadow: embedded ? '0 12px 30px rgba(0, 0, 0, 0.26)' : '0 20px 60px rgba(0, 0, 0, 0.32)',
              backdropFilter: 'blur(16px)'
            }}>
              <Icon size={embedded ? 20 : 24} style={{ color: stat.color, marginBottom: embedded ? '8px' : '12px' }} />
              <p className="m-0 mb-2 tracking-tight" style={{
                color: 'var(--muted)',
                fontSize: embedded ? '12px' : '13px',
                fontWeight: 900
              }}>
                {stat.label}
              </p>
              <p className="m-0 tracking-[-0.06em]" style={{
                fontSize: embedded ? '30px' : '36px',
                fontWeight: 950,
                color: stat.color
              }}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      <section className={sectionClassName} style={sectionStyle}>
        <div className={`flex items-center justify-between ${embedded ? 'mb-4' : 'mb-6'}`}>
          <h2 className="m-0 leading-none tracking-[-0.075em]" style={{
            fontSize: embedded ? 'clamp(21px, 2.2vw, 28px)' : 'clamp(28px, 4vw, 44px)',
            fontWeight: 950
          }}>
            리뷰 대기 PR
          </h2>
        </div>

        <div className={embedded ? "grid gap-3" : "grid gap-4"}>
          {pendingPRs.map((pr) => (
            <div
              key={pr.id}
              className={`transition-all ${embedded ? 'rounded-2xl px-4 py-4' : 'rounded-3xl px-6 py-5'}`}
              style={{
                background: 'rgba(234, 247, 255, 0.055)',
                border: '1px solid rgba(32, 227, 255, 0.14)',
                boxShadow: embedded ? '0 10px 24px rgba(0, 0, 0, 0.18)' : '0 14px 36px rgba(0, 0, 0, 0.22)'
              }}
            >
              <div className={`flex items-start justify-between gap-4 ${embedded ? 'mb-2' : 'mb-3'}`}>
                <h3 className="m-0 tracking-[-0.065em]" style={{
                  fontSize: embedded ? '17px' : '20px',
                  fontWeight: 950,
                  color: 'var(--white)'
                }}>
                  #{pr.id} {pr.title}
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full flex-shrink-0" style={{
                  background: `${getRiskColor(pr.risk)}22`,
                  border: `1px solid ${getRiskColor(pr.risk)}`,
                  fontSize: embedded ? '11px' : '12px',
                  fontWeight: 900,
                  color: getRiskColor(pr.risk)
                }}>
                  위험도: {getRiskLabel(pr.risk)}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className="tracking-tight" style={{
                  fontSize: embedded ? '12px' : '14px',
                  fontWeight: 800,
                  color: 'var(--muted)'
                }}>
                  작성자: <span style={{ color: 'var(--matrix-green)' }}>{pr.author}</span>
                </span>
                <span className="tracking-tight" style={{
                  fontSize: embedded ? '12px' : '14px',
                  fontWeight: 800,
                  color: 'var(--muted)'
                }}>
                  변경 파일: <span style={{ color: 'var(--neon-cyan)' }}>{pr.files}</span>
                </span>
                <span className="tracking-tight" style={{
                  fontSize: embedded ? '12px' : '14px',
                  fontWeight: 800,
                  color: 'var(--muted)'
                }}>
                  {pr.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className={embedded ? "grid gap-5 xl:grid-cols-2" : "grid md:grid-cols-2 gap-9"}>
        <section className={compactSectionClassName} style={sectionStyle}>
          <h2 className={`m-0 leading-none tracking-[-0.075em] ${embedded ? 'mb-4' : 'mb-6'}`} style={{
            fontSize: embedded ? 'clamp(20px, 2vw, 25px)' : 'clamp(24px, 3vw, 32px)',
            fontWeight: 950
          }}>
            최근 결정사항
          </h2>

          <div className="grid gap-3">
            {recentDecisions.map((decision, idx) => (
              <div
                key={idx}
                className={embedded ? "px-4 py-3 rounded-xl" : "px-5 py-4 rounded-2xl"}
                style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)'
                }}
              >
                <p className="m-0 mb-2 leading-[1.5] tracking-tight" style={{
                  fontSize: embedded ? '13px' : '15px',
                  fontWeight: 800,
                  color: 'var(--white)'
                }}>
                  {decision.text}
                </p>
                <div className="flex gap-3 flex-wrap">
                  <span className="tracking-tight" style={{
                    fontSize: embedded ? '12px' : '13px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    PR #{decision.pr}
                  </span>
                  <span className="tracking-tight" style={{
                    fontSize: embedded ? '12px' : '13px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    {decision.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={compactSectionClassName} style={sectionStyle}>
          <h2 className={`m-0 leading-none tracking-[-0.075em] ${embedded ? 'mb-4' : 'mb-6'}`} style={{
            fontSize: embedded ? 'clamp(20px, 2vw, 25px)' : 'clamp(24px, 3vw, 32px)',
            fontWeight: 950
          }}>
            오늘의 액션아이템
          </h2>

          <div className="grid gap-3">
            {actionItems.map((item, idx) => (
              <div
                key={idx}
                className={embedded ? "px-4 py-3 rounded-xl" : "px-5 py-4 rounded-2xl"}
                style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  opacity: item.status === 'completed' ? 0.6 : 1
                }}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={item.status === 'completed'}
                    readOnly
                    className="mt-1 flex-shrink-0"
                    style={{ accentColor: 'var(--matrix-green)' }}
                  />
                  <div className="flex-1">
                    <p className="m-0 mb-1 leading-[1.5] tracking-tight" style={{
                      fontSize: embedded ? '13px' : '15px',
                      fontWeight: 800,
                      color: 'var(--white)',
                      textDecoration: item.status === 'completed' ? 'line-through' : 'none'
                    }}>
                      {item.text}
                    </p>
                    <span className="tracking-tight" style={{
                      fontSize: embedded ? '12px' : '13px',
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      담당자: {item.assignee}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
