import React, { useState, useEffect } from 'react';
import { Key, Plus, Trash2, Copy, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { listApiKeys, createApiKey, revokeApiKey } from '../../api/api-keys.api';

export default function ApiKeyManagement({ projectId }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [creating, setCreating] = useState(false);

  // Transient state for raw key display ONCE
  const [newlyCreatedRawKey, setNewlyCreatedRawKey] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchApiKeys();
    }
  }, [projectId]);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listApiKeys(projectId);
      setApiKeys(res.data.apiKeys || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return;

    try {
      setCreating(true);
      const res = await createApiKey(projectId, { name: keyName.trim() });
      const createdData = res.data;

      // Transiently store raw key ONLY in memory for single modal display
      setNewlyCreatedRawKey(createdData.key);
      setKeyName('');
      fetchApiKeys();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    // Explicitly purge raw key memory state upon modal close
    setNewlyCreatedRawKey(null);
    setCopied(false);
  };

  const handleRevokeKey = async (apiKeyId, name) => {
    if (!window.confirm(`Are you sure you want to revoke API Key "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await revokeApiKey(projectId, apiKeyId);
      fetchApiKeys();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to revoke API key');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 rounded-xl shadow-xl border border-slate-800">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            API Keys
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Machine-to-machine authentication credentials for integrating client applications.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-md"
        >
          <Plus className="w-4 h-4" />
          Create API Key
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Loading API keys...</div>
      ) : error ? (
        <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-lg">
          {error}
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-lg">
          <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No API keys created yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Create an API key to allow your backend services to trigger notifications.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Key Prefix</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Last Used</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {apiKeys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-200">{key.name}</td>
                  <td className="py-3 px-4 font-mono text-slate-400">{key.keyPrefix}...</td>
                  <td className="py-3 px-4 text-slate-400">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    {key.revokedAt ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-950 text-red-400 border border-red-800">
                        Revoked
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {!key.revokedAt && (
                      <button
                        onClick={() => handleRevokeKey(key.id, key.name)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Revoke Key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE API KEY MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {!newlyCreatedRawKey ? (
              <form onSubmit={handleCreateKey}>
                <h3 className="text-lg font-bold mb-2">Create New API Key</h3>
                <p className="text-sm text-slate-400 mb-4">
                  API keys allow machine-to-machine integration. Choose a descriptive name for your application.
                </p>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-2">
                    Key Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Production Backend Service"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseCreateModal}
                    className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"
                  >
                    {creating ? 'Generating...' : 'Generate API Key'}
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex items-center gap-2 text-amber-400 font-bold mb-2">
                  <AlertTriangle className="w-5 h-5" />
                  Save Your API Key
                </div>
                <p className="text-sm text-slate-300 mb-4">
                  Please copy your API key now. <strong className="text-amber-300">You will not be able to see it again!</strong>
                </p>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2 mb-6">
                  <code className="text-xs font-mono text-indigo-300 break-all">{newlyCreatedRawKey}</code>
                  <button
                    onClick={() => copyToClipboard(newlyCreatedRawKey)}
                    className="p-2 text-slate-400 hover:text-white transition-colors"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseCreateModal}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
