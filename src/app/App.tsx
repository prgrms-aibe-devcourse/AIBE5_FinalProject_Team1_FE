import { type ReactNode, lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Outlet, Routes, Route, useLocation } from "react-router";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { WorkspaceProvider } from "./contexts/WorkspaceContext";
import { Layout } from "./components/Layout";
import { AuthLayout } from "./components/AuthLayout";
import { PublicLayout } from "./components/PublicLayout";
import { LanguageDomSync } from "./components/LanguageDomSync";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { isAuthenticated } from "./auth";

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage").then((module) => ({ default: module.WorkspacePage })));
const ProjectPage = lazy(() => import("./pages/ProjectPage").then((module) => ({ default: module.ProjectPage })));
const IssueBoardPage = lazy(() => import("./pages/IssueBoardPage").then((module) => ({ default: module.IssueBoardPage })));
const ChatPage = lazy(() => import("./pages/ChatPage").then((module) => ({ default: module.ChatPage })));
const APISpecPage = lazy(() => import("./pages/APISpecPage").then((module) => ({ default: module.APISpecPage })));
const ERDPage = lazy(() => import("./pages/ERDPage").then((module) => ({ default: module.ERDPage })));
const DocsPage = lazy(() => import("./pages/DocsPage").then((module) => ({ default: module.DocsPage })));
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })));
const SignupPage = lazy(() => import("./pages/SignupPage").then((module) => ({ default: module.SignupPage })));
const AccountRecoveryPage = lazy(() => import("./pages/AccountRecoveryPage").then((module) => ({ default: module.AccountRecoveryPage })));
const ProfilePage = lazy(() => import("./pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const WorkspaceSettingsPage = lazy(() => import("./pages/WorkspaceSettingsPage").then((module) => ({ default: module.WorkspaceSettingsPage })));
const LegalPage = lazy(() => import("./pages/LegalPage").then((module) => ({ default: module.LegalPage })));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage").then((module) => ({ default: module.OAuthCallbackPage })));
const OAuthPopupCallbackPage = lazy(() => import("./pages/OAuthPopupCallbackPage").then((module) => ({ default: module.OAuthPopupCallbackPage })));
const OAuthConnectCallbackPage = lazy(() => import("./pages/OAuthConnectCallbackPage").then((module) => ({ default: module.OAuthConnectCallbackPage })));
const InviteAcceptPage = lazy(() => import("./pages/InviteAcceptPage").then((module) => ({ default: module.InviteAcceptPage })));

function HomeRoute() {
  return isAuthenticated() ? <Navigate to="/workspace" replace /> : <HomePage />;
}

function RequireAuth() {
  const location = useLocation();
  if (isAuthenticated()) {
    return <Outlet />;
  }
  const next = encodeURIComponent(`${location.pathname}${location.search}`);
  return <Navigate to={`/login?next=${next}`} replace />;
}

function RouteFallback() {
  return (
    <div
      aria-hidden="true"
      style={{
        minHeight: "100vh",
        background: "var(--bg, #050B14)"
      }}
    />
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ProfileProvider>
        <WorkspaceProvider>
        <BrowserRouter>
          <LanguageDomSync />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomeRoute />} />
                <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
                <Route path="/oauth/popup-callback" element={<OAuthPopupCallbackPage />} />
                <Route path="/oauth/connect-callback" element={<OAuthConnectCallbackPage />} />
                <Route path="/invite/:token" element={<InviteAcceptPage />} />
                <Route path="/terms" element={<LegalPage kind="terms" />} />
                <Route path="/privacy" element={<LegalPage kind="privacy" />} />
              </Route>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/account-recovery" element={<AccountRecoveryPage />} />
                <Route path="/forgot-password" element={<AccountRecoveryPage />} />
              </Route>
              <Route element={<RequireAuth />}>
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
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
        </WorkspaceProvider>
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
