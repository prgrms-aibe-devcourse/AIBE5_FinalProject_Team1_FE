import { BrowserRouter, Navigate, Routes, Route } from "react-router";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { Layout } from "./components/Layout";
import { AuthLayout } from "./components/AuthLayout";
import { PublicLayout } from "./components/PublicLayout";
import { LanguageDomSync } from "./components/LanguageDomSync";
import { HomePage } from "./pages/HomePage";
import { WorkspacePage } from "./pages/WorkspacePage";
import { ProjectPage } from "./pages/ProjectPage";
import { PRListPage } from "./pages/PRListPage";
import { PRReviewRoomPage } from "./pages/PRReviewRoomPage";
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
import { LegalPage } from "./pages/LegalPage";
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
              <Route path="/workspace" element={<WorkspacePage />} />
              <Route path="/project" element={<ProjectPage />} />
              <Route path="/prs" element={<PRListPage />} />
              <Route path="/pr/:id" element={<PRReviewRoomPage />} />
              <Route path="/issues" element={<IssueBoardPage />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/api-spec" element={<APISpecPage />} />
              <Route path="/erd" element={<ERDPage />} />
              <Route path="/docs" element={<DocsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
        </ProfileProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
