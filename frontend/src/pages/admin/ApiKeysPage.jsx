import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  Link,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Send,
  Clock,
  Shield,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const ApiKeysPage = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState(null);
  const [webhookLogs, setWebhookLogs] = useState({});
  const [testingWebhook, setTestingWebhook] = useState(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const res = await api.get('/api-keys');
      setApiKeys(res.data);
    } catch (err) {
      toast.error('Failed to load API keys');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Name is required');
      return;
    }
    try {
      const res = await api.post('/api-keys', {
        name: newKeyName.trim(),
        webhook_url: newWebhookUrl.trim() || null
      });
      setCreatedKey(res.data);
      setShowKey(true);
      setNewKeyName('');
      setNewWebhookUrl('');
      fetchApiKeys();
      toast.success('API key created');
    } catch (err) {
      toast.error('Failed to create API key');
    }
  };

  const handleDeleteKey = async (keyPrefix) => {
    if (!window.confirm('Are you sure? This will revoke the API key permanently.')) return;
    try {
      await api.delete(`/api-keys/${encodeURIComponent(keyPrefix)}`);
      fetchApiKeys();
      toast.success('API key deleted');
    } catch (err) {
      toast.error('Failed to delete key');
    }
  };

  const handleToggleActive = async (keyPrefix, isActive) => {
    try {
      await api.put(`/api-keys/${encodeURIComponent(keyPrefix)}`, { is_active: !isActive });
      fetchApiKeys();
      toast.success(isActive ? 'Key deactivated' : 'Key activated');
    } catch (err) {
      toast.error('Failed to update key');
    }
  };

  const handleUpdateWebhook = async (keyPrefix, url) => {
    try {
      await api.put(`/api-keys/${encodeURIComponent(keyPrefix)}`, { webhook_url: url });
      setEditingWebhook(null);
      fetchApiKeys();
      toast.success('Webhook URL updated');
    } catch (err) {
      toast.error('Failed to update webhook');
    }
  };

  const handleTestWebhook = async (keyPrefix) => {
    setTestingWebhook(keyPrefix);
    try {
      const res = await api.post(`/api-keys/${encodeURIComponent(keyPrefix)}/test-webhook`);
      if (res.data.success) {
        toast.success(`Webhook test successful (${res.data.status_code})`);
      } else {
        toast.error(`Webhook test failed: ${res.data.message}`);
      }
    } catch (err) {
      toast.error('Failed to test webhook');
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleViewLogs = async (keyPrefix) => {
    try {
      const res = await api.get(`/api-keys/${encodeURIComponent(keyPrefix)}/webhook-logs`);
      setWebhookLogs(prev => ({ ...prev, [keyPrefix]: res.data }));
    } catch (err) {
      toast.error('Failed to load webhook logs');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const apiBaseUrl = window.location.origin;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6" data-testid="api-keys-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Key className="h-7 w-7 text-[#c9a962]" />
            API Keys & Sync
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage API keys for external apps to sync Products, Style Options & Measurements
          </p>
        </div>
        <Button
          onClick={() => { setShowCreateDialog(true); setCreatedKey(null); }}
          className="bg-[#c9a962] hover:bg-[#b89952] text-black"
          data-testid="create-api-key-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create API Key
        </Button>
      </div>

      {/* API Documentation Card */}
      <div className="bg-[#1a2744] text-white rounded-lg p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Shield className="h-5 w-5 text-[#c9a962]" />
          Sync API Endpoints
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="bg-white/10 rounded p-3">
            <code className="text-[#c9a962] text-xs font-mono">GET /api/sync/products</code>
            <p className="text-white/70 mt-1 text-xs">All product categories with products</p>
          </div>
          <div className="bg-white/10 rounded p-3">
            <code className="text-[#c9a962] text-xs font-mono">GET /api/sync/styling/{'{'} product_id{'}'}</code>
            <p className="text-white/70 mt-1 text-xs">Style options for a product</p>
          </div>
          <div className="bg-white/10 rounded p-3">
            <code className="text-[#c9a962] text-xs font-mono">GET /api/sync/measurements</code>
            <p className="text-white/70 mt-1 text-xs">Measurement configuration</p>
          </div>
          <div className="bg-white/10 rounded p-3">
            <code className="text-[#c9a962] text-xs font-mono">GET /api/sync/all</code>
            <p className="text-white/70 mt-1 text-xs">Everything in one call</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
          <span>Base URL:</span>
          <code className="bg-white/10 px-2 py-1 rounded cursor-pointer hover:bg-white/20" onClick={() => copyToClipboard(apiBaseUrl)}>
            {apiBaseUrl}
          </code>
          <span>| Header:</span>
          <code className="bg-white/10 px-2 py-1 rounded">X-API-Key: your_key</code>
        </div>
      </div>

      {/* API Keys List */}
      {apiKeys.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Key className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No API keys yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((key) => (
            <div
              key={key.key_prefix}
              className={`border rounded-lg overflow-hidden ${key.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'}`}
              data-testid={`api-key-${key.key_prefix}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className={`h-5 w-5 ${key.is_active ? 'text-[#c9a962]' : 'text-red-400'}`} />
                    <div>
                      <h4 className="font-semibold text-gray-900">{key.name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
                          {key.key_prefix}
                        </code>
                        <Badge variant={key.is_active ? 'default' : 'destructive'} className="text-xs">
                          {key.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 mr-2">
                      <Switch
                        checked={key.is_active}
                        onCheckedChange={() => handleToggleActive(key.key_prefix, key.is_active)}
                      />
                      <Label className="text-xs">Active</Label>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50"
                      onClick={() => handleDeleteKey(key.key_prefix)}
                      data-testid={`delete-key-${key.key_prefix}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Usage Info */}
                <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Created: {new Date(key.created_at).toLocaleDateString('en-IN')}
                  </span>
                  <span>
                    Used: {key.usage_count || 0} times
                  </span>
                  {key.last_used_at && (
                    <span>
                      Last used: {new Date(key.last_used_at).toLocaleDateString('en-IN')}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Scopes: {(key.scopes || []).join(', ')}
                  </span>
                </div>

                {/* Webhook Section */}
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      Webhook URL (auto-sync on changes)
                    </Label>
                    <div className="flex gap-1">
                      {key.webhook_url && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleTestWebhook(key.key_prefix)}
                            disabled={testingWebhook === key.key_prefix}
                          >
                            {testingWebhook === key.key_prefix ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <Send className="h-3 w-3 mr-1" />
                            )}
                            Test
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleViewLogs(key.key_prefix)}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Logs
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingWebhook === key.key_prefix ? (
                    <div className="flex gap-2 mt-2">
                      <Input
                        defaultValue={key.webhook_url || ''}
                        placeholder="https://your-app.com/webhook"
                        className="text-xs h-8"
                        id={`webhook-input-${key.key_prefix}`}
                      />
                      <Button
                        size="sm"
                        className="h-8 bg-[#c9a962] text-black"
                        onClick={() => {
                          const input = document.getElementById(`webhook-input-${key.key_prefix}`);
                          handleUpdateWebhook(key.key_prefix, input.value);
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="mt-1 flex items-center gap-2 cursor-pointer group"
                      onClick={() => setEditingWebhook(key.key_prefix)}
                    >
                      {key.webhook_url ? (
                        <code className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded font-mono group-hover:bg-green-100">
                          {key.webhook_url}
                        </code>
                      ) : (
                        <span className="text-xs text-gray-400 group-hover:text-gray-600">
                          Click to add webhook URL...
                        </span>
                      )}
                    </div>
                  )}

                  {/* Webhook Logs */}
                  {webhookLogs[key.key_prefix] && (
                    <div className="mt-3 max-h-40 overflow-y-auto">
                      <p className="text-xs font-medium text-gray-500 mb-1">Recent Webhook Deliveries</p>
                      {webhookLogs[key.key_prefix].length === 0 ? (
                        <p className="text-xs text-gray-400">No deliveries yet</p>
                      ) : (
                        <div className="space-y-1">
                          {webhookLogs[key.key_prefix].map((log, i) => (
                            <div key={i} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${
                              log.status === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {log.status === 'success' ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <AlertTriangle className="h-3 w-3" />
                              )}
                              <span className="font-medium">{log.event}</span>
                              <span className="text-gray-400">|</span>
                              <span>{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                              {log.error && <span className="text-red-500 truncate max-w-xs">- {log.error}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#c9a962]" />
              {createdKey ? 'API Key Created' : 'Create New API Key'}
            </DialogTitle>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4 py-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm font-medium text-yellow-800 flex items-center gap-1 mb-2">
                  <AlertTriangle className="h-4 w-4" />
                  Save this key now. It will not be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className={`flex-1 text-sm font-mono bg-white p-2 rounded border ${showKey ? '' : 'tracking-widest'}`}>
                    {showKey ? createdKey.api_key : '************************************'}
                  </code>
                  <Button size="icon" variant="ghost" onClick={() => setShowKey(!showKey)}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(createdKey.api_key)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                className="w-full bg-[#c9a962] text-black"
                onClick={() => { setShowCreateDialog(false); setCreatedKey(null); }}
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div>
                <Label>Key Name</Label>
                <Input
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Ecommerce App, Mobile App"
                  className="mt-1"
                  data-testid="api-key-name-input"
                />
              </div>
              <div>
                <Label>Webhook URL (optional)</Label>
                <Input
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://your-app.com/api/webhook"
                  className="mt-1"
                  data-testid="api-key-webhook-input"
                />
                <p className="text-xs text-gray-500 mt-1">
                  We'll POST to this URL when Products, Styling, or Measurements change
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <Label className="text-xs font-medium text-gray-600">Access Scopes (Read-Only)</Label>
                <div className="flex gap-2 mt-2">
                  <Badge variant="secondary">Products</Badge>
                  <Badge variant="secondary">Style Options</Badge>
                  <Badge variant="secondary">Measurements</Badge>
                </div>
              </div>
              <Button
                className="w-full bg-[#c9a962] text-black"
                onClick={handleCreateKey}
                disabled={!newKeyName.trim()}
                data-testid="create-key-submit"
              >
                <Key className="h-4 w-4 mr-2" />
                Generate API Key
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
};

export default ApiKeysPage;
