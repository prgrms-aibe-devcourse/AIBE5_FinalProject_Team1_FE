import { type ReactNode } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { Layout } from "./components/Layout";
import { AuthLayout } from "./components/AuthLayout";
import { PublicLayout } from "./components/PublicLayout";
import { LanguageDomSync } from "./components/LanguageDomSync";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { HomePage } from "./pages/HomePage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { ProjectPage } from "./pages/ProjectPage";
import { IssueBoardPage } from "./pages/IssueBoardPage";
import { ChatPage } from "./pages/ChatPage";
import { APISpecPage } from "./pages/APISpecPage";
import { ERDPage } from "./pages/ERDPage";
import { DocsPage } from "./pages/DocsPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { AccountRecoveryPage } from "./pages/AccountRecoveryPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";
import { WorkspaceSettingsPage } from "./pages/WorkspaceSettingsPage";
import { LegalPage } from "./pages/LegalPage";
import { OAuthCallbackPage } from "./pages/OAuthCallbackPage";
import { OAuthPopupCallbackPage } from "./pages/OAuthPopupCallbackPage";
import { isAuthenticated } from "./auth";

function HomeRoute() {
  return isAuthenticated() ? <Navigate to="/workspace" replace /> : <HomePage />;
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ProfileProvider>
        <BrowserRouter>
          <LanguageDomSync />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
              <Route path="/oauth/popup-callback" element={<OAuthPopupCallbackPage />} />
              <Route path="/terms" element={<LegalPage kind="terms" />} />
              <Route path="/privacy" element={<LegalPage kind="privacy" />} />
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/account-recovery" element={<AccountRecoveryPage />} />
              <Route path="/forgot-password" element={<AccountRecoveryPage />} />
            </Route>
            <Route element={<Layout />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/workspace-settings" element={<WorkspaceSettingsPage />} />
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/project" element={<ProjectPage />} />
              <Route path="/issues" element={<IssueBoardPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/api-spec" element={<PageBoundary><APISpecPage /></PageBoundary>} />
              <Route path="/erd" element={<PageBoundary><ERDPage /></PageBoundary>} />
              <Route path="/docs" element={<PageBoundary><DocsPage /></PageBoundary>} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ProfileProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function PageBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallbackTitle="페이지를 불러오지 못했습니다"
      fallbackMessage="화면 전환 중 렌더링 오류가 발생했습니다. 다른 메뉴로 이동한 뒤 다시 열어주세요."
    >
      {children}
    </ErrorBoundary>
  );
}
