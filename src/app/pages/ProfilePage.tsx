import { useState } from "react";
import { User, Mail, Building, Github, CheckCircle2, AlertCircle, Link as LinkIcon, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";

export function ProfilePage() {
  const { colors } = useTheme();
  const [user, setUser] = useState({
    name: '김준우',
    email: 'junwoo@codedock.dev',
    workspace: 'DevFlow Team',
    avatar: null,
    githubConnected: true,
    githubUsername: 'kimjunwoo',
    githubEmail: 'kimjunwoo@github.com',
    connectedAt: '2024-01-15'
  });

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    workspace: user.workspace
  });

  const handleSave = () => {
    setUser({
      ...user,
      ...formData
    });
    setIsEditing(false);
  };

  const handleGithubConnect = () => {
    console.log('Connect GitHub');
  };

  const handleGithubDisconnect = () => {
    console.log('Disconnect GitHub');
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="w-[min(1000px,calc(100vw-36px))] mx-auto py-12 pb-20">
      <motion.div {...fadeInUp}>
        <h1 className="m-0 mb-2 leading-[0.9] tracking-[-0.08em]" style={{
          fontSize: 'clamp(48px, 6vw, 72px)',
          fontWeight: 950,
          color: 'var(--white)',
          textShadow: `0 0 22px ${colors.primary}, 0.18)`
        }}>
          프로필
        </h1>
        <p className="m-0 mb-8 tracking-tight" style={{
          fontSize: '18px',
          fontWeight: 700,
          color: 'var(--muted)'
        }}>
          계정 정보를 관리하고 GitHub를 연동하세요
        </p>
      </motion.div>

      <div className="grid gap-6">
        <motion.section
          {...fadeInUp}
          transition={{ delay: 0.1 }}
          className="px-8 py-8 rounded-[30px]"
          style={{
            background: 'rgba(11, 22, 40, 0.75)',
            border: `1px solid ${colors.primary}, 0.18)`,
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 0 1px rgba(255, 255, 255, 0.03) inset
            `,
            backdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="m-0 leading-none tracking-[-0.075em]" style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 950
            }}>
              기본 정보
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl border-0 tracking-tight cursor-pointer transition-all hover:scale-105"
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: colors.primaryHex,
                  background: `${colors.primary}, 0.10)`,
                  border: `1px solid ${colors.primary}, 0.22)`
                }}
              >
                수정
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      name: user.name,
                      email: user.email,
                      workspace: user.workspace
                    });
                  }}
                  className="px-4 py-2 rounded-xl border-0 tracking-tight cursor-pointer transition-all"
                  style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: 'var(--muted)',
                    background: 'rgba(234, 247, 255, 0.055)',
                    border: `1px solid ${colors.primary}, 0.14)`
                  }}
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 rounded-xl border-0 tracking-tight cursor-pointer transition-all hover:scale-105"
                  style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: '#021014',
                    background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                    boxShadow: `0 0 24px ${colors.primary}, 0.24)`
                  }}
                >
                  저장
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-5">
            <div>
              <label className="block mb-2 tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 900,
                color: 'var(--white)'
              }}>
                이름
              </label>
              <div className="relative">
                <User size={20} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-0 tracking-tight"
                  style={{
                    background: isEditing ? 'rgba(5, 11, 20, 0.6)' : 'rgba(5, 11, 20, 0.3)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isEditing ? 'text' : 'not-allowed'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 900,
                color: 'var(--white)'
              }}>
                이메일
              </label>
              <div className="relative">
                <Mail size={20} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-0 tracking-tight"
                  style={{
                    background: isEditing ? 'rgba(5, 11, 20, 0.6)' : 'rgba(5, 11, 20, 0.3)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isEditing ? 'text' : 'not-allowed'
                  }}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 tracking-tight" style={{
                fontSize: '14px',
                fontWeight: 900,
                color: 'var(--white)'
              }}>
                워크스페이스
              </label>
              <div className="relative">
                <Building size={20} strokeWidth={2} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
                <input
                  type="text"
                  value={formData.workspace}
                  onChange={(e) => setFormData({ ...formData, workspace: e.target.value })}
                  disabled={!isEditing}
                  className="w-full pl-12 pr-4 py-3 rounded-xl border-0 tracking-tight"
                  style={{
                    background: isEditing ? 'rgba(5, 11, 20, 0.6)' : 'rgba(5, 11, 20, 0.3)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: isEditing ? 'text' : 'not-allowed'
                  }}
                />
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          {...fadeInUp}
          transition={{ delay: 0.2 }}
          className="px-8 py-8 rounded-[30px]"
          style={{
            background: 'rgba(11, 22, 40, 0.75)',
            border: `1px solid ${colors.primary}, 0.18)`,
            boxShadow: `
              0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 0 1px rgba(255, 255, 255, 0.03) inset
            `,
            backdropFilter: 'blur(20px) saturate(180%)'
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Github size={28} strokeWidth={2} style={{ color: colors.primaryHex }} />
            <h2 className="m-0 leading-none tracking-[-0.075em]" style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 950
            }}>
              GitHub 연동
            </h2>
          </div>

          {user.githubConnected ? (
            <div>
              <div className="px-6 py-5 mb-5 rounded-2xl" style={{
                background: 'rgba(57, 255, 136, 0.08)',
                border: '1px solid rgba(57, 255, 136, 0.22)'
              }}>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <CheckCircle2 size={24} strokeWidth={2} style={{ color: 'var(--matrix-green)', flexShrink: 0 }} />
                    <div className="flex-1">
                      <p className="m-0 mb-1 tracking-tight" style={{
                        fontSize: '16px',
                        fontWeight: 900,
                        color: 'var(--white)'
                      }}>
                        GitHub 계정이 연동되었습니다
                      </p>
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: 'var(--muted)'
                      }}>
                        PR 분석, 자동 리뷰, Webhook 알림을 사용할 수 있습니다
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{
                    background: 'rgba(5, 11, 20, 0.4)',
                    border: `1px solid ${colors.primary}, 0.10)`
                  }}>
                    <User size={18} strokeWidth={2} style={{ color: colors.primaryHex }} />
                    <div className="flex-1">
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--muted)'
                      }}>
                        GitHub 사용자명
                      </p>
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 900,
                        color: 'var(--white)'
                      }}>
                        @{user.githubUsername}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{
                    background: 'rgba(5, 11, 20, 0.4)',
                    border: `1px solid ${colors.primary}, 0.10)`
                  }}>
                    <Mail size={18} strokeWidth={2} style={{ color: colors.primaryHex }} />
                    <div className="flex-1">
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--muted)'
                      }}>
                        GitHub 이메일
                      </p>
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 900,
                        color: 'var(--white)'
                      }}>
                        {user.githubEmail}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{
                    background: 'rgba(5, 11, 20, 0.4)',
                    border: `1px solid ${colors.primary}, 0.10)`
                  }}>
                    <Calendar size={18} strokeWidth={2} style={{ color: colors.primaryHex }} />
                    <div className="flex-1">
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        color: 'var(--muted)'
                      }}>
                        연동일
                      </p>
                      <p className="m-0 tracking-tight" style={{
                        fontSize: '14px',
                        fontWeight: 900,
                        color: 'var(--white)'
                      }}>
                        {user.connectedAt}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGithubDisconnect}
                className="w-full px-6 py-3 rounded-xl border-0 tracking-tight cursor-pointer transition-all hover:scale-[1.02]"
                style={{
                  fontSize: '15px',
                  fontWeight: 900,
                  color: '#FF6B6B',
                  background: 'rgba(255, 107, 107, 0.1)',
                  border: '1px solid rgba(255, 107, 107, 0.3)'
                }}
              >
                GitHub 연동 해제
              </button>
            </div>
          ) : (
            <div>
              <div className="px-6 py-5 mb-5 rounded-2xl" style={{
                background: 'rgba(255, 107, 107, 0.08)',
                border: '1px solid rgba(255, 107, 107, 0.22)'
              }}>
                <div className="flex items-start gap-3">
                  <AlertCircle size={24} strokeWidth={2} style={{ color: '#FF6B6B', flexShrink: 0 }} />
                  <div>
                    <p className="m-0 mb-1 tracking-tight" style={{
                      fontSize: '16px',
                      fontWeight: 900,
                      color: 'var(--white)'
                    }}>
                      GitHub 계정이 연동되지 않았습니다
                    </p>
                    <p className="m-0 tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      GitHub를 연동하면 PR 자동 분석, 실시간 알림 등의 기능을 사용할 수 있습니다
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleGithubConnect}
                className="w-full px-6 py-4 rounded-xl border-0 tracking-tight cursor-pointer transition-all hover:scale-[1.02] flex items-center justify-center gap-3"
                style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#021014',
                  background: `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                  boxShadow: `0 0 24px ${colors.primary}, 0.24)`
                }}
              >
                <Github size={20} strokeWidth={2} />
                GitHub 계정 연동하기
              </button>

              <div className="mt-5 px-5 py-4 rounded-xl" style={{
                background: `${colors.primary}, 0.05)`,
                border: `1px solid ${colors.primary}, 0.14)`
              }}>
                <p className="m-0 mb-3 tracking-tight" style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  GitHub 연동으로 사용 가능한 기능:
                </p>
                <ul className="m-0 pl-5 grid gap-2">
                  {[
                    'PR 자동 동기화 및 실시간 분석',
                    'AI 기반 보안 취약점 탐지',
                    'Webhook을 통한 즉시 알림',
                    '리포지토리 통합 관리',
                    '팀원 자동 매핑'
                  ].map((item, idx) => (
                    <li key={idx} className="tracking-tight" style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
}
