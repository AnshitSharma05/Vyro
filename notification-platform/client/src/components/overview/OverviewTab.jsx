import React, { useState, useEffect } from 'react';
import { 
  Send, 
  CheckCircle2, 
  FileText, 
  Key, 
  TrendingUp, 
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import LiveDispatcher from '../notifications/LiveDispatcher';
import NotificationLogTable from '../notifications/NotificationLogTable';
import { notificationsService } from '../../services/notifications.service';
import { templatesService } from '../../services/templates.service';
import { apiKeysService } from '../../services/apikeys.service';

export default function OverviewTab({ projectId, activeApiKey, onNavigateToTemplates }) {
  const [stats, setStats] = useState({
    totalDispatches: 0,
    deliveredCount: 0,
    deliveryRate: '100%',
    templateCount: 0,
    keyCount: 0,
  });
  const [refreshCount, setRefreshCount] = useState(0);

  const fetchOverviewData = async () => {
    if (!projectId) return;
    try {
      const [notifsRes, tplsRes, keysRes] = await Promise.allSettled([
        notificationsService.listDashboard(projectId, { limit: 100 }),
        templatesService.list(projectId),
        apiKeysService.list(projectId),
      ]);

      const notifs = notifsRes.status === 'fulfilled' ? notifsRes.value.notifications || [] : [];
      const totalNotifs = notifsRes.status === 'fulfilled' ? notifsRes.value.totalCount || notifs.length : 0;
      const templates = tplsRes.status === 'fulfilled' ? tplsRes.value.templates || [] : [];
      const keys = keysRes.status === 'fulfilled' ? keysRes.value.apiKeys || [] : [];

      const successful = notifs.filter((n) => n.status === 'SENT' || n.status === 'DELIVERED').length;
      const rate = totalNotifs > 0 ? ((successful / notifs.length) * 100).toFixed(1) : '100';

      setStats({
        totalDispatches: totalNotifs,
        deliveredCount: successful,
        deliveryRate: `${rate}%`,
        templateCount: templates.length,
        keyCount: keys.filter((k) => !k.revokedAt).length,
      });
    } catch (err) {
      console.error('Error fetching overview metrics:', err);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, [projectId, refreshCount]);

  const handleDispatched = () => {
    setRefreshCount((c) => c + 1);
  };

  return (
    <div className="space-y-6">
      
      {/* 4 Key Metric Cards (Computed dynamically from real database records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Dispatches */}
        <div className="clerk-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Dispatches
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-zinc-300" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {stats.totalDispatches.toLocaleString()}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 inline-flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Live across all channels
            </span>
          </div>
        </div>

        {/* Delivery Success Rate */}
        <div className="clerk-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Delivery Success
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {stats.deliveryRate}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 inline-block">
              {stats.deliveredCount} successful deliveries
            </span>
          </div>
        </div>

        {/* Active Templates */}
        <div 
          onClick={onNavigateToTemplates}
          className="clerk-card-hover flex flex-col justify-between cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Active Templates
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-zinc-300" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {stats.templateCount}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 inline-flex items-center gap-1 hover:text-white transition-colors">
              Manage layouts <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Active API Keys */}
        <div className="clerk-card flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Active Keys
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Key className="w-3.5 h-3.5 text-zinc-300" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tracking-tight font-mono">
              {stats.keyCount}
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 inline-block">
              SHA-256 Hashed Secrets
            </span>
          </div>
        </div>

      </div>

      {/* Live Dispatcher Widget */}
      <LiveDispatcher
        projectId={projectId}
        activeApiKey={activeApiKey}
        onDispatched={handleDispatched}
      />

      {/* Recent Activity Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Recent Dispatches
            </h3>
            <p className="text-xs text-zinc-400">
              Live audit logs from the PostgreSQL persistent database.
            </p>
          </div>
        </div>

        <NotificationLogTable
          projectId={projectId}
          onRefreshTrigger={refreshCount}
        />
      </div>

    </div>
  );
}
