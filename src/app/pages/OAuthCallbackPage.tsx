import { useEffect } from "react";
import { useNavigate } from "react-router";
import { setTokens } from "../auth";

export function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken  = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const error        = params.get("error");

    if (error || !accessToken || !refreshToken) {
      navigate("/login?error=oauth_failed", { replace: true });
      return;
    }

    setTokens(accessToken, refreshToken);
    const next = sessionStorage.getItem("codedock-oauth-next");
    sessionStorage.removeItem("codedock-oauth-next");
    navigate(next && next.startsWith("/") && !next.startsWith("//") ? next : "/workspace", { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">로그인 처리 중...</p>
    </div>
  );
}
