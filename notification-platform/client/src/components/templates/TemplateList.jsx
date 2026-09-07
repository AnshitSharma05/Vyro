import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Bell, 
  Edit3, 
  Trash2, 
  MoreVertical, 
  Copy, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import { templatesService } from '../../services/templates.service';
import TemplateModal from './TemplateModal';

export default function TemplateList({ projectId, onSelectTemplateForTest }) {
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // Delete confirmation
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load templates from real backend API
  const loadTemplates = async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await templatesService.list(projectId, {
        channel: selectedChannel,
      });
      setTemplates(data.templates || []);
    } catch (err) {
      toast.error(err.message || 'Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [projectId, selectedChannel]);

  // Filter templates by search
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch = 
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.subject && tpl.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleEdit = (tpl) => {
    setEditingTemplate(tpl);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      await templatesService.delete(projectId, templateToDelete.id);
      toast.success(`Template "${templateToDelete.name}" deleted`);
      setTemplateToDelete(null);
      loadTemplates();
    } catch (err) {
      toast.error(err.message || 'Failed to delete template');
    } finally {
      setIsDeleting(false);
    }
  };

  const getChannelIcon = (ch) => {
    switch (ch) {
      case 'EMAIL': return <Mail className="w-3.5 h-3.5 text-zinc-300" />;
      case 'SMS': return <Smartphone className="w-3.5 h-3.5 text-zinc-300" />;
      case 'WHATSAPP': return <MessageSquare className="w-3.5 h-3.5 text-zinc-300" />;
      case 'PUSH': return <Bell className="w-3.5 h-3.5 text-zinc-300" />;
      default: return <FileText className="w-3.5 h-3.5 text-zinc-300" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Notification Templates</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure multi-channel layouts with dynamic Handlebars variables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadTemplates}
            className="p-2 text-zinc-400 hover:text-white bg-[#121215] border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
            title="Refresh templates"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCreateNew}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#121215] p-2 rounded-xl border border-zinc-800/80">
        
        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Channels' },
            { id: 'EMAIL', label: 'Email' },
            { id: 'SMS', label: 'SMS' },
            { id: 'WHATSAPP', label: 'WhatsApp' },
            { id: 'PUSH', label: 'Push' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedChannel(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedChannel === item.id
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-[#0a0a0d] border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 font-sans"
          />
        </div>
      </div>

      {/* Template Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="clerk-card animate-pulse h-44 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                <div className="h-3 bg-zinc-800/50 rounded w-3/4"></div>
              </div>
              <div className="h-4 bg-zinc-800/30 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State */
        <div className="clerk-card py-12 flex flex-col items-center justify-center text-center border-dashed">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-zinc-400" />
          </div>
          <h3 className="text-sm font-semibold text-white">No templates found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-4">
            {searchQuery || selectedChannel !== 'ALL'
              ? 'No templates match your current filters. Try changing or clearing filters.'
              : 'Create reusable message templates for Email, SMS, WhatsApp, and Mobile Push.'}
          </p>
          <button
            onClick={handleCreateNew}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Your First Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className="clerk-card-hover flex flex-col justify-between group"
            >
              <div>
                {/* Card Top Row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="p-1 rounded-md bg-zinc-800/80 border border-zinc-700/60">
                      {getChannelIcon(tpl.channel)}
                    </span>
                    <span className="font-mono text-xs font-semibold text-white tracking-tight">
                      {tpl.name}
                    </span>
                  </div>

                  <span className="badge text-[10px] bg-zinc-900 border-zinc-800 text-zinc-400">
                    {tpl.channel}
                  </span>
                </div>

                {/* Subject or snippet */}
                {tpl.channel === 'EMAIL' ? (
                  <p className="text-xs text-zinc-300 font-medium line-clamp-1 mb-2">
                    {tpl.subject || '(No subject)'}
                  </p>
                ) : (
                  <p className="text-xs text-zinc-400 line-clamp-2 mb-2 font-mono text-[11px]">
                    {tpl.body}
                  </p>
                )}

                {/* Variables pills */}
                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3 mb-2">
                    {tpl.variables.slice(0, 4).map((v) => (
                      <span
                        key={v}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                    {tpl.variables.length > 4 && (
                      <span className="text-[10px] text-zinc-500 self-center">
                        +{tpl.variables.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-zinc-800/70 flex items-center justify-between mt-3 text-xs">
                <span className="text-[11px] text-zinc-500">
                  {new Date(tpl.updatedAt || tpl.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>

                <div className="flex items-center gap-1">
                  {onSelectTemplateForTest && (
                    <button
                      onClick={() => onSelectTemplateForTest(tpl)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                      title="Send Test with this Template"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleEdit(tpl)}
                    className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Edit Template"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => setTemplateToDelete(tpl)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Modal for Create / Edit */}
      {isModalOpen && (
        <TemplateModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          template={editingTemplate}
          projectId={projectId}
          onSaved={loadTemplates}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="clerk-card max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-full bg-red-950/60 border border-red-900/80 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete Template</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300">
              Are you sure you want to permanently delete template{' '}
              <strong className="text-white font-mono">{templateToDelete.name}</strong>? Any automated workflows or API calls referencing this template slug may fail.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={confirmDelete}
                className="btn-danger"
              >
                {isDeleting ? 'Deleting...' : 'Delete Template'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
