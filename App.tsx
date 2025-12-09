import React, { useState, useEffect, useCallback } from 'react';
import Navigation from './components/Navigation';
import ContentCard from './components/ContentCard';
import SavedList from './components/SavedList';
import LoginScreen from './components/LoginScreen';
import CalendarView from './components/CalendarView';
import { AppTab, GeneratedContent } from './types';
import { generateContent } from './services/geminiService';

const SAVED_STORAGE_KEY = 'dailygrace_saved';
const SCHEDULE_STORAGE_KEY = 'dailygrace_schedule';
const AUTH_STORAGE_KEY = 'dailygrace_auth';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<AppTab>(AppTab.Morning);
  
  // Date Selection for Calendar
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // General live generated items
  const [generatedItems, setGeneratedItems] = useState<Record<string, GeneratedContent | null>>({
    [AppTab.Morning]: null,
    [AppTab.Night]: null,
    [AppTab.Relationships]: null,
  });

  // Scheduled/Planned items for specific dates
  const [scheduledItems, setScheduledItems] = useState<Record<string, GeneratedContent>>({});

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    [AppTab.Morning]: false,
    [AppTab.Night]: false,
    [AppTab.Relationships]: false,
    [AppTab.Calendar]: false,
  });

  const [savedItems, setSavedItems] = useState<GeneratedContent[]>([]);

  // Check for existing session
  useEffect(() => {
    const isAuth = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (isAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Load saved items
  useEffect(() => {
    const saved = localStorage.getItem(SAVED_STORAGE_KEY);
    if (saved) {
      try {
        setSavedItems(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
    
    const schedule = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    if (schedule) {
        try {
            setScheduledItems(JSON.parse(schedule));
        } catch (e) { console.error(e); }
    }
  }, []);

  // Save schedule to local storage whenever it changes
  useEffect(() => {
    if (Object.keys(scheduledItems).length > 0) {
        localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(scheduledItems));
    }
  }, [scheduledItems]);

  const handleGenerate = useCallback(async (tab: AppTab, dateOverride?: Date) => {
    if (tab === AppTab.Saved) return;

    setLoadingStates(prev => ({ ...prev, [tab]: true }));
    try {
      // Use Morning prompt as default for Calendar unless user specifies otherwise (simplified for now)
      const typeForGen = tab === AppTab.Calendar ? AppTab.Morning : tab;
      const newContent = await generateContent(typeForGen);
      
      if (tab === AppTab.Calendar && dateOverride) {
        const dateKey = dateOverride.toISOString().split('T')[0];
        setScheduledItems(prev => ({
            ...prev,
            [dateKey]: { ...newContent, type: AppTab.Calendar, timestamp: dateOverride.getTime() }
        }));
      } else {
        setGeneratedItems(prev => ({ ...prev, [tab]: newContent }));
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong while connecting to the guide. Please try again.");
    } finally {
      setLoadingStates(prev => ({ ...prev, [tab]: false }));
    }
  }, []);

  // Initial fetch on auth
  useEffect(() => {
    if (isAuthenticated && !generatedItems[AppTab.Morning]) {
      handleGenerate(AppTab.Morning);
    }
  }, [isAuthenticated, generatedItems, handleGenerate]);

  const handleLogin = () => {
    sessionStorage.setItem(AUTH_STORAGE_KEY, 'true');
    setIsAuthenticated(true);
  };

  const handleTabChange = (tab: AppTab) => {
    setCurrentTab(tab);
    // If switching to a main content tab that is empty, generate automatically
    if (tab !== AppTab.Saved && tab !== AppTab.Calendar && !generatedItems[tab]) {
      handleGenerate(tab);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    // Stay on calendar tab but maybe scroll or show a modal? 
    // For this UI, the content below the calendar updates to show the selected day's content.
  };

  const toggleSave = (content: GeneratedContent) => {
    setSavedItems(prev => {
      const exists = prev.some(item => item.id === content.id);
      let newItems;
      if (exists) {
        newItems = prev.filter(item => item.id !== content.id);
      } else {
        newItems = [content, ...prev];
      }
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    });
  };

  const deleteSaved = (id: string) => {
    setSavedItems(prev => {
      const newItems = prev.filter(item => item.id !== id);
      localStorage.setItem(SAVED_STORAGE_KEY, JSON.stringify(newItems));
      return newItems;
    });
  };

  const isContentSaved = (content?: GeneratedContent | null) => {
    if (!content) return false;
    return savedItems.some(item => item.id === content.id);
  };

  const renderContent = () => {
    if (currentTab === AppTab.Saved) {
      return (
        <main className="flex-1 overflow-y-auto pb-24 pt-4 px-4 scroll-smooth">
          <SavedList items={savedItems} onDelete={deleteSaved} />
        </main>
      );
    }

    if (currentTab === AppTab.Calendar) {
        const dateKey = selectedDate.toISOString().split('T')[0];
        const contentForDate = scheduledItems[dateKey] || null;
        
        return (
            <div className="flex flex-col h-full animate-fade-in">
                 <header className="px-6 py-4 text-center shrink-0 z-10 bg-gray-50/90 backdrop-blur-sm">
                    <h1 className="text-2xl font-serif font-bold text-gray-900">Monthly Guide</h1>
                </header>
                <main className="flex-1 overflow-y-auto pb-24 px-4">
                    <CalendarView 
                        selectedDate={selectedDate} 
                        onDateSelect={handleDateSelect}
                        scheduledDates={Object.keys(scheduledItems)} 
                    />
                    
                    <div className="mt-8 mb-8 border-t border-gray-100 pt-8">
                        <div className="text-center mb-4">
                             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                                 {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                             </h3>
                        </div>
                        <ContentCard
                            content={contentForDate}
                            isLoading={loadingStates[AppTab.Calendar]}
                            onGenerate={() => handleGenerate(AppTab.Calendar, selectedDate)}
                            onSave={toggleSave}
                            isSaved={isContentSaved(contentForDate)}
                            tab={AppTab.Calendar}
                            date={selectedDate}
                        />
                    </div>
                </main>
            </div>
        )
    }

    const titleMap: Record<string, string> = {
      [AppTab.Morning]: "Prayer for Today",
      [AppTab.Night]: "When You Pray Tonight",
      [AppTab.Relationships]: "Relationship Wisdom"
    };

    const subtitleMap: Record<string, string> = {
        [AppTab.Morning]: "Start your day with grace and strength.",
        [AppTab.Night]: "End your day with peace and reflection.",
        [AppTab.Relationships]: "Nurture your connections with love."
    };

    return (
      <div className="flex flex-col h-full overflow-hidden animate-fade-in">
        <header className="px-6 py-4 text-center shrink-0 z-10 bg-gray-50/90 backdrop-blur-sm">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 mb-1">
                {titleMap[currentTab]}
            </h1>
            <p className="text-xs md:text-sm text-gray-500">
                {subtitleMap[currentTab]}
            </p>
        </header>
        
        <main className="flex-1 overflow-y-auto flex flex-col justify-center px-4 pb-24 scroll-smooth">
            <ContentCard
              content={generatedItems[currentTab]}
              isLoading={loadingStates[currentTab]}
              onGenerate={() => handleGenerate(currentTab)}
              onSave={toggleSave}
              isSaved={isContentSaved(generatedItems[currentTab])}
              tab={currentTab}
            />
        </main>
      </div>
    );
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    // h-full fits exactly in the mobile viewport (including/excluding address bar dynamically) because body is fixed inset-0
    <div className="h-full w-full bg-gray-50 flex flex-col overflow-hidden pt-safe">
      {renderContent()}
      <Navigation currentTab={currentTab} onTabChange={handleTabChange} />
    </div>
  );
};

export default App;