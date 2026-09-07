import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Check, 
  ShieldAlert, 
  Trash2, 
  RefreshCw, 
  Lock, 
  AlertTriangle,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiKeysService } from '../../services/apikeys.service';

export default function ApiKeyManager({ projectId, onKeyCreated }) {
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal for new key
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Newly generated raw key reveal modal
  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Revoke state
  const [keyToRevoke, setKeyToRevoke] = useState(null);
  const [isRevoking, setIsRevoking] = useState(false);

  const loadKeys = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await apiKeysService.list(projectId);
      setApiKeys(data.apiKeys || []);
    } catch (err) {
      toast.error(err.message || 'Failed to load API keys');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, [projectId]);

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) {
      toast.error('Key description name is required');
      return;
    }

    setIsCreating(true);
    try {
      const created = await apiKeysService.create(projectId, {
        name: keyName.trim(),
        scopes: ['notifications:write', 'notifications:read', 'templates:read'],
      });

      setNewlyGeneratedKey(created);
      setIsCreateModalOpen(false);
      setKeyName('');
      loadKeys();
      if (onKeyCreated) onKeyCreated(created);
      toast.success('API Key generated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!keyToRevoke) return;
    setIsRevoking(true);
    try {
      await apiKeysService.revoke(projectId, keyToRevoke.id);
      toast.success(`Key "${keyToRevoke.name}" revoked`);
      setKeyToRevoke(null);
      loadKeys();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">API Keys & Machine Access</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Authenticate your backend servers and services with SHA-256 hashed API tokens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadKeys}
            className="p-2 text-zinc-400 hover:text-white bg-[#121215] border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            title="Refresh keys"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Generate New Key</span>
          </button>
        </div>
      </div>

      {/* Keys List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <div key={n} className="clerk-card animate-pulse h-20"></div>
          ))}
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="clerk-card py-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
            <Key className="w-5 h-5 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">No active API keys</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
            Generate your first secret key to start dispatching notifications via cURL or SDKs.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Secret Key</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {apiKeys.map((key) => {
            const isRevoked = Boolean(key.revokedAt);
            return (
              <div
                key={key.id}
                className="clerk-card flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white">{key.name}</h4>
                    {isRevoked ? (
                      <span className="badge bg-red-950/40 text-red-400 border-red-900/50 text-[10px]">
                        REVOKED
                      </span>
                    ) : (
                      <span className="badge bg-emerald-950/40 text-emerald-400 border-emerald-900/50 text-[10px]">
                        ACTIVE
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-zinc-400">
                    <span className="font-mono bg-[#0a0a0d] border border-zinc-800 px-2 py-0.5 rounded text-zinc-300">
                      {key.keyPrefix}...••••••••••••
                    </span>
                    <span>
                      Created {new Date(key.createdAt).toLocaleDateString()}
                    </span>
                    {key.lastUsedAt && (
                      <span className="text-zinc-500">
                        Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {!isRevoked && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setKeyToRevoke(key)}
                      className="btn-danger text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generate API Key Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="clerk-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-zinc-300" />
                Generate New Secret API Key
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Key Identifier / Name
                </label>
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production Backend, Ingestion Worker"
                  className="input-base text-xs"
                />
              </div>

              <div className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg text-xs text-zinc-400">
                <p className="leading-relaxed">
                  Keys are granted default permissions to dispatch notifications and read template metadata.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn-primary"
                >
                  {isCreating ? 'Generating...' : 'Create Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reveal Raw Key Once Modal */}
      {newlyGeneratedKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="clerk-card max-w-lg w-full p-6 space-y-4 shadow-2xl border-emerald-900/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-950/60 border border-emerald-900/80 flex items-center justify-center text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Save Your API Key</h3>
                <p className="text-xs text-zinc-400">
                  This raw secret key is only shown once for security reasons.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg space-y-2">
              <span className="text-[11px] text-zinc-500 font-medium uppercase tracking-wider">
                API Secret Key
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-emerald-400 break-all select-all font-semibold">
                  {newlyGeneratedKey.rawKey || newlyGeneratedKey.apiKey || `${newlyGeneratedKey.keyPrefix || 'np_live_'}${newlyGeneratedKey.id}`}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      newlyGeneratedKey.rawKey || newlyGeneratedKey.apiKey || `${newlyGeneratedKey.keyPrefix || 'np_live_'}${newlyGeneratedKey.id}`
                    )
                  }
                  className="btn-secondary py-1.5 px-3 whitespace-nowrap text-xs"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-lg text-xs text-amber-300/90 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Please store this key in a secure password manager or environment variable. You won't be able to view it again.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setNewlyGeneratedKey(null)}
                className="btn-primary w-full py-2"
              >
                I Have Saved My Secret Key
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Dialog */}
      {keyToRevoke && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="clerk-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/80 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Revoke API Key</h3>
                <p className="text-xs text-zinc-400">Immediate access termination</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to revoke key <strong className="text-white">{keyToRevoke.name}</strong>? Any services currently making requests using this key will immediately receive HTTP 401 Unauthorized errors.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKeyToRevoke(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevoking}
                onClick={handleRevokeKey}
                className="btn-danger"
              >
                {isRevoking ? 'Revoking...' : 'Revoke Key'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
