import { BrowserRouter, Routes, Route } from "react-router";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
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
import { ProfilePage } from "./pages/ProfilePage";
import { SettingsPage } from "./pages/SettingsPage";

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BrowserRouter>
          <LanguageDomSync />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
            </Route>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
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
      </LanguageProvider>
    </ThemeProvider>
  );
}
