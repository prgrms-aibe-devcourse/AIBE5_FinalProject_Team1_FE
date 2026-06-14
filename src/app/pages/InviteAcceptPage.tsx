import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router";
import { acceptInvite, rejectInvite } from "../api/workspace";
import { ApiClientError } from "../api/client";
import { isAuthenticated } from "../auth";

export function InviteAcceptPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [pending, setPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!token) {
        return <Navigate to="/workspace" replace />;
    }
    if (!isAuthenticated()) {
        return <Navigate to={`/login?next=${encodeURIComponent(`/invite/${token}`)}`} replace />;
    }

    const errorMessage = (e: unknown) =>
        e instanceof ApiClientError ? e.message : "초대 처리 중 오류가 발생했습니다.";

    const handleAccept = () => {
        setPending(true);
        setError(null);
        acceptInvite(token)
            .then(() => navigate("/workspace", { replace: true }))
            .catch((e) => { setError(errorMessage(e)); setPending(false); });
    };

    const handleReject = () => {
        setPending(true);
        setError(null);
        rejectInvite(token)
            .then(() => navigate("/workspace", { replace: true }))
            .catch((e) => { setError(errorMessage(e)); setPending(false); });
    };

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: "24px" }}>
            <div style={{ maxWidth: "420px", width: "100%", textAlign: "center" }}>
                <h1 style={{ fontSize: "20px", fontWeight: 900, color: "var(--white)", margin: "0 0 8px" }}>
                    워크스페이스 초대
                </h1>
                <p style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 700, margin: "0 0 24px", lineHeight: 1.5 }}>
                    이 워크스페이스 초대를 수락하시겠습니까?
                </p>
                {error && (
                    <p style={{ fontSize: "13px", color: "#FF6B6B", fontWeight: 800, margin: "0 0 16px" }}>{error}</p>
                )}
                <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                    <button type="button" onClick={handleReject} disabled={pending}
                            style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "var(--muted)", fontSize: "14px", fontWeight: 900, cursor: pending ? "not-allowed" : "pointer" }}>
                        거절
                    </button>
                    <button type="button" onClick={handleAccept} disabled={pending}
                            style={{ padding: "10px 20px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, var(--neon-cyan), var(--deep-teal))", color: "#021014", fontSize: "14px", fontWeight: 900, cursor: pending ? "not-allowed" : "pointer" }}>
                        {pending ? "처리 중..." : "수락"}
                    </button>
                </div>
            </div>
        </div>
    );
}