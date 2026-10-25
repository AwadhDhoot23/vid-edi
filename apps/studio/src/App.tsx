import { useState, useEffect } from 'react';
import { ThemeProvider } from '@vid-edi/ui';
import { Header } from './components/Header';
import { VideoPlayer } from './components/VideoPlayer';
import { TimelineView } from './components/TimelineView';
import { ActivityDock } from './components/ActivityDock';
import { PropertyInspector } from './components/PropertyInspector';
import { CoverPage } from './components/CoverPage';

export function App() {
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
          {/* Studio Top Header Bar with Home Navigation & Lossless Export */}
          <Header onGoHome={goToHome} />

          {/* 3-Zone Professional Creator Workspace */}
          <div className="flex-1 flex overflow-hidden">
            {/* Zone 1: Left Activity Dock (Media Bin, Transcript, Text, Filters, Transitions, Audio, AI Copilot) */}
            <ActivityDock />

            {/* Zone 2: Center Stage (Preview Monitor with Live Filters & 5-Track Interactive Timeline) */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              <VideoPlayer />
              <TimelineView />
            </div>

            {/* Zone 3: Right Contextual Property Inspector (Transforms, Audio Ducking, Text Styling, Aspect Ratio) */}
            <PropertyInspector />
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}

export default App;
