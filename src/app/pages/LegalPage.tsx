import { Link } from "react-router";
import { ArrowLeft, FileText, LockKeyhole, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";

type LegalPageKind = "terms" | "privacy";

const legalDocuments = {
  terms: {
    badge: "Terms",
    title: "서비스 이용약관",
    description: "CodeDock 이용 전 확인해야 하는 기본 약관입니다.",
    icon: FileText,
    sections: [
      {
        title: "서비스 목적",
        body: "CodeDock은 PR 리뷰, 보안 점검, API 문서화, ERD 관리, 팀 채팅을 하나의 개발 워크스페이스에서 제공하는 협업 도구입니다.",
      },
      {
        title: "계정 및 인증",
        body: "사용자는 본인에게 유효한 이메일 또는 GitHub 계정으로 가입해야 하며, 계정 접근 권한과 인증 정보를 안전하게 관리해야 합니다.",
      },
      {
        title: "GitHub 연동",
        body: "GitHub 연동 시 리포지토리, PR, 이슈, 리뷰 코멘트 등 협업에 필요한 정보가 CodeDock 워크스페이스에 표시될 수 있습니다. 사용자는 언제든 연동을 해제할 수 있습니다.",
      },
      {
        title: "사용자 콘텐츠",
        body: "사용자가 등록한 코드, 문서, 채팅, 리뷰 코멘트의 권리는 사용자 또는 소속 팀에 있으며, CodeDock은 서비스 제공과 협업 기능 운영에 필요한 범위에서만 이를 처리합니다.",
      },
      {
        title: "AI 리뷰 결과",
        body: "AI가 제공하는 리뷰, 보안 신호, 문서 초안은 개발 의사결정을 돕는 보조 정보입니다. 최종 검토와 병합 여부는 사용자의 책임 하에 결정됩니다.",
      },
      {
        title: "금지 행위",
        body: "타인의 계정 사용, 권한 없는 리포지토리 접근, 악성 코드 업로드, 서비스 장애를 유발하는 자동화 요청, 민감정보의 무단 공유를 금지합니다.",
      },
      {
        title: "서비스 변경 및 제한",
        body: "서비스 품질과 보안을 위해 일부 기능은 변경되거나 제한될 수 있으며, 중요한 변경은 서비스 내 공지 또는 이메일로 안내합니다.",
      },
    ],
  },
  privacy: {
    badge: "Privacy",
    title: "개인정보 처리방침",
    description: "CodeDock이 어떤 정보를 어떤 목적으로 처리하는지 정리한 안내입니다.",
    icon: LockKeyhole,
    sections: [
      {
        title: "수집하는 정보",
        body: "가입 및 이용 과정에서 이름, 이메일, 프로필 이미지, GitHub 사용자 ID, 워크스페이스 및 팀 정보, 서비스 이용 기록이 처리될 수 있습니다.",
      },
      {
        title: "GitHub 연동 정보",
        body: "사용자가 GitHub를 연결하면 리포지토리 이름, PR/이슈 메타데이터, 리뷰 상태, 커밋 및 파일 변경 정보 등 협업 화면 구성을 위한 정보가 사용될 수 있습니다.",
      },
      {
        title: "이용 목적",
        body: "계정 인증, 팀 협업, PR 리뷰, 보안 점검, 문서 생성, 알림 발송, 서비스 안정성 개선을 위해 개인정보와 연동 데이터를 처리합니다.",
      },
      {
        title: "이메일 인증 및 알림",
        body: "비밀번호 재설정, 초대 알림 등 계정 보안과 협업에 필요한 안내는 확인된 이메일로 발송됩니다.",
      },
      {
        title: "보관 및 삭제",
        body: "계정 탈퇴, 워크스페이스 삭제, GitHub 연동 해제 요청 시 관련 정보는 법령상 보관이 필요한 경우를 제외하고 지체 없이 삭제 또는 비식별 처리됩니다.",
      },
      {
        title: "제3자 제공 및 위탁",
        body: "서비스 운영을 위해 GitHub OAuth, 이메일 발송 서비스, 호스팅 및 로그 관리 도구를 사용할 수 있으며, 필요한 범위를 넘어 개인정보를 판매하거나 임의 제공하지 않습니다.",
      },
      {
        title: "사용자 권리",
        body: "사용자는 본인의 개인정보 조회, 수정, 삭제, 처리 정지, GitHub 연동 해제를 요청할 수 있습니다.",
      },
    ],
  },
} satisfies Record<LegalPageKind, { badge: string; title: string; description: string; icon: typeof FileText; sections: Array<{ title: string; body: string }> }>;

export function LegalPage({ kind }: { kind: LegalPageKind }) {
  const { colors } = useTheme();
  const document = legalDocuments[kind];
  const Icon = document.icon;

  return (
    <section className="mx-auto w-[min(980px,calc(100vw-32px))] py-12 pb-20">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="rounded-[34px] px-6 py-7 md:px-9 md:py-10"
        style={{
          background: "rgba(11, 22, 40, 0.78)",
          border: `1px solid ${colors.primary}, 0.18)`,
          boxShadow: `0 30px 90px rgba(0,0,0,0.36), 0 0 64px ${colors.primary}, 0.08)`,
          backdropFilter: "blur(22px) saturate(180%)",
        }}
      >
        <Link to="/signup" className="mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-black no-underline" style={{ color: "var(--muted)", background: "rgba(234,247,255,0.055)" }}>
          <ArrowLeft size={15} />
          회원가입으로 돌아가기
        </Link>

        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2" style={{ background: `${colors.primary}, 0.10)`, color: colors.primaryHex }}>
              <Icon size={16} />
              <span className="text-sm font-black">{document.badge}</span>
            </div>
            <h1 className="m-0 text-[clamp(36px,6vw,64px)] font-black leading-none" style={{ color: "var(--white)", textShadow: `0 0 22px ${colors.primary}, 0.16)` }}>
              {document.title}
            </h1>
            <p className="m-0 mt-4 text-base font-bold leading-[1.65]" style={{ color: "var(--muted)" }}>
              {document.description}
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-[20px] px-4 py-3" style={{ background: "rgba(57,255,136,0.08)", border: "1px solid rgba(57,255,136,0.18)" }}>
            <ShieldCheck size={18} style={{ color: "var(--matrix-green)" }} />
            <span className="text-sm font-black" style={{ color: "var(--white)" }}>
              필수 확인
            </span>
          </div>
        </div>

        <div className="grid gap-4">
          {document.sections.map((section, index) => (
            <article
              key={section.title}
              className="rounded-[24px] px-5 py-5"
              style={{
                background: "rgba(234,247,255,0.045)",
                border: `1px solid ${colors.primary}, 0.12)`,
              }}
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full text-sm font-black" style={{ background: `${colors.primary}, 0.12)`, color: colors.primaryHex }}>
                  {index + 1}
                </span>
                <h2 className="m-0 text-lg font-black" style={{ color: "var(--white)" }}>
                  {section.title}
                </h2>
              </div>
              <p className="m-0 text-sm font-bold leading-[1.75]" style={{ color: "var(--muted)" }}>
                {section.body}
              </p>
            </article>
          ))}
        </div>

        <p className="m-0 mt-8 text-xs font-bold leading-[1.6]" style={{ color: "rgba(234,247,255,0.48)" }}>
          본 문서는 프로젝트 화면 구성을 위한 약관 초안입니다. 실제 서비스 배포 전에는 운영 정책과 법률 검토에 맞춰 보완이 필요합니다.
        </p>
      </motion.div>
    </section>
  );
}
