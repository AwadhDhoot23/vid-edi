import { useState, useEffect } from 'react';
import { ThemeProvider } from '@vid-edi/ui';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineView } from './components/TimelineView';
import { MediaDropzone } from './components/MediaDropzone';
import { AIAssistantPanel } from './components/AIAssistantPanel';
import { TranscriptPanel } from './components/TranscriptPanel';
import { CoverPage } from './components/CoverPage';
import { useTimelineStore } from '@vid-edi/editor-engine';

export function App() {
  const { activeSource } = useTimelineStore();
  const [currentView, setCurrentView] = useState<'home' | 'studio'>('home');

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#studio') {
        setCurrentView('studio');
      } else if (window.location.hash === '#home') {
        setCurrentView('home');
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const goToStudio = () => {
    setCurrentView('studio');
    window.location.hash = 'studio';
  };

  const goToHome = () => {
    setCurrentView('home');
    window.location.hash = 'home';
  };

  return (
    <ThemeProvider>
      {currentView === 'home' ? (
        <CoverPage onLaunchStudio={goToStudio} />
      ) : (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
          {/* Studio Top Header Bar with Home Navigation */}
          <Header onGoHome={goToHome} />

          {/* Main Center Editor Canvas */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left Sidebar (Media & Inspector) */}
            <div className="w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col shrink-0 overflow-y-auto">
              <MediaDropzone />
            </div>

            {/* Center Stage: Video Player + Timelines */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <VideoPlayer />
              <TimelineView />
            </div>

            {/* Transcript Sync Panel */}
            {activeSource && <TranscriptPanel />}

            {/* Right AI Assistant & Edit Proposals */}
            <AIAssistantPanel />
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
