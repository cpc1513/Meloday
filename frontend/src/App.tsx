import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { ToastProvider } from './components/Toast';
import MiniPlayer from './components/MiniPlayer';
import ErrorBoundary from './components/ErrorBoundary';
import DiaryPage from './pages/DiaryPage';
import CalendarPage from './pages/CalendarPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import { PlayerProvider } from './hooks/usePlayer';

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <PlayerProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<DiaryPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
            <MiniPlayer />
          </div>
        </PlayerProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
