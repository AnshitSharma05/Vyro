import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  Zap, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Bell, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { notificationsService } from '../../services/notifications.service';
import { templatesService } from '../../services/templates.service';

export default function LiveDispatcher({ projectId, activeApiKey, onDispatched, preselectedTemplate }) {
  const [channel, setChannel] = useState('EMAIL');
  const [templateName, setTemplateName] = useState('');
  const [recipient, setRecipient] = useState('');
  const [fromAddress, setFromAddress] = useState('');
  const [category, setCategory] = useState('TRANSACTIONAL');
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [variables, setVariables] = useState({ name: 'Alex', companyName: 'Vyro Cloud' });
  const [isSending, setIsSending] = useState(false);

  // Load available project templates
  useEffect(() => {
    if (!projectId) return;
    templatesService.list(projectId).then((data) => {
      const list = data.templates || [];
      setAvailableTemplates(list);
      if (list.length > 0 && !templateName) {
        const first = list[0];
        setTemplateName(first.name);
        setChannel(first.channel);
        if (first.variables && first.variables.length > 0) {
          const initVars = {};
          first.variables.forEach((v) => {
            initVars[v] = v === 'name' ? 'Alex' : v === 'code' ? '749204' : `${v}_value`;
          });
          setVariables(initVars);
        }
      }
    });
  }, [projectId]);

  // Handle preselected template if clicked from Templates tab
  useEffect(() => {
    if (preselectedTemplate) {
      setTemplateName(preselectedTemplate.name);
      setChannel(preselectedTemplate.channel);
      if (preselectedTemplate.variables && preselectedTemplate.variables.length > 0) {
        const initVars = {};
        preselectedTemplate.variables.forEach((v) => {
          initVars[v] = v === 'name' ? 'Alex' : v === 'code' ? '749204' : `${v}_value`;
        });
        setVariables(initVars);
      }
    }
  }, [preselectedTemplate]);

  // When template selection changes, update channel & variables
  const handleTemplateChange = (name) => {
    setTemplateName(name);
    const found = availableTemplates.find((t) => t.name === name);
    if (found) {
      setChannel(found.channel);
      if (found.variables && found.variables.length > 0) {
        const updated = {};
        found.variables.forEach((v) => {
          updated[v] = variables[v] || (v === 'name' ? 'Alex' : v === 'code' ? '749204' : `${v}_value`);
        });
        setVariables(updated);
      }
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!recipient.trim()) {
      toast.error('Recipient identifier is required');
      return;
    }

    setIsSending(true);
    try {
      const payloadData = { ...variables };
      if (channel === 'EMAIL' && fromAddress.trim()) {
        payloadData.from = fromAddress.trim();
      }

      const data = await notificationsService.sendTest({
        apiKey: activeApiKey,
        channel,
        category,
        template: templateName,
        recipient: recipient.trim(),
        data: payloadData,
      });

      toast.success(`Notification Enqueued! ID: ${data?.id || 'notif_success'}`);
      if (onDispatched) onDispatched();
    } catch (err) {
      toast.error(err.message || 'Failed to dispatch notification');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="clerk-card p-6 border-zinc-800/90 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-5 border-b border-zinc-800/80">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-zinc-300" />
            Live Notification Dispatcher
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Test immediate delivery through the queue workers & configured providers.
          </p>
        </div>
        <span className="text-[11px] font-mono text-zinc-500 bg-[#0a0a0d] px-2.5 py-1 rounded-md border border-zinc-800 self-start sm:self-auto">
          POST /api/v1/notifications/send
        </span>
      </div>

      <form onSubmit={handleSend} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Channel */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Channel
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="input-base text-xs"
            >
              <option value="EMAIL">EMAIL</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WHATSAPP</option>
              <option value="PUSH">PUSH</option>
            </select>
          </div>

          {/* Template Selector */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Template Slug
            </label>
            {availableTemplates.length > 0 ? (
              <select
                value={templateName}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="input-base text-xs font-mono"
              >
                {availableTemplates.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} ({t.channel})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="welcome-email"
                className="input-base text-xs font-mono"
              />
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input-base text-xs"
            >
              <option value="TRANSACTIONAL">TRANSACTIONAL</option>
              <option value="SECURITY">SECURITY</option>
              <option value="MARKETING">MARKETING</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Recipient {channel === 'EMAIL' ? '(Email)' : channel === 'SMS' ? '(E.164 Phone)' : '(Token)'}
            </label>
            <input
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder={channel === 'EMAIL' ? 'user@example.com' : '+15551234567'}
              className="input-base text-xs"
            />
          </div>

          {/* Optional Sender (for EMAIL) */}
          {channel === 'EMAIL' && (
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Custom Sender / From Header (Optional)
              </label>
              <input
                type="text"
                value={fromAddress}
                onChange={(e) => setFromAddress(e.target.value)}
                placeholder='e.g. "Vyro Alerts" <notifications@vyro.io> (Default: SMTP_FROM)'
                className="input-base text-xs font-mono"
              />
            </div>
          )}

        </div>

        {/* Dynamic Template Variables */}
        {Object.keys(variables).length > 0 && (
          <div className="p-3 bg-[#0a0a0d] border border-zinc-800/80 rounded-lg space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Template Variables Required by "{templateName}"</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.keys(variables).map((varKey) => (
                <div key={varKey}>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                    {`{{${varKey}}}`}
                  </label>
                  <input
                    type="text"
                    value={variables[varKey]}
                    onChange={(e) =>
                      setVariables({ ...variables, [varKey]: e.target.value })
                    }
                    className="input-base text-xs"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dispatch Action */}
        <div className="flex items-center justify-end pt-1">
          <button
            type="submit"
            disabled={isSending}
            className="btn-primary py-2.5 px-5"
          >
            <Send className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
            <span>{isSending ? 'Dispatching...' : 'Dispatch Notification'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
