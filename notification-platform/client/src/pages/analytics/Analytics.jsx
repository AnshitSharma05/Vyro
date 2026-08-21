import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { analyticsApi } from '../../api/analytics.api';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Zap,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

export const Analytics = () => {
  const { projectId } = useParams();
  const [range, setRange] = useState('7d');

  // Fetch overview analytics data
  const { data: overviewData, isLoading: isOverviewLoading } = useQuery({
    queryKey: ['analyticsOverview', projectId, range],
    queryFn: () => analyticsApi.getOverview(projectId, { range }),
    enabled: !!projectId,
  });

  // Fetch channel breakdown data
  const { data: channelsData, isLoading: isChannelsLoading } = useQuery({
    queryKey: ['analyticsChannels', projectId, range],
    queryFn: () => analyticsApi.getChannels(projectId, { range }),
    enabled: !!projectId,
  });

  const summary = overviewData?.data?.summary || {
    totalNotifications: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    bounced: 0,
    deliveryRate: 0,
    failureRate: 0,
    averageDeliveryLatencyMs: 0,
  };

  const timeline = overviewData?.data?.timeline || [];
  const channels = channelsData?.data?.channels || {};

  const channelChartData = Object.entries(channels).map(([name, val]) => ({
    channel: name,
    total: val.total || 0,
    delivered: val.delivered || 0,
  }));

  const CHANNEL_COLORS = {
    EMAIL: '#6366f1', // Indigo
    SMS: '#10b981', // Emerald
    WHATSAPP: '#25d366', // Green
    PUSH: '#f59e0b', // Amber
  };

  const rangeOptions = [
    { label: 'Today', value: 'today' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: 'This Month', value: 'this_month' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Top Header & Range Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-indigo-600" />
            Analytics & Metrics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time delivery performance metrics, volume trends, and channel usage analytics.
          </p>
        </div>

        {/* Range Selector Pills */}
        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 shrink-0">
          {rangeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                range === opt.value
                  ? 'bg-white text-indigo-600 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Send className="w-5 h-5 text-indigo-600" />}
          label="Total Volume"
          value={summary.totalNotifications.toLocaleString()}
          subtext={`${summary.sent.toLocaleString()} sent to provider`}
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          label="Delivery Rate"
          value={`${summary.deliveryRate}%`}
          subtext={`${summary.delivered.toLocaleString()} confirmed delivered`}
          trend={`${summary.delivered} msgs`}
        />
        <StatCard
          icon={<XCircle className="w-5 h-5 text-rose-600" />}
          label="Failure Rate"
          value={`${summary.failureRate}%`}
          subtext={`${summary.failed.toLocaleString()} failed, ${summary.bounced.toLocaleString()} bounced`}
        />
        <StatCard
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          label="Avg Latency"
          value={
            summary.averageDeliveryLatencyMs > 0
              ? `${summary.averageDeliveryLatencyMs} ms`
              : 'N/A'
          }
          subtext="Creation to provider acceptance"
        />
      </div>

      {/* Main Volume Chart Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600" />
              Notification Volume Over Time
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daily trend breakdown of total, delivered, and failed notifications.
            </p>
          </div>
        </div>

        <div className="h-72 w-full pt-4">
          {isOverviewLoading ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Loading timeline data...
            </div>
          ) : timeline.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
              No volume data for this timeframe.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total Ingested" />
                <Area type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorDelivered)" name="Delivered" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Channel Distribution Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Channel Breakdown
          </h3>
          <p className="text-xs text-slate-500">Distribution of notifications across active communication channels.</p>

          <div className="h-60 w-full pt-2">
            {isChannelsLoading ? (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                Loading channels...
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="channel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]} name="Total Volume">
                    {channelChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.channel] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Channel Details Table */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Channel Performance Summary
          </h3>
          <div className="divide-y divide-slate-100 text-sm">
            {Object.entries(channels).map(([ch, data]) => (
              <div key={ch} className="py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHANNEL_COLORS[ch] || '#6366f1' }}
                  />
                  <div>
                    <p className="font-semibold text-slate-900">{ch}</p>
                    <p className="text-xs text-slate-500">{data.delivered || 0} delivered</p>
                  </div>
                </div>
                <div className="text-right font-mono font-medium text-slate-900">
                  {data.total || 0} Total
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subtext }) => (
  <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
    </div>
    <div className="text-2xl font-extrabold text-slate-900">{value}</div>
    <p className="text-xs text-slate-500 truncate">{subtext}</p>
  </div>
);
