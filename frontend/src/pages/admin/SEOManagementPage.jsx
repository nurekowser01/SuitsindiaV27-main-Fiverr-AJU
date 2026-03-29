import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Globe, 
  FileText, 
  Code, 
  Map, 
  Settings,
  Save,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SEOManagementPage = () => {
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Global SEO State
  const [globalSeo, setGlobalSeo] = useState({
    site_title: '',
    site_title_separator: ' | ',
    site_title_suffix: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    og_type: 'website',
    twitter_card: 'summary_large_image',
    twitter_site: '',
    canonical_domain: '',
    default_index: true,
    default_follow: true,
    structured_data_enabled: true,
    sitemap_enabled: true,
    organization_schema: {
      name: '',
      logo: '',
      url: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        postal_code: ''
      },
      social_links: []
    }
  });

  // Tracking State
  const [tracking, setTracking] = useState({
    ga4_measurement_id: '',
    ga4_enabled: false,
    meta_pixel_id: '',
    meta_pixel_enabled: false,
    gtm_container_id: '',
    gtm_enabled: false,
    linkedin_partner_id: '',
    linkedin_enabled: false,
    google_site_verification: '',
    bing_site_verification: '',
    custom_head_scripts: '',
    custom_body_start_scripts: '',
    custom_body_end_scripts: ''
  });

  // Robots State
  const [robots, setRobots] = useState({
    allow_all: true,
    disallow_paths: [],
    allow_paths: [],
    crawl_delay: null,
    custom_rules: '',
    sitemap_url: ''
  });

  // Page SEO State
  const [pageSeoList, setPageSeoList] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [pageSeo, setPageSeo] = useState({});

  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [globalRes, trackingRes, robotsRes, pagesRes] = await Promise.all([
        axios.get(`${API_URL}/seo/global`),
        axios.get(`${API_URL}/seo/tracking`),
        axios.get(`${API_URL}/seo/robots-config`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/seo/pages`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (globalRes.data) setGlobalSeo(prev => ({ ...prev, ...globalRes.data }));
      if (trackingRes.data) setTracking(prev => ({ ...prev, ...trackingRes.data }));
      if (robotsRes.data) setRobots(prev => ({ ...prev, ...robotsRes.data }));
      if (pagesRes.data) setPageSeoList(pagesRes.data);
    } catch (error) {
      console.error('Error fetching SEO data:', error);
      toast.error('Failed to load SEO settings');
    } finally {
      setLoading(false);
    }
  };

  const saveGlobalSeo = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/seo/global`, globalSeo, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Global SEO settings saved');
    } catch (error) {
      toast.error('Failed to save global SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const saveTracking = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/seo/tracking`, tracking, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Tracking settings saved');
    } catch (error) {
      toast.error('Failed to save tracking settings');
    } finally {
      setSaving(false);
    }
  };

  const saveRobots = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/seo/robots-config`, robots, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Robots configuration saved');
    } catch (error) {
      toast.error('Failed to save robots configuration');
    } finally {
      setSaving(false);
    }
  };

  const savePageSeo = async () => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/seo/pages/${selectedPage.page_type}/${selectedPage.page_slug}`,
        pageSeo,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`SEO settings for ${selectedPage.page_slug} saved`);
      fetchAllData();
    } catch (error) {
      toast.error('Failed to save page SEO settings');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e, field, setter) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`${API_URL}/seo/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.url) {
        setter(prev => ({ ...prev, [field]: response.data.url }));
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    }
  };

  const selectPage = (page) => {
    setSelectedPage(page);
    setPageSeo({
      title: page.title || '',
      meta_description: page.meta_description || '',
      meta_keywords: page.meta_keywords || '',
      canonical_url: page.canonical_url || '',
      og_title: page.og_title || '',
      og_description: page.og_description || '',
      og_image: page.og_image || '',
      index: page.index,
      follow: page.follow,
      priority: page.priority || 0.5,
      changefreq: page.changefreq || 'weekly',
      include_in_sitemap: page.include_in_sitemap !== false,
      custom_head_scripts: page.custom_head_scripts || ''
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6" data-testid="seo-management-page">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Globe className="h-6 w-6" />
              SEO & Marketing
            </h1>
            <p className="text-gray-500 mt-1">
              Manage all SEO settings, tracking scripts, and sitemap configuration
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <strong>Dynamic SEO System:</strong> All settings are stored in the database and injected into HTML responses server-side for optimal SEO performance with CSR architecture.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="global" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Global SEO
            </TabsTrigger>
            <TabsTrigger value="pages" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Page SEO
            </TabsTrigger>
            <TabsTrigger value="tracking" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Tracking
            </TabsTrigger>
            <TabsTrigger value="sitemap" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Sitemap & Robots
            </TabsTrigger>
          </TabsList>

          {/* Global SEO Tab */}
          <TabsContent value="global" className="space-y-6">
            {/* Basic Meta */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Meta Tags</CardTitle>
                <CardDescription>Default meta tags used across all pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Site Title</Label>
                    <Input
                      value={globalSeo.site_title}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, site_title: e.target.value }))}
                      placeholder="Your Site Name"
                    />
                  </div>
                  <div>
                    <Label>Title Separator</Label>
                    <Input
                      value={globalSeo.site_title_separator}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, site_title_separator: e.target.value }))}
                      placeholder=" | "
                    />
                  </div>
                  <div>
                    <Label>Title Suffix</Label>
                    <Input
                      value={globalSeo.site_title_suffix}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, site_title_suffix: e.target.value }))}
                      placeholder="Brand Name"
                    />
                  </div>
                </div>
                <div>
                  <Label>Default Meta Description</Label>
                  <Textarea
                    value={globalSeo.meta_description}
                    onChange={(e) => setGlobalSeo(prev => ({ ...prev, meta_description: e.target.value }))}
                    placeholder="Default description for pages without custom descriptions"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 mt-1">Recommended: 150-160 characters</p>
                </div>
                <div>
                  <Label>Meta Keywords</Label>
                  <Input
                    value={globalSeo.meta_keywords}
                    onChange={(e) => setGlobalSeo(prev => ({ ...prev, meta_keywords: e.target.value }))}
                    placeholder="keyword1, keyword2, keyword3"
                  />
                </div>
                <div>
                  <Label>Canonical Domain</Label>
                  <Input
                    value={globalSeo.canonical_domain}
                    onChange={(e) => setGlobalSeo(prev => ({ ...prev, canonical_domain: e.target.value }))}
                    placeholder="https://yourdomain.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used for canonical URLs and sitemap generation</p>
                </div>
              </CardContent>
            </Card>

            {/* Open Graph */}
            <Card>
              <CardHeader>
                <CardTitle>Open Graph (Social Sharing)</CardTitle>
                <CardDescription>Default OG tags for Facebook, LinkedIn, etc.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>OG Title</Label>
                    <Input
                      value={globalSeo.og_title}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, og_title: e.target.value }))}
                      placeholder="Title for social sharing"
                    />
                  </div>
                  <div>
                    <Label>OG Type</Label>
                    <select
                      value={globalSeo.og_type}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, og_type: e.target.value }))}
                      className="w-full h-10 px-3 border rounded-md"
                    >
                      <option value="website">Website</option>
                      <option value="article">Article</option>
                      <option value="product">Product</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label>OG Description</Label>
                  <Textarea
                    value={globalSeo.og_description}
                    onChange={(e) => setGlobalSeo(prev => ({ ...prev, og_description: e.target.value }))}
                    placeholder="Description for social sharing"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>OG Image</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      value={globalSeo.og_image}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, og_image: e.target.value }))}
                      placeholder="/api/seo/images/og_image.jpg or https://..."
                      className="flex-1"
                    />
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, 'og_image', setGlobalSeo)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Button variant="outline" size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended size: 1200x630 pixels</p>
                  {globalSeo.og_image && (
                    <div className="mt-2">
                      <img
                        src={globalSeo.og_image.startsWith('/') ? `${process.env.REACT_APP_BACKEND_URL}${globalSeo.og_image}` : globalSeo.og_image}
                        alt="OG Preview"
                        className="h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Twitter */}
            <Card>
              <CardHeader>
                <CardTitle>Twitter Cards</CardTitle>
                <CardDescription>Settings for Twitter/X sharing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Twitter Card Type</Label>
                    <select
                      value={globalSeo.twitter_card}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, twitter_card: e.target.value }))}
                      className="w-full h-10 px-3 border rounded-md"
                    >
                      <option value="summary">Summary</option>
                      <option value="summary_large_image">Summary Large Image</option>
                    </select>
                  </div>
                  <div>
                    <Label>Twitter @username</Label>
                    <Input
                      value={globalSeo.twitter_site}
                      onChange={(e) => setGlobalSeo(prev => ({ ...prev, twitter_site: e.target.value }))}
                      placeholder="@yourusername"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Indexing */}
            <Card>
              <CardHeader>
                <CardTitle>Indexing Defaults</CardTitle>
                <CardDescription>Default robots directives for all pages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Default Index</Label>
                    <p className="text-xs text-gray-500">Allow search engines to index pages by default</p>
                  </div>
                  <Switch
                    checked={globalSeo.default_index}
                    onCheckedChange={(v) => setGlobalSeo(prev => ({ ...prev, default_index: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Default Follow</Label>
                    <p className="text-xs text-gray-500">Allow search engines to follow links by default</p>
                  </div>
                  <Switch
                    checked={globalSeo.default_follow}
                    onCheckedChange={(v) => setGlobalSeo(prev => ({ ...prev, default_follow: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Structured Data (Schema.org)</Label>
                    <p className="text-xs text-gray-500">Enable JSON-LD structured data injection</p>
                  </div>
                  <Switch
                    checked={globalSeo.structured_data_enabled}
                    onCheckedChange={(v) => setGlobalSeo(prev => ({ ...prev, structured_data_enabled: v }))}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sitemap Generation</Label>
                    <p className="text-xs text-gray-500">Enable dynamic sitemap.xml generation</p>
                  </div>
                  <Switch
                    checked={globalSeo.sitemap_enabled}
                    onCheckedChange={(v) => setGlobalSeo(prev => ({ ...prev, sitemap_enabled: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Organization Schema */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Schema</CardTitle>
                <CardDescription>Structured data for your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Organization Name</Label>
                    <Input
                      value={globalSeo.organization_schema?.name || ''}
                      onChange={(e) => setGlobalSeo(prev => ({
                        ...prev,
                        organization_schema: { ...prev.organization_schema, name: e.target.value }
                      }))}
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <Label>Website URL</Label>
                    <Input
                      value={globalSeo.organization_schema?.url || ''}
                      onChange={(e) => setGlobalSeo(prev => ({
                        ...prev,
                        organization_schema: { ...prev.organization_schema, url: e.target.value }
                      }))}
                      placeholder="https://yourdomain.com"
                    />
                  </div>
                  <div>
                    <Label>Contact Email</Label>
                    <Input
                      value={globalSeo.organization_schema?.contact_email || ''}
                      onChange={(e) => setGlobalSeo(prev => ({
                        ...prev,
                        organization_schema: { ...prev.organization_schema, contact_email: e.target.value }
                      }))}
                      placeholder="contact@yourdomain.com"
                    />
                  </div>
                  <div>
                    <Label>Contact Phone</Label>
                    <Input
                      value={globalSeo.organization_schema?.contact_phone || ''}
                      onChange={(e) => setGlobalSeo(prev => ({
                        ...prev,
                        organization_schema: { ...prev.organization_schema, contact_phone: e.target.value }
                      }))}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
                <div>
                  <Label>Organization Description</Label>
                  <Textarea
                    value={globalSeo.organization_schema?.description || ''}
                    onChange={(e) => setGlobalSeo(prev => ({
                      ...prev,
                      organization_schema: { ...prev.organization_schema, description: e.target.value }
                    }))}
                    placeholder="Brief description of your organization"
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Logo URL</Label>
                  <Input
                    value={globalSeo.organization_schema?.logo || ''}
                    onChange={(e) => setGlobalSeo(prev => ({
                      ...prev,
                      organization_schema: { ...prev.organization_schema, logo: e.target.value }
                    }))}
                    placeholder="https://yourdomain.com/logo.png"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveGlobalSeo} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Global Settings
              </Button>
            </div>
          </TabsContent>

          {/* Page SEO Tab */}
          <TabsContent value="pages" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Page List */}
              <Card className="md:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Static Pages</h4>
                    {pageSeoList.filter(p => p.page_type === 'static').map((page) => (
                      <button
                        key={page.page_slug}
                        onClick={() => selectPage(page)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between ${
                          selectedPage?.page_slug === page.page_slug 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <span>{page.page_name || page.page_slug}</span>
                        {page.title && <CheckCircle className="h-3 w-3 text-green-500" />}
                      </button>
                    ))}
                  </div>
                  {pageSeoList.filter(p => p.page_type === 'product').length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Products</h4>
                      {pageSeoList.filter(p => p.page_type === 'product').map((page) => (
                        <button
                          key={page.page_slug}
                          onClick={() => selectPage(page)}
                          className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                            selectedPage?.page_slug === page.page_slug 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {page.page_slug}
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Page SEO Editor */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedPage ? `SEO: ${selectedPage.page_name || selectedPage.page_slug}` : 'Select a Page'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPage ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Page Title</Label>
                        <Input
                          value={pageSeo.title || ''}
                          onChange={(e) => setPageSeo(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Custom page title"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty to use page name + site suffix</p>
                      </div>
                      <div>
                        <Label>Meta Description</Label>
                        <Textarea
                          value={pageSeo.meta_description || ''}
                          onChange={(e) => setPageSeo(prev => ({ ...prev, meta_description: e.target.value }))}
                          placeholder="Custom meta description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label>Meta Keywords</Label>
                        <Input
                          value={pageSeo.meta_keywords || ''}
                          onChange={(e) => setPageSeo(prev => ({ ...prev, meta_keywords: e.target.value }))}
                          placeholder="keyword1, keyword2"
                        />
                      </div>
                      <div>
                        <Label>Canonical URL Override</Label>
                        <Input
                          value={pageSeo.canonical_url || ''}
                          onChange={(e) => setPageSeo(prev => ({ ...prev, canonical_url: e.target.value }))}
                          placeholder="Leave empty for auto-generated"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>OG Title</Label>
                          <Input
                            value={pageSeo.og_title || ''}
                            onChange={(e) => setPageSeo(prev => ({ ...prev, og_title: e.target.value }))}
                            placeholder="Social sharing title"
                          />
                        </div>
                        <div>
                          <Label>OG Image</Label>
                          <Input
                            value={pageSeo.og_image || ''}
                            onChange={(e) => setPageSeo(prev => ({ ...prev, og_image: e.target.value }))}
                            placeholder="Image URL"
                          />
                        </div>
                      </div>
                      <div>
                        <Label>OG Description</Label>
                        <Textarea
                          value={pageSeo.og_description || ''}
                          onChange={(e) => setPageSeo(prev => ({ ...prev, og_description: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <Label>Index this page</Label>
                          <Switch
                            checked={pageSeo.index !== false}
                            onCheckedChange={(v) => setPageSeo(prev => ({ ...prev, index: v }))}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <Label>Follow links</Label>
                          <Switch
                            checked={pageSeo.follow !== false}
                            onCheckedChange={(v) => setPageSeo(prev => ({ ...prev, follow: v }))}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Sitemap Priority</Label>
                          <Input
                            type="number"
                            min="0"
                            max="1"
                            step="0.1"
                            value={pageSeo.priority || 0.5}
                            onChange={(e) => setPageSeo(prev => ({ ...prev, priority: parseFloat(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label>Change Frequency</Label>
                          <select
                            value={pageSeo.changefreq || 'weekly'}
                            onChange={(e) => setPageSeo(prev => ({ ...prev, changefreq: e.target.value }))}
                            className="w-full h-10 px-3 border rounded-md"
                          >
                            <option value="always">Always</option>
                            <option value="hourly">Hourly</option>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                            <option value="never">Never</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <Label>Include in Sitemap</Label>
                        <Switch
                          checked={pageSeo.include_in_sitemap !== false}
                          onCheckedChange={(v) => setPageSeo(prev => ({ ...prev, include_in_sitemap: v }))}
                        />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={savePageSeo} disabled={saving}>
                          {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Page SEO
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">Select a page from the list to edit its SEO settings</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tracking Tab */}
          <TabsContent value="tracking" className="space-y-6">
            {/* Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Analytics & Tracking</CardTitle>
                <CardDescription>Configure tracking pixels and analytics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* GA4 */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold">G</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Google Analytics 4</h4>
                        <p className="text-sm text-gray-500">Track website visitors and behavior</p>
                      </div>
                    </div>
                    <Switch
                      checked={tracking.ga4_enabled}
                      onCheckedChange={(v) => setTracking(prev => ({ ...prev, ga4_enabled: v }))}
                    />
                  </div>
                  {tracking.ga4_enabled && (
                    <div>
                      <Label>Measurement ID</Label>
                      <Input
                        value={tracking.ga4_measurement_id}
                        onChange={(e) => setTracking(prev => ({ ...prev, ga4_measurement_id: e.target.value }))}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                  )}
                </div>

                {/* Meta Pixel */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">f</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Meta Pixel (Facebook)</h4>
                        <p className="text-sm text-gray-500">Track conversions from Meta ads</p>
                      </div>
                    </div>
                    <Switch
                      checked={tracking.meta_pixel_enabled}
                      onCheckedChange={(v) => setTracking(prev => ({ ...prev, meta_pixel_enabled: v }))}
                    />
                  </div>
                  {tracking.meta_pixel_enabled && (
                    <div>
                      <Label>Pixel ID</Label>
                      <Input
                        value={tracking.meta_pixel_id}
                        onChange={(e) => setTracking(prev => ({ ...prev, meta_pixel_id: e.target.value }))}
                        placeholder="123456789012345"
                      />
                    </div>
                  )}
                </div>

                {/* GTM */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">GTM</span>
                      </div>
                      <div>
                        <h4 className="font-medium">Google Tag Manager</h4>
                        <p className="text-sm text-gray-500">Manage all marketing tags in one place</p>
                      </div>
                    </div>
                    <Switch
                      checked={tracking.gtm_enabled}
                      onCheckedChange={(v) => setTracking(prev => ({ ...prev, gtm_enabled: v }))}
                    />
                  </div>
                  {tracking.gtm_enabled && (
                    <div>
                      <Label>Container ID</Label>
                      <Input
                        value={tracking.gtm_container_id}
                        onChange={(e) => setTracking(prev => ({ ...prev, gtm_container_id: e.target.value }))}
                        placeholder="GTM-XXXXXXX"
                      />
                    </div>
                  )}
                </div>

                {/* LinkedIn */}
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 font-bold">in</span>
                      </div>
                      <div>
                        <h4 className="font-medium">LinkedIn Insight Tag</h4>
                        <p className="text-sm text-gray-500">Track LinkedIn ad conversions</p>
                      </div>
                    </div>
                    <Switch
                      checked={tracking.linkedin_enabled}
                      onCheckedChange={(v) => setTracking(prev => ({ ...prev, linkedin_enabled: v }))}
                    />
                  </div>
                  {tracking.linkedin_enabled && (
                    <div>
                      <Label>Partner ID</Label>
                      <Input
                        value={tracking.linkedin_partner_id}
                        onChange={(e) => setTracking(prev => ({ ...prev, linkedin_partner_id: e.target.value }))}
                        placeholder="123456"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Verification */}
            <Card>
              <CardHeader>
                <CardTitle>Search Console Verification</CardTitle>
                <CardDescription>Verify ownership with search engines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Google Search Console</Label>
                  <Input
                    value={tracking.google_site_verification}
                    onChange={(e) => setTracking(prev => ({ ...prev, google_site_verification: e.target.value }))}
                    placeholder="Enter verification code (content value only)"
                  />
                </div>
                <div>
                  <Label>Bing Webmaster Tools</Label>
                  <Input
                    value={tracking.bing_site_verification}
                    onChange={(e) => setTracking(prev => ({ ...prev, bing_site_verification: e.target.value }))}
                    placeholder="Enter verification code"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Custom Scripts */}
            <Card>
              <CardHeader>
                <CardTitle>Custom Scripts</CardTitle>
                <CardDescription>Add custom tracking or marketing scripts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Custom Head Scripts</Label>
                  <Textarea
                    value={tracking.custom_head_scripts}
                    onChange={(e) => setTracking(prev => ({ ...prev, custom_head_scripts: e.target.value }))}
                    placeholder="<script>...</script>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Injected into &lt;head&gt; section</p>
                </div>
                <div>
                  <Label>Body Start Scripts</Label>
                  <Textarea
                    value={tracking.custom_body_start_scripts}
                    onChange={(e) => setTracking(prev => ({ ...prev, custom_body_start_scripts: e.target.value }))}
                    placeholder="<noscript>...</noscript>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Injected right after &lt;body&gt; opening</p>
                </div>
                <div>
                  <Label>Body End Scripts</Label>
                  <Textarea
                    value={tracking.custom_body_end_scripts}
                    onChange={(e) => setTracking(prev => ({ ...prev, custom_body_end_scripts: e.target.value }))}
                    placeholder="<script>...</script>"
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">Injected before &lt;/body&gt; closing</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveTracking} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Tracking Settings
              </Button>
            </div>
          </TabsContent>

          {/* Sitemap & Robots Tab */}
          <TabsContent value="sitemap" className="space-y-6">
            {/* Sitemap */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Sitemap</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}/api/sitemap.xml`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Sitemap
                    </a>
                  </Button>
                </CardTitle>
                <CardDescription>Dynamic XML sitemap generated from database</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Sitemap is automatically generated</span>
                  </div>
                  <p className="text-sm text-green-700 mt-2">
                    Your sitemap includes all static pages, products, fabrics, and categories.
                    Toggle "Include in Sitemap" on individual pages to exclude them.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Robots.txt */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Robots.txt Configuration</span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={`${process.env.REACT_APP_BACKEND_URL}/api/robots.txt`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View robots.txt
                    </a>
                  </Button>
                </CardTitle>
                <CardDescription>Control how search engines crawl your site</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <Label>Allow All Crawling</Label>
                    <p className="text-xs text-gray-500">Allow search engines to crawl all pages</p>
                  </div>
                  <Switch
                    checked={robots.allow_all}
                    onCheckedChange={(v) => setRobots(prev => ({ ...prev, allow_all: v }))}
                  />
                </div>
                <div>
                  <Label>Disallow Paths (one per line)</Label>
                  <Textarea
                    value={(robots.disallow_paths || []).join('\n')}
                    onChange={(e) => setRobots(prev => ({ 
                      ...prev, 
                      disallow_paths: e.target.value.split('\n').filter(p => p.trim()) 
                    }))}
                    placeholder="/admin/&#10;/api/&#10;/private/"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
                <div>
                  <Label>Crawl Delay (seconds)</Label>
                  <Input
                    type="number"
                    value={robots.crawl_delay || ''}
                    onChange={(e) => setRobots(prev => ({ 
                      ...prev, 
                      crawl_delay: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    placeholder="Optional - leave empty for no delay"
                  />
                </div>
                <div>
                  <Label>Sitemap URL</Label>
                  <Input
                    value={robots.sitemap_url || ''}
                    onChange={(e) => setRobots(prev => ({ ...prev, sitemap_url: e.target.value }))}
                    placeholder="https://yourdomain.com/sitemap.xml"
                  />
                </div>
                <div>
                  <Label>Custom Rules</Label>
                  <Textarea
                    value={robots.custom_rules || ''}
                    onChange={(e) => setRobots(prev => ({ ...prev, custom_rules: e.target.value }))}
                    placeholder="# Add custom robots.txt rules here&#10;User-agent: Googlebot&#10;Allow: /"
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button onClick={saveRobots} disabled={saving}>
                {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Robots Configuration
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SEOManagementPage;
