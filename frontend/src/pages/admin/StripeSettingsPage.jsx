import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { CreditCard, Eye, EyeOff } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const StripeSettingsPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishableKey, setPublishableKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [showSecretKey, setShowSecretKey] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/stripe`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPublishableKey(response.data.publishable_key || '');
      // Don't show the actual secret key, just indicate if one is set
      setSecretKey('');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/settings/stripe`,
        { 
          publishable_key: publishableKey, 
          secret_key: secretKey || undefined 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Stripe settings saved successfully');
      setSecretKey('');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUseTestKeys = () => {
    setPublishableKey('pk_test_51QH5yTP0G3d7Qm9D5tCEKz8RDqw5P7gG0Z');
    setSecretKey('sk_test_51QH5yTP0G3d7Qm9DaZPQCJNhM8k7P8yQZLJ0jvxjX0xL');
    toast.info('Test keys loaded. Click Save to apply.');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          Loading...
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <CreditCard className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Stripe Payment Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stripe API Keys</CardTitle>
            <CardDescription>
              Configure your Stripe payment gateway. Get your keys from{' '}
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Dashboard
              </a>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Publishable Key</Label>
              <Input
                placeholder="pk_test_... or pk_live_..."
                value={publishableKey}
                onChange={(e) => setPublishableKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This key is safe to use in your frontend code
              </p>
            </div>

            <div className="space-y-2">
              <Label>Secret Key</Label>
              <div className="relative">
                <Input
                  type={showSecretKey ? 'text' : 'password'}
                  placeholder="sk_test_... or sk_live_..."
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowSecretKey(!showSecretKey)}
                >
                  {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this key secure and never share it publicly. Leave empty to keep existing key.
              </p>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Test Keys</h3>
                <Button variant="outline" size="sm" onClick={handleUseTestKeys}>
                  Use Test Keys
                </Button>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm font-mono">
                <p className="break-all">Publishable: pk_test_51QH5yTP0G3d7Qm9D5tCEKz8RDqw5P7gG0Z</p>
                <p className="break-all">Secret: sk_test_51QH5yTP0G3d7Qm9DaZPQCJNhM8k7P8yQZLJ0jvxjX0xL</p>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These are test keys for development. Replace with your live keys for production.
              </p>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} size="lg" disabled={saving}>
                {saving ? 'Saving...' : 'Save Stripe Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>How Stripe Payments Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">For Resellers:</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>When placing an order, resellers can choose "Bank Transfer" or "Online Payment"</li>
                <li>If "Online Payment" is selected, they'll be redirected to Stripe Checkout</li>
                <li>After successful payment, the order is automatically marked as paid</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Test Card Numbers:</h4>
              <div className="bg-muted p-3 rounded text-sm font-mono space-y-1">
                <p>Success: 4242 4242 4242 4242</p>
                <p>Decline: 4000 0000 0000 0002</p>
                <p>Any future expiry, any 3-digit CVC</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default StripeSettingsPage;
