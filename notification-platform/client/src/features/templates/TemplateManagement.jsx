import React, { useState, useEffect } from 'react';
import { FileText, Plus, Trash2, Edit, Eye, Mail, MessageSquare, Smartphone, Bell, AlertCircle } from 'lucide-react';
import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  previewTemplate,
} from '../../api/templates.api';

const CHANNEL_ICONS = {
  EMAIL: <Mail className="w-4 h-4 text-sky-400" />,
  SMS: <MessageSquare className="w-4 h-4 text-emerald-400" />,
  WHATSAPP: <Smartphone className="w-4 h-4 text-green-400" />,
  PUSH: <Bell className="w-4 h-4 text-amber-400" />,
};

export default function TemplateManagement({ projectId }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [channelFilter, setChannelFilter] = useState('');

  // Form Modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
  });
  const [saving, setSaving] = useState(false);

  // Preview Modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewTemplateData, setPreviewTemplateData] = useState(null);
  const [sampleJson, setSampleJson] = useState('{\n  "name": "Anshit",\n  "orderId": "ORD-12345"\n}');
  const [renderedPreview, setRenderedPreview] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchTemplates();
    }
  }, [projectId, channelFilter]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await listTemplates(projectId, { channel: channelFilter || undefined });
      setTemplates(res.data.templates || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch templates');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData({ name: '', channel: 'EMAIL', subject: '', body: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (tpl) => {
    setEditingTemplate(tpl);
    setFormData({
      name: tpl.name,
      channel: tpl.channel,
      subject: tpl.subject || '',
      body: tpl.body,
    });
    setIsFormOpen(true);
  };

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        channel: formData.channel,
        body: formData.body,
      };
      if (formData.channel === 'EMAIL') {
        payload.subject = formData.subject.trim();
      }

      if (editingTemplate) {
        await updateTemplate(projectId, editingTemplate.id, payload);
      } else {
        await createTemplate(projectId, payload);
      }

      setIsFormOpen(false);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId, name) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return;

    try {
      await deleteTemplate(projectId, templateId);
      fetchTemplates();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleOpenPreview = (tpl) => {
    setPreviewTemplateData(tpl);
    setRenderedPreview(null);
    setPreviewError(null);

    // Generate initial sample JSON from variables
    const sample = {};
    (tpl.variables || []).forEach((v) => {
      sample[v] = `Sample ${v}`;
    });
    setSampleJson(JSON.stringify(sample, null, 2));

    setPreviewModalOpen(true);
  };

  const handleRenderPreview = async () => {
    try {
      setRendering(true);
      setPreviewError(null);
      let parsedData = {};
      try {
        parsedData = JSON.parse(sampleJson);
      } catch (e) {
        setPreviewError('Invalid JSON format in sample data');
        setRendering(false);
        return;
      }

      const res = await previewTemplate(projectId, {
        templateId: previewTemplateData.id,
        data: parsedData,
      });

      setRenderedPreview(res.data);
    } catch (err) {
      setPreviewError(err.response?.data?.message || 'Rendering failed');
    } finally {
      setRendering(false);
    }
  };

  return (
    <div className="p-6 bg-slate-900 text-slate-100 rounded-xl shadow-xl border border-slate-800">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            Notification Templates
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage reusable notification templates and variable placeholders across channels.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none"
          >
            <option value="">All Channels</option>
            <option value="EMAIL">EMAIL</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WHATSAPP</option>
            <option value="PUSH">PUSH</option>
          </select>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors shadow-md text-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-slate-500">Loading templates...</div>
      ) : error ? (
        <div className="p-4 bg-red-950/40 border border-red-800 text-red-300 rounded-lg">
          {error}
        </div>
      ) : templates.length === 0 ? (
        <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-lg">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No templates found</p>
          <p className="text-sm text-slate-500 mt-1">
            Create your first notification template to begin sending messages.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="p-5 bg-slate-950/60 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold text-indigo-300">{tpl.name}</span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                    {CHANNEL_ICONS[tpl.channel]}
                    {tpl.channel}
                  </span>
                </div>

                {tpl.channel === 'EMAIL' && (
                  <p className="text-xs font-medium text-slate-300 mb-2 truncate">
                    <strong className="text-slate-400">Subject:</strong> {tpl.subject}
                  </p>
                )}

                <p className="text-xs text-slate-400 line-clamp-3 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 font-mono mb-4">
                  {tpl.body}
                </p>

                {tpl.variables && tpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {tpl.variables.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 text-[10px] font-mono rounded"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs text-slate-500">
                <span>Updated {new Date(tpl.updatedAt).toLocaleDateString()}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenPreview(tpl)}
                    className="p-1.5 text-slate-400 hover:text-indigo-300 transition-colors"
                    title="Preview Rendering"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(tpl)}
                    className="p-1.5 text-slate-400 hover:text-white transition-colors"
                    title="Edit Template"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(tpl.id, tpl.name)}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4">
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </h3>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Template Name (Identifier)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. order-confirmed"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Channel
                </label>
                <select
                  disabled={!!editingTemplate}
                  value={formData.channel}
                  onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none"
                >
                  <option value="EMAIL">EMAIL</option>
                  <option value="SMS">SMS</option>
                  <option value="WHATSAPP">WHATSAPP</option>
                  <option value="PUSH">PUSH</option>
                </select>
              </div>

              {formData.channel === 'EMAIL' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                    Subject Line
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Order {{orderId}} Confirmed"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Body Content
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Hello {{name}}, your order {{orderId}} is confirmed."
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewModalOpen && previewTemplateData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
              <Eye className="w-5 h-5 text-indigo-400" />
              Template Preview: <span className="font-mono text-indigo-300">{previewTemplateData.name}</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Pass sample variable data payload to test live template rendering.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Sample Data Payload (JSON)
                </label>
                <textarea
                  rows={8}
                  value={sampleJson}
                  onChange={(e) => setSampleJson(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleRenderPreview}
                  disabled={rendering}
                  className="mt-2 w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs"
                >
                  {rendering ? 'Rendering...' : 'Render Template'}
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">
                  Rendered Output
                </label>

                {previewError ? (
                  <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>{previewError}</div>
                  </div>
                ) : renderedPreview ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-3">
                    {renderedPreview.subject && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Subject:</span>
                        <p className="text-xs font-semibold text-slate-200">{renderedPreview.subject}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Body:</span>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono">{renderedPreview.body}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-lg text-center text-slate-500 text-xs">
                    Click "Render Template" to view rendered result.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
