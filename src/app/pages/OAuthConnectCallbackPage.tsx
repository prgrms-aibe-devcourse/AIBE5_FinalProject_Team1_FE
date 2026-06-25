import { useEffect } from "react";

export function OAuthConnectCallbackPage() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        const reason = params.get("reason");

        if (window.opener) {
            window.opener.postMessage(
                { type: "github-connect", status, reason },
                window.location.origin
            );
        }

        window.close();
    }, []);

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">GitHub 연결 처리 중...</p>
        </div>
    );
}
