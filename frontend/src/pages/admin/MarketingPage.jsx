import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Target, BarChart3, Globe, Facebook, Settings } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MarketingPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    // Site Branding
    site_name: 'Suits India',
    site_tagline: 'Premium Custom Tailoring',
    // Analytics
    meta_pixel_id: '',
    meta_pixel_enabled: false,
    ga4_measurement_id: '',
    ga4_enabled: false,
    // SEO
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    og_title: '',
    og_description: '',
    og_image: ''
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/marketing/settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings({ ...settings, ...response.data });
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
        `${API_URL}/marketing/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Marketing settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
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
          <Target className="h-8 w-8" />
          <h1 className="text-3xl font-bold">Marketing & SEO</h1>
        </div>

        <Tabs defaultValue="branding">
          <TabsList>
            <TabsTrigger value="branding">
              <Settings className="h-4 w-4 mr-2" />
              Site Branding
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <BarChart3 className="h-4 w-4 mr-2" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="seo">
              <Globe className="h-4 w-4 mr-2" />
              SEO Settings
            </TabsTrigger>
          </TabsList>

          {/* Site Branding Tab */}
          <TabsContent value="branding" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Site Branding</CardTitle>
                <CardDescription>
                  Configure your site name and tagline that appears in the browser tab
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Site Name</Label>
                  <Input
                    placeholder="e.g., Suits India"
                    value={settings.site_name}
                    onChange={(e) =>
                      setSettings({ ...settings, site_name: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This appears as the main title in the browser tab
                  </p>
                </div>
                <div>
                  <Label>Site Tagline</Label>
                  <Input
                    placeholder="e.g., Premium Custom Tailoring"
                    value={settings.site_tagline}
                    onChange={(e) =>
                      setSettings({ ...settings, site_tagline: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Appears after the site name: "Site Name | Tagline"
                  </p>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm font-medium">Preview:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Browser Tab: <span className="font-mono bg-background px-2 py-1 rounded">
                      {settings.site_name || 'Site Name'} | {settings.site_tagline || 'Tagline'}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
            
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Branding Settings'}
            </Button>
          </TabsContent>

          <TabsContent value="tracking" className="space-y-6 mt-6">
            {/* Meta (Facebook) Pixel */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Facebook className="h-6 w-6 text-blue-600" />
                    <div>
                      <CardTitle>Meta Pixel (Facebook)</CardTitle>
                      <CardDescription>
                        Track conversions and build audiences for Facebook ads
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.meta_pixel_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, meta_pixel_enabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Pixel ID</Label>
                  <Input
                    placeholder="Enter your Meta Pixel ID"
                    value={settings.meta_pixel_id}
                    onChange={(e) =>
                      setSettings({ ...settings, meta_pixel_id: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your Pixel ID in{' '}
                    <a
                      href="https://business.facebook.com/events_manager"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Meta Events Manager
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Google Analytics 4 */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="h-6 w-6 text-orange-500" />
                    <div>
                      <CardTitle>Google Analytics 4</CardTitle>
                      <CardDescription>
                        Track website traffic and user behavior
                      </CardDescription>
                    </div>
                  </div>
                  <Switch
                    checked={settings.ga4_enabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, ga4_enabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Measurement ID</Label>
                  <Input
                    placeholder="G-XXXXXXXXXX"
                    value={settings.ga4_measurement_id}
                    onChange={(e) =>
                      setSettings({ ...settings, ga4_measurement_id: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Find your Measurement ID in{' '}
                    <a
                      href="https://analytics.google.com/analytics/web/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Analytics
                    </a>{' '}
                    → Admin → Data Streams
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seo" className="space-y-6 mt-6">
            {/* Basic SEO */}
            <Card>
              <CardHeader>
                <CardTitle>Default Meta Tags</CardTitle>
                <CardDescription>
                  These will be used as defaults for all pages unless overridden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Site Title</Label>
                  <Input
                    placeholder="Suits India - Custom Tailored Suits"
                    value={settings.seo_title}
                    onChange={(e) =>
                      setSettings({ ...settings, seo_title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea
                    placeholder="Premium custom-tailored suits made to your exact measurements..."
                    value={settings.seo_description}
                    onChange={(e) =>
                      setSettings({ ...settings, seo_description: e.target.value })
                    }
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended: 150-160 characters
                  </p>
                </div>
                <div>
                  <Label>Keywords</Label>
                  <Input
                    placeholder="custom suits, tailored suits, bespoke clothing"
                    value={settings.seo_keywords}
                    onChange={(e) =>
                      setSettings({ ...settings, seo_keywords: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Comma-separated keywords
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Open Graph */}
            <Card>
              <CardHeader>
                <CardTitle>Social Media Preview</CardTitle>
                <CardDescription>
                  How your site appears when shared on social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>OG Title</Label>
                  <Input
                    placeholder="Suits India"
                    value={settings.og_title}
                    onChange={(e) =>
                      setSettings({ ...settings, og_title: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>OG Description</Label>
                  <Textarea
                    placeholder="Premium custom-tailored suits..."
                    value={settings.og_description}
                    onChange={(e) =>
                      setSettings({ ...settings, og_description: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div>
                  <Label>OG Image URL</Label>
                  <Input
                    placeholder="https://example.com/og-image.jpg"
                    value={settings.og_image}
                    onChange={(e) =>
                      setSettings({ ...settings, og_image: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Recommended size: 1200x630 pixels
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" disabled={saving}>
            {saving ? 'Saving...' : 'Save All Settings'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketingPage;
