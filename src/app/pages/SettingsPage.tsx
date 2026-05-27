import { useState } from "react";
import { motion } from "motion/react";
import { Bell, Shield, Palette, Globe, Save } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage, type LanguageType } from "../contexts/LanguageContext";

export function SettingsPage() {
  const { colors } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState({
    notifications: {
      email: true,
      desktop: true,
      mentions: true,
      prReviews: true,
      issueUpdates: false
    },
    privacy: {
      profileVisibility: 'public',
      activityVisibility: 'team',
      emailVisibility: false
    },
    appearance: {
      theme: 'dark',
      language
    }
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    console.log('Settings saved:', settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-[min(1400px,100%)] mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="mb-8">
          <h1 className="m-0 mb-2 leading-none tracking-[-0.08em]" style={{
            fontSize: 'clamp(32px, 4vw, 42px)',
            fontWeight: 950,
            color: 'var(--white)',
            textShadow: `0 0 22px ${colors.primary}, 0.18)`
          }}>
            설정
          </h1>
          <p className="m-0 tracking-tight" style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--muted)'
          }}>
            계정 및 애플리케이션 설정을 관리하세요
          </p>
        </div>

        <div className="grid gap-6">
          {/* 알림 설정 */}
          <div className="px-8 py-6 rounded-[24px]" style={{
            background: 'rgba(11, 22, 40, 0.75)',
            border: `1px solid ${colors.primary}, 0.18)`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 0 1px rgba(255, 255, 255, 0.03) inset`,
            backdropFilter: 'blur(20px) saturate(180%)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: `${colors.primary}, 0.1)`,
                border: `1px solid ${colors.primary}, 0.22)`
              }}>
                <Bell size={20} strokeWidth={2} style={{ color: colors.primaryHex }} />
              </div>
              <h2 className="m-0 tracking-tight" style={{
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--white)'
              }}>
                알림 설정
              </h2>
            </div>

            <div className="grid gap-4">
              {[
                { key: 'email', label: '이메일 알림', desc: '중요한 업데이트를 이메일로 받습니다' },
                { key: 'desktop', label: '데스크톱 알림', desc: '브라우저 푸시 알림을 받습니다' },
                { key: 'mentions', label: '멘션 알림', desc: '누군가 나를 언급했을 때 알림을 받습니다' },
                { key: 'prReviews', label: 'PR 리뷰 요청', desc: 'PR 리뷰 요청 시 알림을 받습니다' },
                { key: 'issueUpdates', label: '이슈 업데이트', desc: '할당된 이슈의 업데이트를 받습니다' }
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-4 cursor-pointer p-4 rounded-xl transition-all hover:bg-[rgba(32,227,255,0.05)]">
                  <input
                    type="checkbox"
                    checked={settings.notifications[item.key as keyof typeof settings.notifications]}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        [item.key]: e.target.checked
                      }
                    })}
                    className="mt-1 w-5 h-5 rounded cursor-pointer flex-shrink-0"
                    style={{ accentColor: colors.primaryHex }}
                  />
                  <div className="flex-1">
                    <p className="m-0 mb-1 tracking-tight" style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      color: 'var(--white)'
                    }}>
                      {item.label}
                    </p>
                    <p className="m-0 tracking-tight" style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--muted)'
                    }}>
                      {item.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 개인정보 설정 */}
          <div className="px-8 py-6 rounded-[24px]" style={{
            background: 'rgba(11, 22, 40, 0.75)',
            border: `1px solid ${colors.primary}, 0.18)`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 0 1px rgba(255, 255, 255, 0.03) inset`,
            backdropFilter: 'blur(20px) saturate(180%)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: `${colors.primary}, 0.1)`,
                border: `1px solid ${colors.primary}, 0.22)`
              }}>
                <Shield size={20} strokeWidth={2} style={{ color: colors.primaryHex }} />
              </div>
              <h2 className="m-0 tracking-tight" style={{
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--white)'
              }}>
                개인정보 보호
              </h2>
            </div>

            <div className="grid gap-5">
              <div>
                <label className="block mb-2 tracking-tight" style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  프로필 공개 범위
                </label>
                <select
                  value={settings.privacy.profileVisibility}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, profileVisibility: e.target.value }
                  })}
                  className="w-full px-4 py-3 rounded-xl border-0 tracking-tight cursor-pointer"
                  style={{
                    background: 'rgba(5, 11, 20, 0.6)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700
                  }}
                >
                  <option value="public">전체 공개</option>
                  <option value="team">팀원만</option>
                  <option value="private">비공개</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 tracking-tight" style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  활동 내역 공개 범위
                </label>
                <select
                  value={settings.privacy.activityVisibility}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, activityVisibility: e.target.value }
                  })}
                  className="w-full px-4 py-3 rounded-xl border-0 tracking-tight cursor-pointer"
                  style={{
                    background: 'rgba(5, 11, 20, 0.6)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700
                  }}
                >
                  <option value="public">전체 공개</option>
                  <option value="team">팀원만</option>
                  <option value="private">비공개</option>
                </select>
              </div>

              <label className="flex items-start gap-4 cursor-pointer p-4 rounded-xl transition-all hover:bg-[rgba(32,227,255,0.05)]">
                <input
                  type="checkbox"
                  checked={settings.privacy.emailVisibility}
                  onChange={(e) => setSettings({
                    ...settings,
                    privacy: { ...settings.privacy, emailVisibility: e.target.checked }
                  })}
                  className="mt-1 w-5 h-5 rounded cursor-pointer flex-shrink-0"
                  style={{ accentColor: colors.primaryHex }}
                />
                <div className="flex-1">
                  <p className="m-0 mb-1 tracking-tight" style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--white)'
                  }}>
                    이메일 주소 공개
                  </p>
                  <p className="m-0 tracking-tight" style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--muted)'
                  }}>
                    프로필에 이메일 주소를 표시합니다
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 외형 설정 */}
          <div className="px-8 py-6 rounded-[24px]" style={{
            background: 'rgba(11, 22, 40, 0.75)',
            border: `1px solid ${colors.primary}, 0.18)`,
            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3),
              inset 0 1px 0 rgba(255, 255, 255, 0.1),
              0 0 0 1px rgba(255, 255, 255, 0.03) inset`,
            backdropFilter: 'blur(20px) saturate(180%)'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                background: `${colors.primary}, 0.1)`,
                border: `1px solid ${colors.primary}, 0.22)`
              }}>
                <Palette size={20} strokeWidth={2} style={{ color: colors.primaryHex }} />
              </div>
              <h2 className="m-0 tracking-tight" style={{
                fontSize: '20px',
                fontWeight: 900,
                color: 'var(--white)'
              }}>
                외형 및 언어
              </h2>
            </div>

            <div className="grid gap-5">
              <div>
                <label className="block mb-2 tracking-tight" style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  테마
                </label>
                <select
                  value={settings.appearance.theme}
                  onChange={(e) => setSettings({
                    ...settings,
                    appearance: { ...settings.appearance, theme: e.target.value }
                  })}
                  className="w-full px-4 py-3 rounded-xl border-0 tracking-tight cursor-pointer"
                  style={{
                    background: 'rgba(5, 11, 20, 0.6)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700
                  }}
                >
                  <option value="dark">다크 모드</option>
                  <option value="light">라이트 모드</option>
                  <option value="auto">시스템 설정</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 tracking-tight" style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  color: 'var(--white)'
                }}>
                  언어
                </label>
                <select
                  value={language}
                  onChange={(e) => {
                    const nextLanguage = e.target.value as LanguageType;
                    setLanguage(nextLanguage);
                    setSettings({
                      ...settings,
                      appearance: { ...settings.appearance, language: nextLanguage }
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl border-0 tracking-tight cursor-pointer"
                  style={{
                    background: 'rgba(5, 11, 20, 0.6)',
                    border: `1px solid ${colors.primary}, 0.14)`,
                    color: 'var(--white)',
                    fontSize: '15px',
                    fontWeight: 700
                  }}
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-8 py-4 rounded-xl border-0 tracking-tight cursor-pointer transition-all hover:scale-[1.02]"
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: '#021014',
                background: saved
                  ? 'linear-gradient(135deg, var(--matrix-green), #2ecc71)'
                  : `linear-gradient(135deg, ${colors.primaryHex}, ${colors.secondary})`,
                boxShadow: saved
                  ? '0 0 24px rgba(57, 255, 136, 0.24)'
                  : `0 0 24px ${colors.primary}, 0.24)`
              }}
            >
              <Save size={20} strokeWidth={2} />
              {saved ? '저장됨!' : '설정 저장'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
