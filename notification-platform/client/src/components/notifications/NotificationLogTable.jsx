import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Filter, 
  X, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Bell, 
  ExternalLink,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsService } from '../../services/notifications.service';

export default function NotificationLogTable({ projectId, onRefreshTrigger }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Inspection Drawer
  const [inspectedNotif, setInspectedNotif] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadNotifications = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await notificationsService.listDashboard(projectId, {
        channel: selectedChannel,
        status: selectedStatus,
        limit: 50,
      });
      setNotifications(data.notifications || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch notification logs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [projectId, selectedChannel, selectedStatus, onRefreshTrigger]);

  const filteredNotifications = notifications.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      item.id?.toLowerCase().includes(q) ||
      item.recipient?.toLowerCase().includes(q) ||
      (item.template?.name && item.template.name.toLowerCase().includes(q))
    );
  });

  const handleCancelNotification = async (notificationId) => {
    setIsCancelling(true);
    try {
      await notificationsService.cancel(projectId, notificationId);
      toast.success('Notification cancelled successfully');
      setInspectedNotif(null);
      loadNotifications();
    } catch (err) {
      toast.error(err.message || 'Failed to cancel notification');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SENT':
      case 'DELIVERED':
        return (
          <span className="badge bg-emerald-950/40 text-emerald-400 border-emerald-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {status}
          </span>
        );
      case 'PENDING':
      case 'PROCESSING':
      case 'SCHEDULED':
        return (
          <span className="badge bg-amber-950/40 text-amber-400 border-amber-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            {status}
          </span>
        );
      case 'FAILED':
      case 'BOUNCED':
      case 'COMPLAINED':
      case 'SUPPRESSED':
        return (
          <span className="badge bg-red-950/40 text-red-400 border-red-900/50">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            {status}
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="badge bg-zinc-900 text-zinc-400 border-zinc-800">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500"></span>
            {status}
          </span>
        );
      default:
        return (
          <span className="badge bg-zinc-900 text-zinc-400 border-zinc-800">
            {status}
          </span>
        );
    }
  };

  const getChannelIcon = (ch) => {
    switch (ch) {
      case 'EMAIL': return <Mail className="w-3.5 h-3.5 text-zinc-300" />;
      case 'SMS': return <Smartphone className="w-3.5 h-3.5 text-zinc-300" />;
      case 'WHATSAPP': return <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />;
      case 'PUSH': return <Bell className="w-3.5 h-3.5 text-zinc-300" />;
      default: return <Send className="w-3.5 h-3.5 text-zinc-300" />;
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#121215] p-2.5 rounded-xl border border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Channel Filter */}
          <div className="flex items-center gap-1 bg-[#0a0a0d] p-1 rounded-lg border border-zinc-800 text-xs">
            {['ALL', 'EMAIL', 'SMS', 'WHATSAPP', 'PUSH'].map((ch) => (
              <button
                key={ch}
                onClick={() => setSelectedChannel(ch)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedChannel === ch ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#0a0a0d] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="SENT">SENT</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="PENDING">PENDING</option>
            <option value="PROCESSING">PROCESSING</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search recipient or ID..."
              className="w-full bg-[#0a0a0d] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
            />
          </div>

          <button
            onClick={loadNotifications}
            className="p-2 text-zinc-400 hover:text-white bg-[#0a0a0d] border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="clerk-panel">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-[#121215] text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="px-4 py-3">Notification ID</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Template / Action</th>
                <th className="px-4 py-3">Recipient</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Loading notification logs...
                  </td>
                </tr>
              ) : filteredNotifications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-zinc-400 font-medium">No notification dispatches found</div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {searchQuery || selectedChannel !== 'ALL' || selectedStatus !== 'ALL'
                        ? 'Try clearing the search query or status filter.'
                        : 'Send your first notification using the tester above or via the API.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredNotifications.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setInspectedNotif(item)}
                    className="hover:bg-zinc-900/40 cursor-pointer transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-zinc-400 group-hover:text-white transition-colors">
                      {item.id.length > 18 ? `${item.id.substring(0, 18)}...` : item.id}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {getChannelIcon(item.channel)}
                        <span className="font-medium text-zinc-200">{item.channel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {item.template?.name || item.templateName || 'custom-payload'}
                    </td>
                    <td className="px-4 py-3 text-zinc-300">
                      {item.recipient}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-[11px]">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 inline transition-colors" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Slide-Over / Modal */}
      {inspectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#121215] border-l border-zinc-800 w-full max-w-lg h-full p-6 flex flex-col justify-between overflow-y-auto shadow-2xl animate-slideLeft">
            
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                    Dispatch Inspection
                  </span>
                  <h3 className="text-sm font-mono font-semibold text-white mt-0.5">
                    {inspectedNotif.id}
                  </h3>
                </div>
                <button
                  onClick={() => setInspectedNotif(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Section */}
              <div className="bg-[#0a0a0d] p-4 rounded-xl border border-zinc-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 block mb-1">Current State</span>
                  <div>{getStatusBadge(inspectedNotif.status)}</div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-zinc-400 block mb-1">Channel</span>
                  <span className="text-xs font-mono font-semibold text-white">
                    {inspectedNotif.channel}
                  </span>
                </div>
              </div>

              {/* Attributes Grid */}
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Recipient</span>
                  <span className="font-mono text-zinc-200">{inspectedNotif.recipient}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Template Identifier</span>
                  <span className="font-mono text-zinc-200">
                    {inspectedNotif.template?.name || inspectedNotif.templateName || 'N/A'}
                  </span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Category</span>
                  <span className="text-zinc-200">{inspectedNotif.category || 'TRANSACTIONAL'}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                  <span className="text-zinc-500">Created At</span>
                  <span className="text-zinc-300">
                    {new Date(inspectedNotif.createdAt).toLocaleString()}
                  </span>
                </div>

                {inspectedNotif.sentAt && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                    <span className="text-zinc-500">Sent At</span>
                    <span className="text-emerald-400 font-mono">
                      {new Date(inspectedNotif.sentAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {inspectedNotif.failedAt && (
                  <div className="flex justify-between py-1.5 border-b border-zinc-800/50">
                    <span className="text-zinc-500">Failed At</span>
                    <span className="text-red-400 font-mono">
                      {new Date(inspectedNotif.failedAt).toLocaleString()}
                    </span>
                  </div>
                )}

                {inspectedNotif.suppressionReason && (
                  <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg text-xs text-red-300">
                    <ShieldAlert className="w-4 h-4 text-red-400 inline mr-1.5" />
                    <strong>Suppression: </strong> {inspectedNotif.suppressionReason}
                  </div>
                )}
              </div>

              {/* Delivery Attempts List if available */}
              {inspectedNotif.attempts && inspectedNotif.attempts.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-zinc-300">Delivery Attempts</span>
                  <div className="space-y-2">
                    {inspectedNotif.attempts.map((att, idx) => (
                      <div key={idx} className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg text-xs">
                        <div className="flex items-center justify-between font-mono text-[11px] text-zinc-400 mb-1">
                          <span>Attempt #{att.attemptNumber || idx + 1} ({att.provider})</span>
                          <span className={att.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}>
                            {att.status}
                          </span>
                        </div>
                        {att.errorMessage && (
                          <div className="text-red-400 text-[11px] font-mono mt-1">
                            {att.errorMessage}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata JSON */}
              {inspectedNotif.metadata && (
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-zinc-300">Payload Metadata</span>
                  <pre className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg text-[11px] font-mono text-zinc-300 overflow-x-auto max-h-40">
                    {JSON.stringify(inspectedNotif.metadata, null, 2)}
                  </pre>
                </div>
              )}

            </div>

            {/* Drawer Footer Actions */}
            <div className="pt-6 border-t border-zinc-800 flex items-center justify-between">
              {(inspectedNotif.status === 'PENDING' || inspectedNotif.status === 'SCHEDULED') ? (
                <button
                  type="button"
                  disabled={isCancelling}
                  onClick={() => handleCancelNotification(inspectedNotif.id)}
                  className="btn-danger w-full"
                >
                  {isCancelling ? 'Cancelling...' : 'Cancel Dispatch'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setInspectedNotif(null)}
                  className="btn-secondary w-full"
                >
                  Close Inspection
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
