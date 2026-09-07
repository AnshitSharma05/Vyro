import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  Terminal, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  Zap
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApiDocs({ activeApiKey, activeProject }) {
  const [selectedLanguage, setSelectedLanguage] = useState('curl');
  const [copied, setCopied] = useState(false);

  const keyDisplay = activeApiKey || 'np_dev_dev_secret_key_1234567890';
  const projectId = activeProject?.id || 'proj_12345';

  const snippets = {
    curl: `# 1. Send an Email or SMS Notification
curl -X POST https://api.vyro.io/api/v1/notifications/send \\
  -H "X-API-Key: ${keyDisplay}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "channel": "EMAIL",
    "category": "TRANSACTIONAL",
    "template": "welcome-email",
    "recipient": "user@example.com",
    "data": {
      "name": "Alex",
      "companyName": "Vyro Cloud",
      "code": "849201"
    }
  }'`,

    node: `// Install: npm install @vyro/sdk
const { VyroClient } = require('@vyro/sdk');

const vyro = new VyroClient({
  apiKey: '${keyDisplay}',
});

async function main() {
  const response = await vyro.notifications.send({
    channel: 'EMAIL',
    category: 'TRANSACTIONAL',
    template: 'welcome-email',
    recipient: 'user@example.com',
    data: {
      name: 'Alex',
      companyName: 'Vyro Cloud',
      code: '849201'
    }
  });

  console.log('Enqueued ID:', response.id);
}

main();`,

    python: `# Install: pip install vyro-sdk
from vyro import VyroClient

client = VyroClient(api_key="${keyDisplay}")

response = client.notifications.send(
    channel="EMAIL",
    category="TRANSACTIONAL",
    template="welcome-email",
    recipient="user@example.com",
    data={
        "name": "Alex",
        "companyName": "Vyro Cloud",
        "code": "849201"
    }
)

print(f"Dispatched ID: {response.id}")`,

    go: `package main

import (
	"fmt"
	"github.com/vyro/vyro-go"
)

func main() {
	client := vyro.NewClient("${keyDisplay}")

	res, err := client.Notifications.Send(vyro.SendParams{
		Channel:   "EMAIL",
		Category:  "TRANSACTIONAL",
		Template:  "welcome-email",
		Recipient: "user@example.com",
		Data: map[string]interface{}{
			"name":        "Alex",
			"companyName": "Vyro Cloud",
			"code":        "849201",
		},
	})
	if err != nil {
		panic(err)
	}

	fmt.Printf("Notification sent: %s\\n", res.ID)
}`
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(snippets[selectedLanguage]);
    setCopied(true);
    toast.success('Code snippet copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-white tracking-tight">API Reference & Quickstart</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Integrate multi-channel notification dispatching into your backend in seconds.
        </p>
      </div>

      {/* Code Card */}
      <div className="clerk-panel">
        
        {/* Language Tabs & Copy */}
        <div className="px-4 py-3 bg-[#121215] border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[
              { id: 'curl', label: 'cURL' },
              { id: 'node', label: 'Node.js' },
              { id: 'python', label: 'Python' },
              { id: 'go', label: 'Go' },
            ].map((lang) => (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  selectedLanguage === lang.id
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <button
            onClick={copySnippet}
            className="btn-secondary py-1 px-2.5 text-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Snippet'}</span>
          </button>
        </div>

        {/* Code Content */}
        <div className="p-4 bg-[#0a0a0d] overflow-x-auto">
          <pre className="font-mono text-xs text-zinc-200 leading-relaxed">
            {snippets[selectedLanguage]}
          </pre>
        </div>

      </div>

      {/* Endpoints Table */}
      <div className="clerk-card space-y-4">
        <h3 className="text-sm font-semibold text-white">Core Machine & Dashboard Endpoints</h3>
        <div className="space-y-2 text-xs">
          
          <div className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-900/60">
                POST
              </span>
              <span className="font-mono text-zinc-200">/api/v1/notifications/send</span>
            </div>
            <span className="text-zinc-400 text-[11px]">Enqueues notification job via X-API-Key</span>
          </div>

          <div className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950/60 text-blue-400 border border-blue-900/60">
                GET
              </span>
              <span className="font-mono text-zinc-200">/api/v1/projects/:projectId/templates</span>
            </div>
            <span className="text-zinc-400 text-[11px]">List message templates</span>
          </div>

          <div className="p-3 bg-[#0a0a0d] border border-zinc-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-950/60 text-purple-400 border border-purple-900/60">
                POST
              </span>
              <span className="font-mono text-zinc-200">/api/v1/projects/:projectId/templates/preview</span>
            </div>
            <span className="text-zinc-400 text-[11px]">Dry-run render Handlebars template with variables</span>
          </div>

        </div>
      </div>

    </div>
  );
}
