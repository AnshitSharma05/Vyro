import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  LayoutDashboard, 
  FileText, 
  Send, 
  Key, 
  BookOpen, 
  RefreshCw, 
  ChevronDown, 
  Server, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Layers,
  Sparkles,
  User
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { authService } from './services/auth.service';
import OverviewTab from './components/overview/OverviewTab';
import TemplateList from './components/templates/TemplateList';
import NotificationLogTable from './components/notifications/NotificationLogTable';
import ApiKeyManager from './components/apikeys/ApiKeyManager';
import ApiDocs from './components/docs/ApiDocs';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [session, setSession] = useState({
    user: null,
    organizations: [],
    currentOrg: null,
    projects: [],
    currentProject: null,
  });
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Health status
  const [healthStatus, setHealthStatus] = useState({ live: false, ready: false });
  const [isPingingHealth, setIsPingingHealth] = useState(false);

  // Template selected for test send
  const [selectedTemplateForTest, setSelectedTemplateForTest] = useState(null);

  // Active API Key prefix
  const [activeApiKey, setActiveApiKey] = useState('np_dev_dev_secret_key_1234567890');

  // Initialize session & project
  const initApp = async () => {
    setIsInitializing(true);
    try {
      const sess = await authService.ensureSession();
      setSession(sess);
    } catch (err) {
      console.error('Session init error:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  // Check health ping
  const checkHealth = async () => {
    setIsPingingHealth(true);
    try {
      const res = await fetch('/api/v1/health/ready');
      if (res.ok) {
        setHealthStatus({ live: true, ready: true });
      } else {
        const liveRes = await fetch('/api/v1/health');
        setHealthStatus({ live: liveRes.ok, ready: false });
      }
    } catch {
      setHealthStatus({ live: false, ready: false });
    } finally {
      setIsPingingHealth(false);
    }
  };

  useEffect(() => {
    initApp();
    checkHealth();
    const interval = setInterval(checkHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectTemplateForTest = (tpl) => {
    setSelectedTemplateForTest(tpl);
    setActiveTab('overview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success(`Loaded "${tpl.name}" into Live Dispatcher`);
  };

  const currentProjectId = session.currentProject?.id;

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center text-zinc-400">
        <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Bell className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-zinc-300" />
          <span>Connecting to Vyro Cloud API...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-800 selection:text-white">
      
      {/* Top Navbar */}
      <header className="border-b border-[#27272a] bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Logo & Project Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white text-black flex items-center justify-center shadow-sm">
                <Bell className="w-4 h-4 fill-black" />
              </div>
              <span className="font-semibold text-sm tracking-tight text-white">Vyro</span>
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block"></div>

            {/* Organization / Project Pill */}
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-xs font-medium text-zinc-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>{session.currentProject?.name || 'Main E-Commerce App'}</span>
                <span className="text-[10px] font-mono text-zinc-500 uppercase bg-zinc-800 px-1.5 py-0.5 rounded">
                  {session.currentOrg?.slug || 'acme-corp'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Status & User */}
          <div className="flex items-center gap-3">
            {/* System Health Status */}
            <div 
              onClick={checkHealth}
              className="flex items-center gap-2 text-xs bg-zinc-900/60 hover:bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800 cursor-pointer transition-colors"
              title="Click to refresh health check"
            >
              <span className={`w-2 h-2 rounded-full ${healthStatus.ready ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                {healthStatus.ready ? 'Workers & API Online' : 'API Standby'}
              </span>
              <RefreshCw className={`w-3 h-3 text-zinc-500 ${isPingingHealth ? 'animate-spin' : ''}`} />
            </div>

            {/* User Avatar */}
            <div className="flex items-center gap-2 text-xs text-zinc-400 pl-2 border-l border-zinc-800">
              <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 font-semibold text-xs">
                {session.user?.name ? session.user.name.charAt(0).toUpperCase() : 'D'}
              </div>
              <span className="text-zinc-300 font-medium text-xs hidden md:inline">
                {session.user?.name || 'Developer'}
              </span>
            </div>
          </div>

        </div>

        {/* Subnavigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'templates', label: 'Templates', icon: FileText },
            { id: 'notifications', label: 'Notification Logs', icon: Send },
            { id: 'apikeys', label: 'API Keys', icon: Key },
            { id: 'docs', label: 'API Docs', icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Page Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {activeTab === 'overview' && (
          <OverviewTab
            projectId={currentProjectId}
            activeApiKey={activeApiKey}
            onNavigateToTemplates={() => setActiveTab('templates')}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateList
            projectId={currentProjectId}
            onSelectTemplateForTest={handleSelectTemplateForTest}
          />
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Notification History & Audit Log</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Inspect every dispatched notification, delivery attempt status, and failure payload.
              </p>
            </div>
            <NotificationLogTable projectId={currentProjectId} />
          </div>
        )}

        {activeTab === 'apikeys' && (
          <ApiKeyManager
            projectId={currentProjectId}
            onKeyCreated={(k) => {
              if (k.rawKey) setActiveApiKey(k.rawKey);
            }}
          />
        )}

        {activeTab === 'docs' && (
          <ApiDocs
            activeApiKey={activeApiKey}
            activeProject={session.currentProject}
          />
        )}
      </main>

      {/* Minimal Clerk-Style Footer */}
      <footer className="border-t border-zinc-900 bg-[#09090b] py-6 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-300">Vyro</span>
            <span>—</span>
            <span>Production Notification-as-a-Service Cloud</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-zinc-400">
            <span>v1.0.0</span>
            <span>•</span>
            <span>PostgreSQL & BullMQ</span>
            <span>•</span>
            <span className="text-emerald-400">Status: Operational</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
