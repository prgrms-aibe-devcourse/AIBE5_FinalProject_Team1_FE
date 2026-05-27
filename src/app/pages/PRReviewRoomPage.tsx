import { useParams } from "react-router";
import { AlertTriangle, CheckCircle2, FileCode, MessageSquare, Send, Sparkles } from "lucide-react";
import { useState } from "react";

export function PRReviewRoomPage() {
  const { id } = useParams();
  const [message, setMessage] = useState('');

  const defaultPrData = {
    id: 234,
    title: '인증 미들웨어 추가',
    author: '김진필',
    branch: 'feature/auth-middleware → main',
    risk: 'high',
    riskScore: 85,
    files: [
      { name: 'src/middleware/auth.ts', status: 'added', additions: 89, deletions: 0 },
      { name: 'src/routes/user.ts', status: 'modified', additions: 45, deletions: 12 },
      { name: 'src/routes/profile.ts', status: 'modified', additions: 34, deletions: 8 },
      { name: 'src/config/security.ts', status: 'modified', additions: 23, deletions: 5 },
      { name: 'tests/auth.test.ts', status: 'added', additions: 54, deletions: 0 }
    ],
    aiSummary: '이 PR은 JWT 기반 인증 미들웨어를 추가하고 사용자 관련 API 라우트에 적용합니다. refresh token 재발급 API(/api/auth/refresh)에 요청 제한이 적용되지 않아 보안상 주의가 필요합니다.',
    riskItems: [
      { severity: 'high', text: 'refresh token 재발급 API에 요청 제한 미적용' },
      { severity: 'medium', text: '토큰 검증 실패 시 에러 메시지에 민감한 정보 포함 가능성' },
      { severity: 'low', text: '인증 미들웨어 테스트 커버리지 부족 (67%)' }
    ],
    checklist: [
      { checked: false, text: 'refresh token API에 요청 제한 적용' },
      { checked: false, text: '에러 메시지에서 민감한 정보 제거' },
      { checked: true, text: '토큰 만료 시간 환경변수로 관리' },
      { checked: true, text: 'HTTPS 연결에서만 쿠키 전송하도록 설정' },
      { checked: false, text: '테스트 커버리지 80% 이상으로 개선' }
    ],
    messages: [
      { user: '김준우', time: '10분 전', text: '요청 제한 설정은 어떻게 하는 게 좋을까요?' },
      { user: '김진필', time: '8분 전', text: 'express-rate-limit 패키지로 분당 5회 정도로 설정하면 될 것 같습니다' },
      { user: '김재준', time: '5분 전', text: '동의합니다. 그리고 IP당이 아니라 사용자 ID당으로 제한하는게 좋겠네요' }
    ],
    decisions: [
      { text: 'refresh token API에 요청 제한을 사용자 ID당 분당 5회로 설정', time: '5분 전' },
      { text: '토큰 검증 실패 시 에러 메시지는 "Invalid token"으로 통일', time: '12분 전' }
    ],
    actionItems: [
      { text: '요청 제한 미들웨어 추가', assignee: '김진필', status: 'pending' },
      { text: '에러 메시지 검토 및 수정', assignee: '김진필', status: 'pending' },
      { text: '테스트 케이스 추가', assignee: '김진필', status: 'pending' }
    ]
  };

  const actualPrData = {
    id: 104,
    title: '[Refactor] AI 인터뷰 결과 반영 시 부분 수정 유지 정책 정교화',
    author: '김재준',
    branch: 'refactor/ai-interview-preserve → main',
    risk: 'medium',
    riskScore: 72,
    files: [
      { name: 'src/domain/recruitment/position-policy.ts', status: 'modified', additions: 96, deletions: 24 },
      { name: 'src/services/ai-interview-sync.ts', status: 'modified', additions: 82, deletions: 18 },
      { name: 'src/prompts/ai-interview.ts', status: 'modified', additions: 41, deletions: 12 },
      { name: 'tests/ai-interview-preserve.test.ts', status: 'added', additions: 88, deletions: 0 },
      { name: 'tests/position-skill-sync.test.ts', status: 'added', additions: 63, deletions: 0 }
    ],
    aiSummary: '이 PR은 AI 인터뷰 결과를 기존 모집 단위에 반영할 때 누락값, null, 빈 배열이 기존 값을 덮어쓰지 않도록 보존 우선 정책을 정리합니다. AI 브리프와 AI 인터뷰의 동기화 기준을 분리하고 회귀 테스트를 추가합니다.',
    riskItems: [
      { severity: 'medium', text: 'AI 브리프와 AI 인터뷰의 반영 정책이 섞이지 않는지 확인 필요' },
      { severity: 'medium', text: 'skills: []와 skills: null 처리 기준이 서비스와 테스트에서 일치해야 함' },
      { severity: 'low', text: '명시적 삭제 요청과 응답 누락을 구분하는 문구 확인 필요' }
    ],
    checklist: [
      { checked: true, text: '브랜치 base가 적절한지 확인' },
      { checked: true, text: '제목이 이슈 제목과 동일한지 확인' },
      { checked: false, text: '최소 1명의 리뷰 승인 확인' },
      { checked: true, text: 'positions 누락 시 기존 모집 단위 유지 테스트 추가' },
      { checked: true, text: 'skills 빈 응답에서도 기존 스킬 유지 테스트 추가' }
    ],
    messages: [
      { user: '김재준', time: '방금 전', text: 'AI 인터뷰 쪽은 기존 값 보존 기준으로 정리했습니다.' },
      { user: '김진필', time: '5분 전', text: 'skills null/empty 처리만 한 번 더 확인해볼게요.' },
      { user: 'CodeDock AI', time: '3분 전', text: '기존 값 유지 정책과 회귀 테스트가 함께 추가되었습니다.' }
    ],
    decisions: [
      { text: 'AI 인터뷰는 사용자가 명시적으로 바꾼 값만 반영', time: '3분 전' },
      { text: '빈 값과 누락값은 기존 값 유지로 처리', time: '4분 전' }
    ],
    actionItems: [
      { text: '리뷰어 1명 승인 받기', assignee: '김재준', status: 'pending' },
      { text: '명시적 삭제 요청 케이스 주석 보강', assignee: '김재준', status: 'pending' },
      { text: 'AI 브리프 동기화 경로 회귀 확인', assignee: '김진필', status: 'completed' }
    ]
  };

  const prData = id === '104' ? actualPrData : defaultPrData;

  const getRiskColor = (severity: string) => {
    switch (severity) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFD93D';
      case 'low': return '#6BCF7F';
      default: return 'var(--muted)';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '미분석';
    }
  };

  return (
    <div className="w-[min(1400px,calc(100vw-36px))] mx-auto py-12 pb-20">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4" style={{
          background: 'rgba(32, 227, 255, 0.09)',
          border: '1px solid rgba(32, 227, 255, 0.22)',
          color: 'var(--neon-cyan)',
          boxShadow: '0 0 24px rgba(32, 227, 255, 0.08)'
        }}>
          <Sparkles size={16} />
          <span className="font-black text-sm tracking-tight">PR 리뷰 룸</span>
        </div>

        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: 'clamp(36px, 5vw, 56px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: '0 0 22px rgba(32, 227, 255, 0.18)'
        }}>
          #{prData.id} {prData.title}
        </h1>
        <p className="m-0 tracking-tight" style={{
          fontSize: '16px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          {prData.author} • {prData.branch}
        </p>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-6">
        <div className="grid gap-6">
          <section className="px-8 py-8 rounded-[30px]" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full" style={{
                background: `${getRiskColor(prData.risk)}22`,
                border: `2px solid ${getRiskColor(prData.risk)}`,
              }}>
                <AlertTriangle size={20} style={{ color: getRiskColor(prData.risk) }} />
                <span className="tracking-tight" style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  color: getRiskColor(prData.risk)
                }}>
                  위험도 점수: {prData.riskScore}/100
                </span>
              </div>
              <Sparkles size={20} style={{ color: 'var(--neon-cyan)' }} />
              <span className="tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 800,
                color: 'var(--muted)'
              }}>
                AI 분석 완료
              </span>
            </div>

            <h2 className="m-0 mb-4 leading-none tracking-[-0.075em]" style={{
              fontSize: '24px',
              fontWeight: 950
            }}>
              AI 변경 요약
            </h2>
            <p className="m-0 mb-6 leading-[1.65] tracking-tight" style={{
              fontSize: '16px',
              fontWeight: 700,
              color: 'var(--white)'
            }}>
              {prData.aiSummary}
            </p>

            <h3 className="m-0 mb-4 tracking-[-0.065em]" style={{
              fontSize: '20px',
              fontWeight: 950
            }}>
              위험 항목
            </h3>
            <div className="grid gap-3 mb-6">
              {prData.riskItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-4 rounded-2xl" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: `1px solid ${getRiskColor(item.severity)}44`
                }}>
                  <AlertTriangle size={18} style={{ color: getRiskColor(item.severity), flexShrink: 0, marginTop: '2px' }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-xs font-black tracking-tight" style={{
                        background: `${getRiskColor(item.severity)}33`,
                        color: getRiskColor(item.severity)
                      }}>
                        {getSeverityLabel(item.severity)}
                      </span>
                    </div>
                    <p className="m-0 tracking-tight" style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--white)'
                    }}>
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="m-0 mb-4 tracking-[-0.065em]" style={{
              fontSize: '20px',
              fontWeight: 950
            }}>
              리뷰 체크리스트
            </h3>
            <div className="grid gap-3">
              {prData.checklist.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-4 rounded-2xl" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  opacity: item.checked ? 0.7 : 1
                }}>
                  <input
                    type="checkbox"
                    checked={item.checked}
                    readOnly
                    className="mt-1 flex-shrink-0"
                    style={{ accentColor: 'var(--matrix-green)' }}
                  />
                  <p className="m-0 tracking-tight" style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--white)',
                    textDecoration: item.checked ? 'line-through' : 'none'
                  }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="px-8 py-8 rounded-[30px]" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <h2 className="m-0 mb-4 leading-none tracking-[-0.075em]" style={{
              fontSize: '24px',
              fontWeight: 950
            }}>
              변경 파일 ({prData.files.length})
            </h2>

            <div className="grid gap-2">
              {prData.files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)'
                }}>
                  <div className="flex items-center gap-3">
                    <FileCode size={18} style={{ color: 'var(--neon-cyan)' }} />
                    <span className="font-mono tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 800,
                      color: 'var(--white)'
                    }}>
                      {file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tracking-tight" style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: 'var(--matrix-green)'
                    }}>
                      +{file.additions}
                    </span>
                    <span className="tracking-tight" style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#FF6B6B'
                    }}>
                      -{file.deletions}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="grid gap-6 lg:sticky lg:top-24 h-fit">
          <section className="px-6 py-6 rounded-[30px]" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={20} style={{ color: 'var(--neon-cyan)' }} />
              <h2 className="m-0 leading-none tracking-[-0.075em]" style={{
                fontSize: '20px',
                fontWeight: 950
              }}>
                팀원 대화
              </h2>
            </div>

            <div className="grid gap-3 mb-4 max-h-[400px] overflow-y-auto">
              {prData.messages.map((msg, idx) => (
                <div key={idx} className="px-4 py-3 rounded-xl" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)'
                }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 900,
                      color: 'var(--matrix-green)'
                    }}>
                      {msg.user}
                    </span>
                    <span className="tracking-tight" style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {msg.time}
                    </span>
                  </div>
                  <p className="m-0 leading-[1.5] tracking-tight" style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--white)'
                  }}>
                    {msg.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-3 rounded-xl border-0 tracking-tight"
                style={{
                  background: 'rgba(5, 11, 20, 0.6)',
                  border: '1px solid rgba(32, 227, 255, 0.14)',
                  color: 'var(--white)',
                  fontSize: '14px',
                  fontWeight: 700
                }}
              />
              <button className="px-4 py-3 rounded-xl border-0 flex items-center gap-2" style={{
                background: 'linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))',
                color: '#021014',
                fontWeight: 950
              }}>
                <Send size={18} />
              </button>
            </div>

            <button className="w-full mt-3 px-4 py-3 rounded-xl border-0 flex items-center justify-center gap-2 tracking-tight" style={{
              background: 'rgba(32, 227, 255, 0.10)',
              border: '1px solid rgba(32, 227, 255, 0.22)',
              color: 'var(--neon-cyan)',
              fontSize: '14px',
              fontWeight: 900
            }}>
              <Sparkles size={18} />
              AI 대화 요약
            </button>
          </section>

          <section className="px-6 py-6 rounded-[30px]" style={{
            background: 'rgba(11, 22, 40, 0.82)',
            border: '1px solid rgba(32, 227, 255, 0.16)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.32)',
            backdropFilter: 'blur(16px)'
          }}>
            <h3 className="m-0 mb-4 tracking-[-0.065em]" style={{
              fontSize: '18px',
              fontWeight: 950
            }}>
              결정사항
            </h3>
            <div className="grid gap-2 mb-5">
              {prData.decisions.map((decision, idx) => (
                <div key={idx} className="px-4 py-3 rounded-xl" style={{
                  background: 'rgba(57, 255, 136, 0.08)',
                  border: '1px solid rgba(57, 255, 136, 0.22)'
                }}>
                  <p className="m-0 mb-1 leading-[1.4] tracking-tight" style={{
                    fontSize: '13px',
                    fontWeight: 800,
                    color: 'var(--white)'
                  }}>
                    {decision.text}
                  </p>
                  <span className="tracking-tight" style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    {decision.time}
                  </span>
                </div>
              ))}
            </div>

            <h3 className="m-0 mb-4 tracking-[-0.065em]" style={{
              fontSize: '18px',
              fontWeight: 950
            }}>
              액션아이템
            </h3>
            <div className="grid gap-2">
              {prData.actionItems.map((item, idx) => (
                <div key={idx} className="px-4 py-3 rounded-xl" style={{
                  background: 'rgba(5, 11, 20, 0.42)',
                  border: '1px solid rgba(32, 227, 255, 0.10)',
                  opacity: item.status === 'completed' ? 0.6 : 1
                }}>
                  <div className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={item.status === 'completed'}
                      readOnly
                      className="mt-0.5 flex-shrink-0"
                      style={{ accentColor: 'var(--matrix-green)' }}
                    />
                    <div className="flex-1">
                      <p className="m-0 mb-1 leading-[1.4] tracking-tight" style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: 'var(--white)',
                        textDecoration: item.status === 'completed' ? 'line-through' : 'none'
                      }}>
                        {item.text}
                      </p>
                      <span className="tracking-tight" style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: 'var(--muted)'
                      }}>
                        담당: {item.assignee}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid grid-cols-2 gap-3">
            <button className="px-4 py-4 rounded-xl border-0 flex items-center justify-center gap-2 tracking-tight" style={{
              background: 'rgba(255, 107, 107, 0.15)',
              border: '1px solid #FF6B6B',
              color: '#FF6B6B',
              fontSize: '15px',
              fontWeight: 900
            }}>
              보류
            </button>
            <button className="px-4 py-4 rounded-xl border-0 flex items-center justify-center gap-2 tracking-tight" style={{
              background: 'linear-gradient(135deg, var(--matrix-green), var(--deep-teal))',
              color: '#021014',
              fontSize: '15px',
              fontWeight: 900
            }}>
              <CheckCircle2 size={18} />
              승인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
