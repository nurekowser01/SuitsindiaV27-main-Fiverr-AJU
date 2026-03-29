import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { Mail, Server, CheckCircle, Send, Eye, EyeOff, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EmailKeysPage = () => {
  const [settings, setSettings] = useState({
    email_provider: 'smtp',
    // SMTP (Google Workspace) settings
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    // Mailgun settings
    mailgun_api_key: '',
    mailgun_domain: '',
    // Common
    sender_email: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/api/admin/email-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to fetch');
      
      const data = await response.json();
      setSettings({...settings, ...data});
    } catch (error) {
      console.error('Error fetching email settings:', error);
      toast.error('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/api/admin/email-settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Failed to save');
      
      toast.success('Email settings saved successfully');
      fetchSettings();
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast.error('Failed to save email settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTesting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch(`${API_URL}/api/admin/email-settings/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send test email');
      }
      
      toast.success(data.message);
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Email Configuration</h1>
            <p className="text-gray-600 mt-2">
              Configure email provider for sending password reset and order confirmation emails
            </p>
          </div>

          <Tabs value={settings.email_provider} onValueChange={(value) => setSettings({...settings, email_provider: value})}>
            <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
              <TabsTrigger value="smtp" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Google Workspace
                {settings.email_provider === 'smtp' && <Badge variant="default" className="ml-2 bg-green-500">Active</Badge>}
              </TabsTrigger>
              <TabsTrigger value="mailgun" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Mailgun
                {settings.email_provider === 'mailgun' && <Badge variant="default" className="ml-2 bg-green-500">Active</Badge>}
              </TabsTrigger>
            </TabsList>

            {/* SMTP Configuration */}
            <TabsContent value="smtp">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Google Workspace SMTP Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-900">
                        <p className="font-semibold mb-2">How to get Google Workspace SMTP credentials:</p>
                        <ol className="list-decimal ml-4 space-y-1">
                          <li>Go to Google Admin Console → Security → App Passwords</li>
                          <li>Generate a new app password for "Mail"</li>
                          <li>Use your Google Workspace email and the generated password below</li>
                        </ol>
                        <p className="mt-2 text-xs">
                          <a href="https://support.google.com/accounts/answer/185833" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                            Learn more about app passwords →
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="smtp_host">SMTP Host</Label>
                      <Input
                        id="smtp_host"
                        type="text"
                        value={settings.smtp_host}
                        onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                        placeholder="smtp.gmail.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="smtp_port">SMTP Port</Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        value={settings.smtp_port}
                        onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                        placeholder="587"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_username">Email Address / Username</Label>
                    <Input
                      id="smtp_username"
                      type="email"
                      placeholder="noreply@yourdomain.com"
                      value={settings.smtp_username}
                      onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Your Google Workspace email address
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp_password">App Password</Label>
                    <div className="relative">
                      <Input
                        id="smtp_password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter Google App Password"
                        value={settings.smtp_password}
                        onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                        className="font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      16-character app password from Google (not your regular password)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender_email">Sender Email (Display)</Label>
                    <Input
                      id="sender_email"
                      type="email"
                      placeholder="noreply@yourdomain.com"
                      value={settings.sender_email}
                      onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Email address shown as sender (usually same as username)
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Mailgun Configuration */}
            <TabsContent value="mailgun">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Mailgun Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-yellow-900">
                      <strong>Note:</strong> Sandbox domains can only send to authorized recipients. 
                      For production, verify your own domain in Mailgun dashboard.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mailgun_api_key">Mailgun API Key</Label>
                    <div className="relative">
                      <Input
                        id="mailgun_api_key"
                        type={showApiKey ? 'text' : 'password'}
                        placeholder="key-xxxxxxxxxxxxx"
                        value={settings.mailgun_api_key}
                        onChange={(e) => setSettings({ ...settings, mailgun_api_key: e.target.value })}
                        className="font-mono text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Find in Mailgun Dashboard → Settings → API Keys
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mailgun_domain">Mailgun Domain</Label>
                    <Input
                      id="mailgun_domain"
                      type="text"
                      placeholder="mail.yourdomain.com or sandbox..."
                      value={settings.mailgun_domain}
                      onChange={(e) => setSettings({ ...settings, mailgun_domain: e.target.value })}
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-gray-500">
                      Your verified domain or sandbox domain
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sender_email_mailgun">Sender Email</Label>
                    <Input
                      id="sender_email_mailgun"
                      type="email"
                      placeholder="noreply@yourdomain.com"
                      value={settings.sender_email}
                      onChange={(e) => setSettings({ ...settings, sender_email: e.target.value })}
                    />
                    <p className="text-sm text-gray-500">
                      Must match your verified Mailgun domain
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-6 flex justify-between items-center">
            <Button 
              variant="outline" 
              onClick={handleTestEmail} 
              disabled={testing}
              className="flex items-center gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {testing ? 'Sending...' : 'Send Test Email'}
            </Button>
            
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Email Settings'
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default EmailKeysPage;
