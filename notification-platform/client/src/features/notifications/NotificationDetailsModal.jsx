import React from 'react';
import { X, Mail, MessageSquare, PhoneCall, Bell, Clock, Server, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { NotificationStatusBadge } from './NotificationStatusBadge';

export const NotificationDetailsModal = ({ notification, isOpen, onClose }) => {
  if (!isOpen || !notification) return null;

  const metadata = notification.metadata || {};
  const attempts = notification.attempts || [];

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-xs">
              {getChannelIcon(notification.channel)}
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Notification Details</h3>
              <p className="text-xs text-slate-500 font-mono">ID: {notification.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status & Overview Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200/60">
            <div>
              <p className="text-xs text-slate-500 font-medium">Status</p>
              <div className="mt-1">
                <NotificationStatusBadge status={notification.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Channel</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{notification.channel}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Recipient</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{notification.recipient}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Template</p>
              <p className="mt-1 text-sm font-semibold text-indigo-600">
                {notification.template?.name || metadata.templateName || 'Custom'}
              </p>
            </div>
          </div>

          {/* Rendered Subject & Body Snapshot */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-500" />
              Rendered Content Snapshot
            </h4>
            <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-xs space-y-3 shadow-inner">
              {metadata.subject && (
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Subject:</span>
                  <p className="text-emerald-400 font-semibold">{metadata.subject}</p>
                </div>
              )}
              <div>
                <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Body:</span>
                <p className="whitespace-pre-wrap text-slate-200 leading-relaxed">{metadata.body || 'No content snapshot available'}</p>
              </div>
            </div>
          </div>

          {/* Delivery Attempts Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-slate-500" />
              Delivery Attempts Timeline ({attempts.length})
            </h4>

            {attempts.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-50 rounded-lg">No delivery attempts recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt, index) => (
                  <div
                    key={attempt.id || index}
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Attempt #{attempt.attemptNumber || index + 1}</span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700 font-mono">
                          {attempt.provider}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          attempt.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {attempt.status}
                      </span>
                    </div>

                    {attempt.errorMessage && (
                      <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-700 font-mono flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">{attempt.errorCode || 'PROVIDER_ERROR'}:</p>
                          <p>{attempt.errorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-100">
                      <span>Attempted: {new Date(attempt.attemptedAt).toLocaleString()}</span>
                      {attempt.deliveredAt && <span>Delivered: {new Date(attempt.deliveredAt).toLocaleString()}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
