import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, 
  Save,
  Palette,
  DollarSign,
  Building2,
  Image,
  Loader2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  CreditCard,
  Users,
  Plus,
  Edit,
  Trash2,
  UserPlus,
  Key
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const RESELLER_ID = 'default'; // Fallback only, overridden by user email in useEffect

const ResellerSettingsPage = () => {
  const navigate = useNavigate();
  const { token, user, isStaff, getParentResellerEmail } = useAuth();
  const resellerId = (isStaff() ? getParentResellerEmail() : user?.email) || 'default';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [showStripeSecretKey, setShowStripeSecretKey] = useState(false);
  
  // Staff management state
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [staffForm, setStaffForm] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    margins: {
      cmt_margin: 0,
      fabric_margin: 0,
      styling_margin: 0,
      shipping_margin: 0
    }
  });
  const [showStaffPassword, setShowStaffPassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [settings, setSettings] = useState({
    company_name: 'Suits India',
    logo_url: '',
    banner_url: '',
    show_pricing: true,
    cost_view_secret_code: '',
    // Stripe configuration for customer payments
    stripe_publishable_key: '',
    stripe_secret_key: '',
    stripe_enabled: false,
    margins: {
      base_product_margin: 0,
      fabric_margin: 0,
      style_options_margin: 0
    },
    theme: {
      primary_color: '#c9a962',
      secondary_color: '#1a2744',
      button_color: '#c9a962',
      text_color: '#ffffff',
      background_color: '#0f1829'
    }
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/reseller-settings/${resellerId}`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/reseller-settings/${resellerId}`, settings);
      toast.success('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateBranding = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const updateMargin = (field, value) => {
    setSettings(prev => ({
      ...prev,
      margins: { ...prev.margins, [field]: parseFloat(value) || 0 }
    }));
  };

  const updateTheme = (field, value) => {
    setSettings(prev => ({
      ...prev,
      theme: { ...prev.theme, [field]: value }
    }));
  };

  // ==================
  // Staff Management Functions
  // ==================

  const fetchStaff = async () => {
    try {
      setStaffLoading(true);
      const response = await axios.get(`${API_URL}/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStaffList(response.data);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff members');
    } finally {
      setStaffLoading(false);
    }
  };

  const openStaffModal = (staff = null) => {
    if (staff) {
      setEditingStaff(staff);
      setStaffForm({
        email: staff.email,
        password: '',
        full_name: staff.full_name || '',
        phone: staff.phone || '',
        margins: staff.margins || {
          cmt_margin: 0,
          fabric_margin: 0,
          styling_margin: 0,
          shipping_margin: 0
        }
      });
    } else {
      setEditingStaff(null);
      setStaffForm({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        margins: {
          cmt_margin: 0,
          fabric_margin: 0,
          styling_margin: 0,
          shipping_margin: 0
        }
      });
    }
    setShowStaffPassword(false);
    setStaffModalOpen(true);
  };

  const handleSaveStaff = async () => {
    try {
      setSaving(true);
      
      if (editingStaff) {
        // Update existing staff
        await axios.put(`${API_URL}/staff/${editingStaff.email}`, {
          full_name: staffForm.full_name,
          phone: staffForm.phone,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Update margins separately
        await axios.patch(`${API_URL}/staff/${editingStaff.email}/margins`, staffForm.margins, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Staff member updated!');
      } else {
        // Create new staff
        if (!staffForm.email || !staffForm.password || !staffForm.full_name) {
          toast.error('Please fill in all required fields');
          setSaving(false);
          return;
        }
        
        await axios.post(`${API_URL}/staff`, {
          email: staffForm.email,
          password: staffForm.password,
          full_name: staffForm.full_name,
          phone: staffForm.phone,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Then update margins
        await axios.patch(`${API_URL}/staff/${staffForm.email}/margins`, staffForm.margins, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        toast.success('Staff member created!');
      }
      
      setStaffModalOpen(false);
      fetchStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error(error.response?.data?.detail || 'Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      setSaving(true);
      await axios.patch(`${API_URL}/staff/${selectedStaffForPassword}/password`, {
        password: newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Password updated!');
      setPasswordModalOpen(false);
      setNewPassword('');
      setSelectedStaffForPassword(null);
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async () => {
    try {
      setSaving(true);
      await axios.delete(`${API_URL}/staff/${staffToDelete}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Staff member deactivated');
      setDeleteModalOpen(false);
      setStaffToDelete(null);
      fetchStaff();
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Failed to deactivate staff member');
    } finally {
      setSaving(false);
    }
  };

  const updateStaffMargin = (field, value) => {
    setStaffForm(prev => ({
      ...prev,
      margins: { ...prev.margins, [field]: parseFloat(value) || 0 }
    }));
  };

  // Fetch staff on mount
  useEffect(() => {
    if (!isStaff()) {
      fetchStaff();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  // Staff should not see settings page
  if (isStaff()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-500 mb-4">Settings are managed by your reseller.</p>
            <Button onClick={() => navigate('/reseller/dashboard')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">Portal Settings</h1>
            <p className="text-sm text-gray-500">Customize your white-label portal</p>
          </div>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#c9a962] hover:bg-[#b89952] text-black"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="branding" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Staff</span>
            </TabsTrigger>
            <TabsTrigger value="margins" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Margins</span>
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Payments</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#c9a962]" />
                  Company Branding
                </CardTitle>
                <CardDescription>
                  Customize your company name, logo, and banner for white-label experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => updateBranding('company_name', e.target.value)}
                    placeholder="Your Company Name"
                    data-testid="company-name-input"
                  />
                  <p className="text-xs text-gray-500">
                    This will replace "Suits India" throughout the portal
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <div className="flex gap-3">
                    <Input
                      value={settings.logo_url}
                      onChange={(e) => updateBranding('logo_url', e.target.value)}
                      placeholder="https://your-logo-url.com/logo.png"
                      className="flex-1"
                      data-testid="logo-url-input"
                    />
                    <Button variant="outline">
                      <Image className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {settings.logo_url && (
                    <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">Preview:</p>
                      <img 
                        src={settings.logo_url} 
                        alt="Logo Preview"
                        className="h-12 object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Banner Image URL</Label>
                  <div className="flex gap-3">
                    <Input
                      value={settings.banner_url}
                      onChange={(e) => updateBranding('banner_url', e.target.value)}
                      placeholder="https://your-banner-url.com/banner.jpg"
                      className="flex-1"
                      data-testid="banner-url-input"
                    />
                    <Button variant="outline">
                      <Image className="h-4 w-4 mr-2" />
                      Upload
                    </Button>
                  </div>
                  {settings.banner_url && (
                    <div className="mt-2 p-4 bg-gray-100 rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">Preview:</p>
                      <img 
                        src={settings.banner_url} 
                        alt="Banner Preview"
                        className="w-full h-32 object-cover rounded"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <Label>Show Pricing to Customers</Label>
                    <p className="text-xs text-gray-500">
                      Toggle visibility of prices in the styling page
                    </p>
                  </div>
                  <Button
                    variant={settings.show_pricing ? "default" : "outline"}
                    onClick={() => updateBranding('show_pricing', !settings.show_pricing)}
                    className={settings.show_pricing ? "bg-[#c9a962] hover:bg-[#b89952] text-black" : ""}
                    data-testid="toggle-pricing-visibility"
                  >
                    {settings.show_pricing ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Visible
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hidden
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#c9a962]" />
                      Staff Management
                    </CardTitle>
                    <CardDescription>
                      Create and manage staff members (sub-agents) who can use your portal
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={() => openStaffModal()}
                    className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                    data-testid="add-staff-btn"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {staffLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
                  </div>
                ) : staffList.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600">No Staff Members</h3>
                    <p className="text-gray-500 text-sm mb-4">
                      Add staff members to help manage orders
                    </p>
                    <Button onClick={() => openStaffModal()} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Staff
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {staffList.map((staff) => (
                      <div 
                        key={staff.email} 
                        className={`flex items-center justify-between p-4 border rounded-lg ${
                          staff.is_active ? 'bg-white' : 'bg-gray-100 opacity-60'
                        }`}
                        data-testid={`staff-card-${staff.email}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-[#1a2744] text-white rounded-full flex items-center justify-center font-semibold">
                            {staff.full_name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{staff.full_name}</h4>
                            <p className="text-sm text-gray-500">{staff.email}</p>
                            {!staff.is_active && (
                              <span className="text-xs text-red-500">Deactivated</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          {/* Margins Summary */}
                          <div className="text-right text-xs text-gray-500 hidden sm:block">
                            <div>CMT: {staff.margins?.cmt_margin || 0}%</div>
                            <div>Fabric: {staff.margins?.fabric_margin || 0}%</div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openStaffModal(staff)}
                              data-testid={`edit-staff-${staff.email}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                setSelectedStaffForPassword(staff.email);
                                setPasswordModalOpen(true);
                              }}
                              data-testid={`password-staff-${staff.email}`}
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-red-500 hover:bg-red-50"
                              onClick={() => {
                                setStaffToDelete(staff.email);
                                setDeleteModalOpen(true);
                              }}
                              data-testid={`delete-staff-${staff.email}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Staff Portal Info */}
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">How Staff Portal Works</h4>
                  <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                    <li>Staff login using the <strong>same reseller login page</strong></li>
                    <li>Staff can add orders to WIP and link measurements</li>
                    <li>Staff can receive customer payments</li>
                    <li>Staff <strong>cannot</strong> place orders (only reseller can pay admin)</li>
                    <li>Staff <strong>cannot</strong> access settings</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Margins Tab */}
          <TabsContent value="margins">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#c9a962]" />
                  Profit Margins
                </CardTitle>
                <CardDescription>
                  Set your markup percentages on base prices. Final price = Suits India price + your margin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Base Product Margin (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.margins?.base_product_margin || 0}
                      onChange={(e) => updateMargin('base_product_margin', e.target.value)}
                      data-testid="base-margin-input"
                    />
                    <p className="text-xs text-gray-500">
                      Applied to CMT (Cut, Make, Trim) price
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Fabric Margin (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.margins?.fabric_margin || 0}
                      onChange={(e) => updateMargin('fabric_margin', e.target.value)}
                      data-testid="fabric-margin-input"
                    />
                    <p className="text-xs text-gray-500">
                      Applied to fabric cost
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Style Options Margin (%)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={settings.margins?.style_options_margin || 0}
                      onChange={(e) => updateMargin('style_options_margin', e.target.value)}
                      data-testid="style-margin-input"
                    />
                    <p className="text-xs text-gray-500">
                      Applied to styling surcharges
                    </p>
                  </div>
                </div>

                {/* Margin Preview */}
                <div className="bg-[#1a2744] rounded-lg p-6 text-white">
                  <h4 className="font-medium mb-4">Example Calculation</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-white/60">Base CMT Price</p>
                      <p className="font-bold">₹185</p>
                    </div>
                    <div>
                      <p className="text-white/60">Your Margin ({settings.margins?.base_product_margin || 0}%)</p>
                      <p className="font-bold text-[#c9a962]">
                        + ₹{Math.round(185 * (settings.margins?.base_product_margin || 0) / 100)}
                      </p>
                    </div>
                    <div>
                      <p className="text-white/60">Styling Surcharge</p>
                      <p className="font-bold">₹25</p>
                    </div>
                    <div>
                      <p className="text-white/60">Your Margin ({settings.margins?.style_options_margin || 0}%)</p>
                      <p className="font-bold text-[#c9a962]">
                        + ₹{Math.round(25 * (settings.margins?.style_options_margin || 0) / 100)}
                      </p>
                    </div>
                    <div className="col-span-2 border-t border-white/20 pt-4 mt-2">
                      <p className="text-white/60">Customer Sees</p>
                      <p className="text-2xl font-bold text-[#c9a962]">
                        ₹{Math.round(
                          185 * (1 + (settings.margins?.base_product_margin || 0) / 100) +
                          25 * (1 + (settings.margins?.style_options_margin || 0) / 100)
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secret Code for Cost View */}
                <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <ShieldCheck className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-amber-900">Cost View Secret Code</h4>
                      <p className="text-xs text-amber-700">
                        Set a secret code to view your cost prices during customer sessions
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3 items-end">
                      <div className="flex-1 space-y-2">
                        <Label className="text-amber-900">Secret Code</Label>
                        <div className="relative">
                          <Input
                            type={showSecretCode ? "text" : "password"}
                            value={settings.cost_view_secret_code || ''}
                            onChange={(e) => setSettings({...settings, cost_view_secret_code: e.target.value})}
                            placeholder="Enter your secret code"
                            className="pr-10"
                            data-testid="secret-code-input"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecretCode(!showSecretCode)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showSecretCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-amber-700">
                      <Lock className="h-3 w-3 inline mr-1" />
                      When sitting with a customer, tap the lock icon on pricing panel and enter this code to see your actual cost. 
                      Customer will only see prices with your margins applied.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-[#c9a962]" />
                  Payment Settings
                </CardTitle>
                <CardDescription>
                  Configure your Stripe account for accepting customer payments directly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Stripe Enable Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">Enable Stripe Payments</h4>
                    <p className="text-sm text-gray-500">
                      Accept card payments from customers directly to your account
                    </p>
                  </div>
                  <Switch
                    checked={settings.stripe_enabled || false}
                    onCheckedChange={(checked) => setSettings({...settings, stripe_enabled: checked})}
                    data-testid="stripe-enabled-switch"
                  />
                </div>

                {settings.stripe_enabled && (
                  <div className="space-y-4 border rounded-lg p-4">
                    <div className="space-y-2">
                      <Label>Stripe Publishable Key</Label>
                      <Input
                        type="text"
                        value={settings.stripe_publishable_key || ''}
                        onChange={(e) => setSettings({...settings, stripe_publishable_key: e.target.value})}
                        placeholder="pk_live_... or pk_test_..."
                        data-testid="stripe-publishable-key"
                      />
                      <p className="text-xs text-gray-500">
                        Starts with pk_live_ (production) or pk_test_ (testing)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Stripe Secret Key</Label>
                      <div className="relative">
                        <Input
                          type={showStripeSecretKey ? "text" : "password"}
                          value={settings.stripe_secret_key || ''}
                          onChange={(e) => setSettings({...settings, stripe_secret_key: e.target.value})}
                          placeholder="sk_live_... or sk_test_..."
                          className="pr-10"
                          data-testid="stripe-secret-key"
                        />
                        <button
                          type="button"
                          onClick={() => setShowStripeSecretKey(!showStripeSecretKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showStripeSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Starts with sk_live_ (production) or sk_test_ (testing)
                      </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                      <h4 className="font-medium text-blue-900 mb-2">How to get your Stripe keys:</h4>
                      <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
                        <li>Go to <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">Stripe Dashboard → API Keys</a></li>
                        <li>Copy your Publishable key (pk_...)</li>
                        <li>Click "Reveal" to copy your Secret key (sk_...)</li>
                        <li>Paste them here and save</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* Manual Payment Entry Info */}
                <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                  <h4 className="font-medium text-amber-900 mb-2">Manual Payment Tracking</h4>
                  <p className="text-sm text-amber-800">
                    Even without Stripe, you can track customer payments manually in the order details:
                  </p>
                  <ul className="text-sm text-amber-700 list-disc list-inside mt-2 space-y-1">
                    <li>Mark orders as "Paid" or "Part Paid"</li>
                    <li>Record payment amounts received</li>
                    <li>Track payment history (cash, UPI, card, etc.)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme Tab */}
          <TabsContent value="theme">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#c9a962]" />
                  Theme Customization
                </CardTitle>
                <CardDescription>
                  Customize colors to match your brand identity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Primary Color (Buttons, Accents)</Label>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={settings.theme?.primary_color || '#c9a962'}
                        onChange={(e) => updateTheme('primary_color', e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.theme?.primary_color || '#c9a962'}
                        onChange={(e) => updateTheme('primary_color', e.target.value)}
                        className="flex-1"
                        data-testid="primary-color-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Secondary Color (Headers, Cards)</Label>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={settings.theme?.secondary_color || '#1a2744'}
                        onChange={(e) => updateTheme('secondary_color', e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.theme?.secondary_color || '#1a2744'}
                        onChange={(e) => updateTheme('secondary_color', e.target.value)}
                        className="flex-1"
                        data-testid="secondary-color-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={settings.theme?.background_color || '#0f1829'}
                        onChange={(e) => updateTheme('background_color', e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.theme?.background_color || '#0f1829'}
                        onChange={(e) => updateTheme('background_color', e.target.value)}
                        className="flex-1"
                        data-testid="background-color-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Button Color</Label>
                    <div className="flex gap-3">
                      <Input
                        type="color"
                        value={settings.theme?.button_color || '#c9a962'}
                        onChange={(e) => updateTheme('button_color', e.target.value)}
                        className="w-16 h-10 p-1 cursor-pointer"
                      />
                      <Input
                        value={settings.theme?.button_color || '#c9a962'}
                        onChange={(e) => updateTheme('button_color', e.target.value)}
                        className="flex-1"
                        data-testid="button-color-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Preview */}
                <div className="border rounded-lg overflow-hidden">
                  <div 
                    className="p-4"
                    style={{ backgroundColor: settings.theme?.background_color || '#0f1829' }}
                  >
                    <div 
                      className="p-4 rounded-lg mb-4"
                      style={{ backgroundColor: settings.theme?.secondary_color || '#1a2744' }}
                    >
                      <h4 className="font-medium" style={{ color: settings.theme?.text_color || '#ffffff' }}>
                        Theme Preview
                      </h4>
                      <p className="text-sm opacity-60" style={{ color: settings.theme?.text_color || '#ffffff' }}>
                        This is how your portal will look
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        style={{ 
                          backgroundColor: settings.theme?.button_color || '#c9a962',
                          color: '#000000'
                        }}
                      >
                        Primary Button
                      </Button>
                      <Button variant="outline" style={{ borderColor: settings.theme?.primary_color }}>
                        Secondary Button
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Staff Create/Edit Modal */}
      <Dialog open={staffModalOpen} onOpenChange={setStaffModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#c9a962]" />
              {editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
            </DialogTitle>
            <DialogDescription>
              {editingStaff 
                ? 'Update staff details and margins' 
                : 'Create a new staff account with login credentials'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({...staffForm, full_name: e.target.value})}
                  placeholder="John Doe"
                  data-testid="staff-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={staffForm.phone}
                  onChange={(e) => setStaffForm({...staffForm, phone: e.target.value})}
                  placeholder="+91 98765 43210"
                  data-testid="staff-phone-input"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={staffForm.email}
                onChange={(e) => setStaffForm({...staffForm, email: e.target.value})}
                placeholder="staff@example.com"
                disabled={!!editingStaff}
                data-testid="staff-email-input"
              />
              {editingStaff && (
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              )}
            </div>
            
            {!editingStaff && (
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input
                    type={showStaffPassword ? "text" : "password"}
                    value={staffForm.password}
                    onChange={(e) => setStaffForm({...staffForm, password: e.target.value})}
                    placeholder="Minimum 6 characters"
                    className="pr-10"
                    data-testid="staff-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showStaffPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            
            {/* Staff Margins */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[#c9a962]" />
                Staff Margins
                <span className="text-xs font-normal text-gray-500">(Your markup on top of your cost)</span>
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CMT Margin (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={staffForm.margins.cmt_margin}
                    onChange={(e) => updateStaffMargin('cmt_margin', e.target.value)}
                    data-testid="staff-cmt-margin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fabric Margin (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={staffForm.margins.fabric_margin}
                    onChange={(e) => updateStaffMargin('fabric_margin', e.target.value)}
                    data-testid="staff-fabric-margin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Styling Margin (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={staffForm.margins.styling_margin}
                    onChange={(e) => updateStaffMargin('styling_margin', e.target.value)}
                    data-testid="staff-styling-margin"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shipping Margin (%)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={staffForm.margins.shipping_margin}
                    onChange={(e) => updateStaffMargin('shipping_margin', e.target.value)}
                    data-testid="staff-shipping-margin"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Staff will see: Your Cost + These Margins = Their Cost Price
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveStaff}
              disabled={saving}
              className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingStaff ? 'Update Staff' : 'Create Staff'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Modal */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-[#c9a962]" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedStaffForPassword}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label>New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              data-testid="new-password-input"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePassword}
              disabled={saving}
              className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Deactivate Staff
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this staff member? They will no longer be able to login.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteStaff}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResellerSettingsPage;
