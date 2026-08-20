import React from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export const NotificationStatusBadge = ({ status }) => {
  switch (status) {
    case 'SENT':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          SENT
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5" />
          FAILED
        </span>
      );
    case 'RETRYING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200 animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          RETRYING
        </span>
      );
    case 'PROCESSING':
    case 'SENDING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          PROCESSING
        </span>
      );
    case 'CANCELLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300">
          <AlertCircle className="w-3.5 h-3.5" />
          CANCELLED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-200">
          <Clock className="w-3.5 h-3.5" />
          {status || 'PENDING'}
        </span>
      );
  }
};
