import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

export const NotificationFilters = ({ filters, onFilterChange, onReset }) => {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
        {/* Recipient Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search recipient..."
            value={filters.recipient || ''}
            onChange={(e) => onFilterChange('recipient', e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="SENT">SENT</option>
          <option value="FAILED">FAILED</option>
          <option value="RETRYING">RETRYING</option>
          <option value="PROCESSING">PROCESSING</option>
          <option value="PENDING">PENDING</option>
        </select>

        {/* Channel Filter */}
        <select
          value={filters.channel || ''}
          onChange={(e) => onFilterChange('channel', e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Channels</option>
          <option value="EMAIL">EMAIL</option>
          <option value="SMS">SMS</option>
          <option value="WHATSAPP">WHATSAPP</option>
          <option value="PUSH">PUSH</option>
        </select>
      </div>

      {/* Reset Filters */}
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>
    </div>
  );
};
