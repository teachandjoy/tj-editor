import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store/context';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AcademicPage from './pages/AcademicPage';
import TopicsPage from './pages/TopicsPage';
import EditorPage from './pages/EditorPage';
import PreviewPage from './pages/PreviewPage';
import TemplatesPage from './pages/TemplatesPage';
import BibliographyPage from './pages/BibliographyPage';
import RepositoryPage from './pages/RepositoryPage';
import EditorialPage from './pages/EditorialPage';
import ExportPage from './pages/ExportPage';
import UsersPage from './pages/UsersPage';
import IdentitiesPage from './pages/IdentitiesPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import AuditLogPage from './pages/AuditLogPage';
import OfflineBanner from './components/ui/OfflineBanner';
import ToastContainer from './components/ui/Toast';
import { useApp } from './store/context';

function AppContent() {
  const { isOnline } = useApp();
  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      <ToastContainer />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/academic" element={<AcademicPage />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/editor/:topicId" element={<EditorPage />} />
            <Route path="/preview/:topicId" element={<PreviewPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/bibliography" element={<BibliographyPage />} />
            <Route path="/repository" element={<RepositoryPage />} />
            <Route path="/editorial" element={<EditorialPage />} />
            <Route path="/export" element={<ExportPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/identities" element={<IdentitiesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
