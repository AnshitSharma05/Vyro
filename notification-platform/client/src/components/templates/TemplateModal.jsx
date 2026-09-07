import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Sparkles, 
  Eye, 
  Code2, 
  Send, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Bell, 
  Check, 
  Copy, 
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { templatesService } from '../../services/templates.service';
import { notificationsService } from '../../services/notifications.service';

export default function TemplateModal({ isOpen, onClose, template, projectId, onSaved }) {
  const isEditing = Boolean(template?.id);
  
  const [channel, setChannel] = useState(template?.channel || 'EMAIL');
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [sender, setSender] = useState(template?.metadata?.from || '');
  const [body, setBody] = useState(template?.body || '');
  
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview' | 'test'
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [renderedPreview, setRenderedPreview] = useState({ subject: '', body: '' });
  
  // Sample Data for preview & test
  const [sampleDataJson, setSampleDataJson] = useState('{\n  "name": "Alex Smith",\n  "companyName": "Vyro Cloud",\n  "code": "849201",\n  "orderId": "ORD-9912"\n}');
  
  // Test Send state
  const [testRecipient, setTestRecipient] = useState('alex@example.com');
  const [isTestSending, setIsTestSending] = useState(false);

  useEffect(() => {
    if (template) {
      setChannel(template.channel || 'EMAIL');
      setName(template.name || '');
      setSubject(template.subject || '');
      setSender(template.sender || template.from || '');
      setBody(template.body || '');
    } else {
      setChannel('EMAIL');
      setName('');
      setSubject('');
      setSender('');
      setBody('<h1>Hello {{name}},</h1>\n<p>Welcome to {{companyName}}! Your verification code is <strong>{{code}}</strong>.</p>');
    }
    setActiveTab('editor');
  }, [template, isOpen]);

  // Extract variables dynamically from subject and body
  const detectedVariables = useMemo(() => {
    const text = `${subject} ${body}`;
    const matches = text.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
    const unique = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').trim())));
    return unique;
  }, [subject, body]);

  // Handle variable chip insertion
  const insertVariable = (varName) => {
    const token = `{{${varName}}}`;
    setBody((prev) => prev + ` ${token} `);
    toast.success(`Inserted ${token}`);
  };

  // Render preview
  const handlePreview = async () => {
    setIsPreviewLoading(true);
    try {
      let parsedData = {};
      try {
        parsedData = JSON.parse(sampleDataJson);
      } catch (e) {
        toast.error('Invalid JSON format in test variables');
        setIsPreviewLoading(false);
        return;
      }

      const res = await templatesService.preview(projectId, {
        templateId: template?.id,
        subject: channel === 'EMAIL' ? subject : undefined,
        body,
        data: parsedData,
      });

      setRenderedPreview({
        subject: res.subject || '',
        body: res.body || '',
      });
    } catch (err) {
      toast.error(err.message || 'Failed to render preview');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'preview' || activeTab === 'test') {
      handlePreview();
    }
  }, [activeTab, sampleDataJson, subject, body, channel]);

  // Save template
  const handleSave = async (e) => {
    e.preventDefault();
    if (!projectId) {
      toast.error('Active project not resolved. Please reload page.');
      return;
    }
    const sanitizedSlug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    if (!sanitizedSlug) {
      toast.error('Template slug identifier is required (e.g. welcome-email)');
      return;
    }
    if (channel === 'EMAIL' && !subject.trim()) {
      toast.error('Email subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Template body is required');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await templatesService.update(projectId, template.id, {
          name: sanitizedSlug,
          subject: channel === 'EMAIL' ? subject : null,
          body,
        });
        toast.success('Template updated successfully');
      } else {
        await templatesService.create(projectId, {
          name: sanitizedSlug,
          channel,
          subject: channel === 'EMAIL' ? subject : null,
          body,
        });
        toast.success('Template created successfully');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-sync detected variables into sample data JSON
  useEffect(() => {
    try {
      const current = JSON.parse(sampleDataJson);
      let changed = false;
      detectedVariables.forEach((v) => {
        if (current[v] === undefined) {
          current[v] = v === 'name' ? 'Alex' : v === 'code' ? '849201' : v === 'companyName' ? 'Vyro Cloud' : `sample_${v}`;
          changed = true;
        }
      });
      if (changed) {
        setSampleDataJson(JSON.stringify(current, null, 2));
      }
    } catch {
      // Ignore JSON parse errors while typing
    }
  }, [detectedVariables]);

  // Test Dispatch
  const handleTestSend = async () => {
    if (!testRecipient) {
      toast.error('Please specify a recipient');
      return;
    }
    if (!name.trim()) {
      toast.error('Template slug identifier is required');
      return;
    }
    if (channel === 'EMAIL' && !subject.trim()) {
      toast.error('Email subject is required');
      return;
    }
    if (!body.trim()) {
      toast.error('Template body is required');
      return;
    }

    const sanitizedSlug = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
    setIsTestSending(true);

    try {
      // 1. Ensure template exists in database (save/upsert before sending)
      if (isEditing && template?.id) {
        await templatesService.update(projectId, template.id, {
          name: sanitizedSlug,
          subject: channel === 'EMAIL' ? subject : null,
          body,
        });
      } else {
        await templatesService.create(projectId, {
          name: sanitizedSlug,
          channel,
          subject: channel === 'EMAIL' ? subject : null,
          body,
        });
        onSaved();
      }

      // 2. Parse sample data and ensure all variables are populated
      let parsedData = {};
      try {
        parsedData = JSON.parse(sampleDataJson);
      } catch {
        parsedData = {};
      }

      if (sender && sender.trim()) {
        parsedData.from = sender.trim();
      }

      detectedVariables.forEach((v) => {
        if (parsedData[v] === undefined || parsedData[v] === null) {
          parsedData[v] = `sample_${v}`;
        }
      });

      // 3. Dispatch live test notification
      await notificationsService.sendTest({
        channel,
        category: 'TRANSACTIONAL',
        template: sanitizedSlug,
        recipient: testRecipient.trim(),
        data: parsedData,
      });

      toast.success(`Template saved & test email sent to ${testRecipient}!`);
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to send test notification');
    } finally {
      setIsTestSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121215] border border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 flex items-center justify-between bg-[#0e0e11]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {isEditing ? 'Edit Template' : 'Create Template'}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                {channel}
              </span>
            </div>
            <h2 className="text-base font-semibold text-white tracking-tight mt-0.5">
              {name || 'Untitled Template'}
            </h2>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-[#18181b] p-1 rounded-lg border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'editor' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 inline mr-1.5" />
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'preview' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5 inline mr-1.5" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('test')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                activeTab === 'test' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Send className="w-3.5 h-3.5 inline mr-1.5" />
              Test Send
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* TAB 1: EDITOR */}
          {activeTab === 'editor' && (
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Row 1: Channel & Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Delivery Channel
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'EMAIL', label: 'Email', icon: Mail },
                      { id: 'SMS', label: 'SMS', icon: Smartphone },
                      { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageSquare },
                      { id: 'PUSH', label: 'Push', icon: Bell },
                    ].map((item) => {
                      const Icon = item.icon;
                      const isSelected = channel === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={isEditing}
                          onClick={() => setChannel(item.id)}
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${
                            isSelected
                              ? 'bg-zinc-100 text-black border-white'
                              : 'bg-[#0a0a0d] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                          } ${isEditing ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Template Identifier / Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. welcome-email, otp-verify, invoice-ready"
                    className="input-base font-mono text-xs"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Unique identifier used when triggering dispatches via API.
                  </p>
                </div>
              </div>

              {/* Subject & From (for EMAIL) */}
              {channel === 'EMAIL' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Sender / From Address (Optional)
                    </label>
                    <input
                      type="text"
                      value={sender}
                      onChange={(e) => setSender(e.target.value)}
                      placeholder='e.g. "Vyro Team" <notifications@vyro.io>'
                      className="input-base text-xs font-mono"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Custom from header for this specific template.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Email Subject Line <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Welcome {{name}} to {{companyName}}!"
                      className="input-base text-xs"
                    />
                    <p className="text-[11px] text-zinc-500 mt-1">
                      Subject rendered in recipient inbox.
                    </p>
                  </div>
                </div>
              )}

              {/* Detected Variables Bar */}
              <div className="bg-[#0a0a0d] border border-zinc-800/90 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
                    Detected Variables ({detectedVariables.length})
                  </span>
                  <span className="text-[11px] text-zinc-500">
                    Wrap with <code className="text-zinc-300 font-mono">{'{{variable}}'}</code>
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5 items-center">
                  {detectedVariables.length > 0 ? (
                    detectedVariables.map((v) => (
                      <span
                        key={v}
                        className="px-2 py-0.5 rounded-md text-xs font-mono bg-zinc-800 text-zinc-200 border border-zinc-700/80 flex items-center gap-1"
                      >
                        {`{{${v}}}`}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-500 italic">
                      No variables detected yet. Add tokens like {'{{name}}'} or {'{{code}}'}.
                    </span>
                  )}
                  
                  {/* Quick Preset inserters */}
                  <div className="ml-auto flex items-center gap-1">
                    {['name', 'code', 'companyName'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => insertVariable(preset)}
                        className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded transition-colors"
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Body Editor */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Message Body {channel === 'EMAIL' ? '(HTML supported)' : '(Plain Text)'}
                  </label>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {body.length} characters
                  </span>
                </div>
                <textarea
                  rows={10}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={
                    channel === 'EMAIL'
                      ? '<h1>Welcome {{name}}!</h1>\n<p>Thanks for joining {{companyName}}.</p>'
                      : 'Your security verification code is {{code}}. Valid for 10 minutes.'
                  }
                  className="input-mono h-56 resize-y"
                />
              </div>

            </form>
          )}

          {/* TAB 2: LIVE PREVIEW */}
          {activeTab === 'preview' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Left Column: Sample JSON Variables */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-zinc-300">
                    Mock Data Payload (JSON)
                  </label>
                  <button
                    type="button"
                    onClick={handlePreview}
                    className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isPreviewLoading ? 'animate-spin' : ''}`} />
                    Re-render
                  </button>
                </div>
                <textarea
                  rows={12}
                  value={sampleDataJson}
                  onChange={(e) => setSampleDataJson(e.target.value)}
                  className="input-mono h-64 text-xs"
                />
                <p className="text-[11px] text-zinc-500">
                  Update mock JSON values to see them rendered in real-time.
                </p>
              </div>

              {/* Right Column: Rendered Output */}
              <div className="lg:col-span-7 space-y-3">
                <label className="text-xs font-medium text-zinc-300">
                  Rendered Output
                </label>

                <div className="bg-[#0a0a0d] border border-zinc-800 rounded-xl overflow-hidden">
                  {channel === 'EMAIL' && (
                    <div className="px-4 py-2.5 bg-zinc-900/60 border-b border-zinc-800 text-xs">
                      <span className="text-zinc-500">Subject: </span>
                      <span className="font-semibold text-white">
                        {renderedPreview.subject || subject || '(No subject)'}
                      </span>
                    </div>
                  )}

                  <div className="p-4 max-h-72 overflow-y-auto bg-black/40">
                    {channel === 'EMAIL' ? (
                      <div 
                        className="prose prose-invert prose-sm max-w-none text-zinc-200"
                        dangerouslySetInnerHTML={{ __html: renderedPreview.body || body }}
                      />
                    ) : (
                      <div className="font-mono text-sm whitespace-pre-wrap text-zinc-200 bg-zinc-900/80 p-3 rounded-lg border border-zinc-800">
                        {renderedPreview.body || body}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: TEST SEND */}
          {activeTab === 'test' && (
            <div className="max-w-xl mx-auto space-y-4 py-2">
              <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <Send className="w-4 h-4 text-zinc-400" />
                  Live Dispatch Test
                </div>
                <p className="text-xs text-zinc-400">
                  Dispatch a real test notification directly from this editor using your active SMTP / channel provider.
                </p>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Test Recipient ({channel === 'EMAIL' ? 'Email Address' : 'Phone Number / Device Token'})
                  </label>
                  <input
                    type="text"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder={channel === 'EMAIL' ? 'you@example.com' : '+15551234567'}
                    className="input-base text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">
                    Variables Payload
                  </label>
                  <textarea
                    rows={4}
                    value={sampleDataJson}
                    onChange={(e) => setSampleDataJson(e.target.value)}
                    className="input-mono text-xs"
                  />
                </div>

                <button
                  type="button"
                  disabled={isTestSending}
                  onClick={handleTestSend}
                  className="btn-primary w-full py-2.5 mt-2"
                >
                  <Send className={`w-3.5 h-3.5 ${isTestSending ? 'animate-spin' : ''}`} />
                  {isTestSending ? 'Dispatching...' : 'Send Live Test Now'}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-[#0e0e11] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="btn-primary"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Template'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
