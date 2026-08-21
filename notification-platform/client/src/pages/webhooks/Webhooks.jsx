import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { webhooksApi } from '../../api/webhooks.api';
import {
  Webhook as WebhookIcon,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Activity,
  Power,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const Webhooks = () => {
  const { projectId } = useParams();
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [createdSecret, setCreatedSecret] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [selectedWebhookForLogs, setSelectedWebhookForLogs] = useState(null);

  // Fetch webhooks list
  const { data: webhooksData, isLoading } = useQuery({
    queryKey: ['webhooks', projectId],
    queryFn: () => webhooksApi.listWebhooks(projectId),
    enabled: !!projectId,
  });

  const webhooks = webhooksData?.data?.webhooks || [];

  // Create Webhook Mutation
  const createMutation = useMutation({
    mutationFn: (url) => webhooksApi.createWebhook(projectId, { url }),
    onSuccess: (res) => {
      queryClient.invalidateQueries(['webhooks', projectId]);
      const created = res.data.webhook;
      setCreatedSecret(created.secret);
      toast.success('Webhook created successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create webhook');
    },
  });

  // Update Webhook Mutation
  const updateMutation = useMutation({
    mutationFn: ({ webhookId, active }) =>
      webhooksApi.updateWebhook(projectId, webhookId, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks', projectId]);
      toast.success('Webhook status updated!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update webhook');
    },
  });

  // Delete Webhook Mutation
  const deleteMutation = useMutation({
    mutationFn: (webhookId) => webhooksApi.deleteWebhook(projectId, webhookId),
    onSuccess: () => {
      queryClient.invalidateQueries(['webhooks', projectId]);
      toast.success('Webhook deleted');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete webhook');
    },
  });

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newWebhookUrl.trim()) return;
    createMutation.mutate(newWebhookUrl.trim());
  };

  const handleCopySecret = () => {
    if (createdSecret) {
      navigator.clipboard.writeText(createdSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewWebhookUrl('');
    setCreatedSecret(null);
    setCopiedSecret(false);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <WebhookIcon className="w-7 h-7 text-indigo-600" />
            Outbound Webhooks
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure HTTP endpoints to receive real-time delivery event notifications from your platform.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Webhook Endpoint
        </button>
      </div>

      {/* Webhooks Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm">Loading webhooks...</div>
        ) : webhooks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <WebhookIcon className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No Webhook Endpoints Configured</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Add your application's HTTPS endpoint to start receiving real-time webhook event callbacks.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Endpoint URL</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-sm">
                {webhooks.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-4 font-mono font-medium text-slate-900 truncate max-w-md">
                      {wh.url}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                          wh.active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {wh.active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {wh.active ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-xs">
                      {new Date(wh.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedWebhookForLogs(wh)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="View Delivery Logs"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        Logs
                      </button>
                      <button
                        onClick={() => updateMutation.mutate({ webhookId: wh.id, active: !wh.active })}
                        className={`p-1.5 rounded-lg transition-colors ${
                          wh.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={wh.active ? 'Disable Webhook' : 'Enable Webhook'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this webhook endpoint?')) {
                            deleteMutation.mutate(wh.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Webhook Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-6">
            {!createdSecret ? (
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900">Add Webhook Endpoint</h3>
                <p className="text-xs text-slate-500">
                  Enter the HTTPS URL of your application endpoint to receive signed JSON event notifications.
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payload URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/api/webhooks"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : 'Create Endpoint'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">Save Your Webhook Secret</h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      This secret is used to verify HMAC SHA-256 signatures (`X-Notification-Signature`). It will not be shown again.
                    </p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Webhook Secret Key</label>
                  <div className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl font-mono text-xs text-slate-900 border border-slate-200 break-all">
                    <span className="flex-1">{createdSecret}</span>
                    <button
                      onClick={handleCopySecret}
                      className="p-1.5 bg-white text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 shadow-2xs transition-colors shrink-0"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delivery Logs Drawer Modal */}
      {selectedWebhookForLogs && (
        <WebhookDeliveryLogsModal
          projectId={projectId}
          webhook={selectedWebhookForLogs}
          onClose={() => setSelectedWebhookForLogs(null)}
        />
      )}
    </div>
  );
};

const WebhookDeliveryLogsModal = ({ projectId, webhook, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['webhookDeliveries', projectId, webhook.id],
    queryFn: () => webhooksApi.listWebhookDeliveries(projectId, webhook.id, { page: 1, limit: 20 }),
  });

  const deliveries = data?.data?.deliveries || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-slate-200 space-y-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Webhook Delivery Logs</h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{webhook.url}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading delivery logs...</div>
          ) : deliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 italic">No delivery logs recorded for this endpoint.</div>
          ) : (
            deliveries.map((del) => (
              <div key={del.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="font-mono text-indigo-600">{del.eventType}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      del.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {del.status} ({del.responseStatus || 'N/A'})
                  </span>
                </div>
                <div className="flex justify-between text-slate-500 text-[11px]">
                  <span>Attempts: {del.attemptCount}</span>
                  <span>{new Date(del.createdAt).toLocaleString()}</span>
                </div>
                {del.responseBody && (
                  <div className="p-2 bg-white border border-slate-200 rounded font-mono text-[11px] text-slate-700 truncate">
                    {del.responseBody}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
