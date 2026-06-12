import { useEffect } from "react";

export function OAuthPopupCallbackPage() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("github_link_token");
        const error = params.get("error");

        if (window.opener) {
            window.opener.postMessage(
                { type: "github-link", token, error },
                window.location.origin
            );
        }

        window.close();
    }, []);

    return (
        <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">GitHub 연동 처리 중...</p>
        </div>
    );
}