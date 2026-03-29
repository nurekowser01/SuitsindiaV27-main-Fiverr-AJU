import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { Settings, Clock, Loader2, Users, Tags, Plus, Edit, Trash2, Save, GripVertical, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SettingsPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('order');
  
  // Order Settings
  const [orderSettings, setOrderSettings] = useState({
    edit_time_limit_minutes: 60,
    admin_visibility_delay_minutes: 60
  });

  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    site_name: 'Suits India',
    contact_email: 'tailorstailor.hk@gmail.com',
    contact_phone: '+91 79071 68498'
  });
  const [savingGeneral, setSavingGeneral] = useState(false);

  // Chat Settings
  const [chatSettings, setChatSettings] = useState({
    polling_interval_seconds: 5,
    max_file_size_mb: 2,
    enable_notifications: true
  });
  const [savingChat, setSavingChat] = useState(false);

  // Reseller Sources
  const [resellerSources, setResellerSources] = useState([]);
  const [loadingSources, setLoadingSources] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [sourceForm, setSourceForm] = useState({ name: '', description: '', is_active: true });

  // Order Statuses
  const [orderStatuses, setOrderStatuses] = useState([]);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingStatus, setEditingStatus] = useState(null);
  const [statusForm, setStatusForm] = useState({ 
    name: '', 
    display_name: '', 
    color: '#6b7280', 
    description: '', 
    is_active: true 
  });

  useEffect(() => {
    fetchOrderSettings();
    fetchGeneralSettings();
    fetchResellerSources();
    fetchOrderStatuses();
    fetchChatSettings();
  }, []);

  // =====================
  // CHAT SETTINGS
  // =====================
  const fetchChatSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/chat-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChatSettings(response.data);
    } catch (error) {
      console.error('Error fetching chat settings:', error);
    }
  };

  const saveChatSettings = async () => {
    setSavingChat(true);
    try {
      await axios.put(`${API_URL}/admin/chat-settings`, chatSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Chat settings saved successfully!');
    } catch (error) {
      console.error('Error saving chat settings:', error);
      toast.error('Failed to save chat settings');
    } finally {
      setSavingChat(false);
    }
  };

  // =====================
  // ORDER SETTINGS
  // =====================
  const fetchOrderSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/settings/order-config`);
      setOrderSettings(response.data);
    } catch (error) {
      console.error('Error fetching order settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrderSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/orders/settings/order-config`, orderSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order settings saved successfully');
    } catch (error) {
      console.error('Error saving order settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to save order settings');
    } finally {
      setSaving(false);
    }
  };

  // =====================
  // GENERAL SETTINGS
  // =====================
  const fetchGeneralSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/admin/general-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneralSettings(response.data);
    } catch (error) {
      console.error('Error fetching general settings:', error);
    }
  };

  const handleSaveGeneralSettings = async () => {
    setSavingGeneral(true);
    try {
      await axios.put(`${API_URL}/admin/general-settings`, generalSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('General settings saved successfully');
    } catch (error) {
      console.error('Error saving general settings:', error);
      toast.error(error.response?.data?.detail || 'Failed to save general settings');
    } finally {
      setSavingGeneral(false);
    }
  };

  // =====================
  // RESELLER SOURCES
  // =====================
  const fetchResellerSources = async () => {
    try {
      setLoadingSources(true);
      const response = await axios.get(`${API_URL}/admin/reseller-sources`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResellerSources(response.data);
    } catch (error) {
      console.error('Error fetching reseller sources:', error);
    } finally {
      setLoadingSources(false);
    }
  };

  const handleCreateSource = () => {
    setEditingSource(null);
    setSourceForm({ name: '', description: '', is_active: true });
    setShowSourceModal(true);
  };

  const handleEditSource = (source) => {
    setEditingSource(source);
    setSourceForm({ 
      name: source.name, 
      description: source.description || '', 
      is_active: source.is_active 
    });
    setShowSourceModal(true);
  };

  const handleSaveSource = async () => {
    if (!sourceForm.name.trim()) {
      toast.error('Source name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingSource) {
        await axios.put(
          `${API_URL}/admin/reseller-sources/${editingSource.id}`,
          sourceForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Source updated successfully');
      } else {
        await axios.post(
          `${API_URL}/admin/reseller-sources`,
          sourceForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Source created successfully');
      }
      setShowSourceModal(false);
      fetchResellerSources();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save source');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSource = async (source) => {
    if (!window.confirm(`Delete "${source.name}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API_URL}/admin/reseller-sources/${source.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Source deleted');
      fetchResellerSources();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete source');
    }
  };

  // =====================
  // ORDER STATUSES
  // =====================
  const fetchOrderStatuses = async () => {
    try {
      setLoadingStatuses(true);
      const response = await axios.get(`${API_URL}/admin/order-statuses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrderStatuses(response.data);
    } catch (error) {
      console.error('Error fetching order statuses:', error);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const handleCreateStatus = () => {
    setEditingStatus(null);
    setStatusForm({ name: '', display_name: '', color: '#6b7280', description: '', is_active: true });
    setShowStatusModal(true);
  };

  const handleEditStatus = (status) => {
    setEditingStatus(status);
    setStatusForm({ 
      name: status.name,
      display_name: status.display_name,
      color: status.color,
      description: status.description || '',
      is_active: status.is_active
    });
    setShowStatusModal(true);
  };

  const handleSaveStatus = async () => {
    if (!statusForm.display_name.trim()) {
      toast.error('Display name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingStatus) {
        await axios.put(
          `${API_URL}/admin/order-statuses/${editingStatus.id}`,
          statusForm,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Status updated successfully');
      } else {
        await axios.post(
          `${API_URL}/admin/order-statuses`,
          { ...statusForm, name: statusForm.display_name.toLowerCase().replace(/\s+/g, '_') },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Status created successfully');
      }
      setShowStatusModal(false);
      fetchOrderStatuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save status');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStatus = async (status) => {
    if (status.is_system) {
      toast.error('Cannot delete system statuses');
      return;
    }
    if (!window.confirm(`Delete "${status.display_name}"? This cannot be undone.`)) return;

    try {
      await axios.delete(`${API_URL}/admin/order-statuses/${status.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Status deleted');
      fetchOrderStatuses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete status');
    }
  };

  const colorOptions = [
    { name: 'Gray', value: '#6b7280' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Pink', value: '#ec4899' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-[#c9a962]" />
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a1a]">Settings</h1>
            <p className="text-[#666]">Manage business rules, sources, and order statuses</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="order" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Order Rules
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Reseller Sources
            </TabsTrigger>
            <TabsTrigger value="statuses" className="flex items-center gap-2">
              <Tags className="h-4 w-4" />
              Order Statuses
            </TabsTrigger>
          </TabsList>

          {/* ORDER RULES TAB */}
          <TabsContent value="order" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-[#c9a962]" />
                  Order Time Rules
                </CardTitle>
                <CardDescription>Configure order edit time limits and visibility rules</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="editTimeLimit">Reseller Edit Time Limit (minutes)</Label>
                        <Input 
                          id="editTimeLimit" 
                          type="number"
                          min="0"
                          value={orderSettings.edit_time_limit_minutes}
                          onChange={(e) => setOrderSettings(prev => ({
                            ...prev,
                            edit_time_limit_minutes: parseInt(e.target.value) || 0
                          }))}
                          data-testid="edit-time-limit-input"
                        />
                        <p className="text-xs text-gray-500">
                          Resellers can edit placed orders within this time. (60 min = 1 hour)
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="adminVisibilityDelay">Admin Visibility Delay (minutes)</Label>
                        <Input 
                          id="adminVisibilityDelay" 
                          type="number"
                          min="0"
                          value={orderSettings.admin_visibility_delay_minutes}
                          onChange={(e) => setOrderSettings(prev => ({
                            ...prev,
                            admin_visibility_delay_minutes: parseInt(e.target.value) || 0
                          }))}
                          data-testid="admin-visibility-delay-input"
                        />
                        <p className="text-xs text-gray-500">
                          Placed orders appear in admin panel after this delay.
                        </p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Order Rules Summary</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• WIP orders: Resellers can edit and delete</li>
                        <li>• Placed orders: Resellers can edit within {orderSettings.edit_time_limit_minutes} minutes</li>
                        <li>• Placed orders: Only Admin can delete</li>
                        <li>• Placed orders appear in Admin panel after {orderSettings.admin_visibility_delay_minutes} minutes</li>
                      </ul>
                    </div>
                    
                    <Button 
                      onClick={handleSaveOrderSettings}
                      disabled={saving}
                      className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                      data-testid="save-order-settings-btn"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Order Rules
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* General Settings - kept from original */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure your website's general settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name</Label>
                  <Input 
                    id="siteName" 
                    value={generalSettings.site_name}
                    onChange={(e) => setGeneralSettings(prev => ({
                      ...prev,
                      site_name: e.target.value
                    }))}
                    data-testid="site-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteEmail">Contact Email</Label>
                  <Input 
                    id="siteEmail" 
                    type="email" 
                    value={generalSettings.contact_email}
                    onChange={(e) => setGeneralSettings(prev => ({
                      ...prev,
                      contact_email: e.target.value
                    }))}
                    data-testid="contact-email-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sitePhone">Contact Phone</Label>
                  <Input 
                    id="sitePhone" 
                    type="tel" 
                    value={generalSettings.contact_phone}
                    onChange={(e) => setGeneralSettings(prev => ({
                      ...prev,
                      contact_phone: e.target.value
                    }))}
                    data-testid="contact-phone-input"
                  />
                </div>
                <Button 
                  onClick={handleSaveGeneralSettings}
                  disabled={savingGeneral}
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                  data-testid="save-general-settings-btn"
                >
                  {savingGeneral ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHAT SETTINGS TAB */}
          <TabsContent value="chat" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-[#c9a962]" />
                  Chat Configuration
                </CardTitle>
                <CardDescription>Configure chat polling interval and other settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="pollingInterval">Message Refresh Interval (seconds)</Label>
                    <Input 
                      id="pollingInterval"
                      type="number"
                      min="1"
                      max="60"
                      value={chatSettings.polling_interval_seconds}
                      onChange={(e) => setChatSettings(prev => ({
                        ...prev,
                        polling_interval_seconds: parseInt(e.target.value) || 5
                      }))}
                      data-testid="chat-polling-interval"
                    />
                    <p className="text-xs text-gray-500">How often to check for new messages (1-60 seconds)</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxFileSize">Max File Upload Size (MB)</Label>
                    <Input 
                      id="maxFileSize"
                      type="number"
                      min="1"
                      max="10"
                      value={chatSettings.max_file_size_mb}
                      onChange={(e) => setChatSettings(prev => ({
                        ...prev,
                        max_file_size_mb: parseInt(e.target.value) || 2
                      }))}
                      data-testid="chat-max-file-size"
                    />
                    <p className="text-xs text-gray-500">Maximum file size for chat attachments</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                  <div>
                    <Label>Enable Notifications</Label>
                    <p className="text-sm text-gray-500">Show notifications for new messages</p>
                  </div>
                  <Switch
                    checked={chatSettings.enable_notifications}
                    onCheckedChange={(checked) => setChatSettings(prev => ({
                      ...prev,
                      enable_notifications: checked
                    }))}
                    data-testid="chat-notifications-toggle"
                  />
                </div>
                
                <Button 
                  onClick={saveChatSettings}
                  disabled={savingChat}
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                  data-testid="save-chat-settings-btn"
                >
                  {savingChat ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Chat Settings
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RESELLER SOURCES TAB */}
          <TabsContent value="sources" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#c9a962]" />
                    Reseller Sources
                  </CardTitle>
                  <CardDescription>Manage how resellers find your business (e.g., Direct, Referral, Partner)</CardDescription>
                </div>
                <Button 
                  onClick={handleCreateSource}
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                  data-testid="add-source-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Source
                </Button>
              </CardHeader>
              <CardContent>
                {loadingSources ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
                  </div>
                ) : resellerSources.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No reseller sources configured</p>
                    <p className="text-sm">Add sources like "Direct", "Referral", "Partner" etc.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {resellerSources.map((source) => (
                      <div 
                        key={source.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{source.name}</p>
                            {source.description && (
                              <p className="text-sm text-gray-500">{source.description}</p>
                            )}
                          </div>
                          <Badge variant={source.is_active ? "default" : "secondary"}>
                            {source.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEditSource(source)}
                            data-testid={`edit-source-${source.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={() => handleDeleteSource(source)}
                            data-testid={`delete-source-${source.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ORDER STATUSES TAB */}
          <TabsContent value="statuses" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Tags className="h-5 w-5 text-[#c9a962]" />
                    Order Statuses
                  </CardTitle>
                  <CardDescription>Manage order workflow statuses. System statuses cannot be deleted.</CardDescription>
                </div>
                <Button 
                  onClick={handleCreateStatus}
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                  data-testid="add-status-btn"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Status
                </Button>
              </CardHeader>
              <CardContent>
                {loadingStatuses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
                  </div>
                ) : orderStatuses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No order statuses configured</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderStatuses.map((status) => (
                      <div 
                        key={status.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-6 h-6 rounded-full flex-shrink-0"
                            style={{ backgroundColor: status.color }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{status.display_name}</p>
                              {status.is_system && (
                                <Badge variant="outline" className="text-xs">System</Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 font-mono">{status.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={status.is_active ? "default" : "secondary"}>
                            {status.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleEditStatus(status)}
                            data-testid={`edit-status-${status.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {!status.is_system && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteStatus(status)}
                              data-testid={`delete-status-${status.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Source Modal */}
        <Dialog open={showSourceModal} onOpenChange={setShowSourceModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingSource ? 'Edit Source' : 'Add Reseller Source'}</DialogTitle>
              <DialogDescription>
                Configure where resellers come from (e.g., Direct, Referral, Partner)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Source Name *</Label>
                <Input
                  value={sourceForm.name}
                  onChange={(e) => setSourceForm({ ...sourceForm, name: e.target.value })}
                  placeholder="e.g., Direct, Referral, Partner"
                  data-testid="source-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={sourceForm.description}
                  onChange={(e) => setSourceForm({ ...sourceForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={sourceForm.is_active}
                  onCheckedChange={(checked) => setSourceForm({ ...sourceForm, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSourceModal(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveSource}
                disabled={saving}
                className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                data-testid="save-source-btn"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingSource ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Status Modal */}
        <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingStatus ? 'Edit Order Status' : 'Add Order Status'}</DialogTitle>
              <DialogDescription>
                Configure custom order workflow statuses
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Display Name *</Label>
                <Input
                  value={statusForm.display_name}
                  onChange={(e) => setStatusForm({ ...statusForm, display_name: e.target.value })}
                  placeholder="e.g., Quality Check, Ready for Pickup"
                  disabled={editingStatus?.is_system}
                  data-testid="status-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${
                        statusForm.color === color.value ? 'scale-110 border-gray-800' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setStatusForm({ ...statusForm, color: color.value })}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={statusForm.description}
                  onChange={(e) => setStatusForm({ ...statusForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={statusForm.is_active}
                  onCheckedChange={(checked) => setStatusForm({ ...statusForm, is_active: checked })}
                />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowStatusModal(false)}>Cancel</Button>
              <Button 
                onClick={handleSaveStatus}
                disabled={saving}
                className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                data-testid="save-status-btn"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {editingStatus ? 'Update' : 'Create'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
