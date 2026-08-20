import React from 'react';
import { Mail, MessageSquare, PhoneCall, Bell, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { NotificationStatusBadge } from './NotificationStatusBadge';

export const NotificationTable = ({
  notifications,
  pagination,
  loading,
  onPageChange,
  onViewDetails,
}) => {
  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'EMAIL':
        return <Mail className="w-4 h-4 text-indigo-600" />;
      case 'SMS':
        return <MessageSquare className="w-4 h-4 text-emerald-600" />;
      case 'WHATSAPP':
        return <PhoneCall className="w-4 h-4 text-green-600" />;
      case 'PUSH':
        return <Bell className="w-4 h-4 text-purple-600" />;
      default:
        return <Mail className="w-4 h-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-600 border-t-transparent"></div>
        <p className="mt-2 text-sm text-slate-500 font-medium">Loading notification history...</p>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
        <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">No notifications found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No notification requests match your selected filters. Try clearing or adjusting search parameters.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created At</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {notifications.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-100 rounded-lg">{getChannelIcon(item.channel)}</span>
                    <span className="text-xs font-bold text-slate-800">{item.channel}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-indigo-600">
                  {item.template?.name || item.metadata?.templateName || 'Custom'}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-800">{item.recipient}</td>
                <td className="px-4 py-3">
                  <NotificationStatusBadge status={item.status} />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onViewDetails(item.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Page <span className="font-semibold text-slate-800">{pagination.page}</span> of{' '}
            <span className="font-semibold text-slate-800">{pagination.totalPages}</span> ({pagination.total} total items)
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
              className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
