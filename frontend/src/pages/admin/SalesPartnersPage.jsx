import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  Save,
  X,
  Search,
  UserPlus,
  TrendingUp,
  Briefcase,
  Package,
  Percent
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SalesPartnersPage = () => {
  const { token } = useAuth();
  const [partners, setPartners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [saving, setSaving] = useState(false);

  // Commission form state - now dynamic based on product categories
  const [commissionForm, setCommissionForm] = useState({
    monthly_retainer: 0,
    onboarding_commission: 0,
    commission_percentage: 0,
    product_commissions: {} // { product_id: commission_amount }
  });

  useEffect(() => {
    fetchPartners();
    fetchCategories();
  }, []);
  
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter only sales partners
      const salesPartners = response.data.filter(u => u.role === 'sales_partner');
      setPartners(salesPartners);
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to load sales partners');
    } finally {
      setLoading(false);
    }
  };

  // Get all products from all categories
  const getAllProducts = () => {
    const products = [];
    categories.forEach(cat => {
      (cat.products || []).forEach(prod => {
        products.push({
          ...prod,
          categoryId: cat.id,
          categoryName: cat.name
        });
      });
    });
    return products;
  };

  const openEditModal = (partner) => {
    setEditingPartner(partner);
    
    // Build product_commissions from saved settings
    const savedProductCommissions = partner.commission_settings?.product_commissions || {};
    
    setCommissionForm({
      monthly_retainer: partner.commission_settings?.monthly_retainer ?? 0,
      onboarding_commission: partner.commission_settings?.onboarding_commission ?? 0,
      commission_percentage: partner.commission_settings?.commission_percentage ?? 0,
      product_commissions: savedProductCommissions
    });
    setShowEditModal(true);
  };

  const updateProductCommission = (productId, value) => {
    setCommissionForm(prev => ({
      ...prev,
      product_commissions: {
        ...prev.product_commissions,
        [productId]: parseFloat(value) || 0
      }
    }));
  };

  const handleSaveCommissions = async () => {
    if (!editingPartner) return;
    
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/admin/users/${editingPartner.email}/commissions`,
        { commission_settings: commissionForm },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success('Commission settings saved successfully');
      setShowEditModal(false);
      fetchPartners();
    } catch (error) {
      console.error('Error saving commissions:', error);
      toast.error('Failed to save commission settings');
    } finally {
      setSaving(false);
    }
  };

  const filteredPartners = partners.filter(p => 
    p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => `₹${(amount || 0).toLocaleString()}`;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a1a]">Sales Partners</h1>
            <p className="text-[#666] mt-1">Manage commission structures for sales partners</p>
          </div>
          <Button 
            onClick={() => window.location.href = '/admin/users'}
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add New Partner
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Partners</p>
                  <p className="text-2xl font-bold">{partners.length}</p>
                </div>
                <Users className="h-8 w-8 text-[#c9a962]" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Partners</p>
                  <p className="text-2xl font-bold">{partners.filter(p => p.is_active !== false).length}</p>
                </div>
                <Briefcase className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Monthly Retainer</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(partners.reduce((sum, p) => sum + (p.commission_settings?.monthly_retainer || 0), 0))}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Commission %</p>
                  <p className="text-2xl font-bold">
                    {partners.length > 0 
                      ? Math.round(partners.reduce((sum, p) => sum + (p.commission_settings?.commission_percentage || 5), 0) / partners.length)
                      : 0}%
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search partners..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Partners List */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredPartners.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No sales partners found</p>
                <p className="text-sm text-gray-400 mt-1">Create a user with "Sales Partner" role in User Management</p>
              </CardContent>
            </Card>
          ) : (
            filteredPartners.map((partner) => (
              <Card key={partner.email} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                        {partner.full_name?.charAt(0) || partner.email?.charAt(0) || '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{partner.full_name || 'Unnamed Partner'}</h3>
                        <p className="text-sm text-gray-500">{partner.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={partner.is_active !== false ? "default" : "secondary"}>
                            {partner.is_active !== false ? 'Active' : 'Inactive'}
                          </Badge>
                          {partner.company && (
                            <Badge variant="outline">{partner.company}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => openEditModal(partner)}
                      variant="outline"
                      className="border-[#c9a962] text-[#c9a962] hover:bg-[#c9a962] hover:text-white"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Commissions
                    </Button>
                  </div>

                  {/* Commission Details */}
                  <div className="mt-6 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Commission Structure</h4>
                    
                    {/* Fixed Commissions Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                        <p className="text-xs text-blue-600">Monthly Retainer</p>
                        <p className="font-bold text-blue-800">
                          {formatCurrency(partner.commission_settings?.monthly_retainer)}
                        </p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                        <p className="text-xs text-purple-600">Onboarding</p>
                        <p className="font-bold text-purple-800">
                          {formatCurrency(partner.commission_settings?.onboarding_commission)}
                        </p>
                      </div>
                      <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                        <p className="text-xs text-emerald-600">Revenue %</p>
                        <p className="font-bold text-emerald-700">
                          {partner.commission_settings?.commission_percentage || 0}%
                        </p>
                      </div>
                      <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                        <p className="text-xs text-amber-600">Products Configured</p>
                        <p className="font-bold text-amber-700">
                          {Object.keys(partner.commission_settings?.product_commissions || {}).filter(k => partner.commission_settings?.product_commissions[k] > 0).length}
                        </p>
                      </div>
                    </div>
                    
                    {/* Per-Product Commissions */}
                    {Object.keys(partner.commission_settings?.product_commissions || {}).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Per-Product Commissions:</p>
                        <div className="flex flex-wrap gap-2">
                          {getAllProducts().map(product => {
                            const commission = partner.commission_settings?.product_commissions?.[product.id] || 0;
                            if (commission === 0) return null;
                            return (
                              <Badge key={product.id} variant="outline" className="text-xs bg-gray-50">
                                {product.name}: {formatCurrency(commission)}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Edit Commission Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#c9a962]" />
              Edit Commission Settings
            </DialogTitle>
          </DialogHeader>
          
          {editingPartner && (
            <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
              {/* Partner Info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                  {editingPartner.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="font-medium">{editingPartner.full_name}</p>
                  <p className="text-sm text-gray-500">{editingPartner.email}</p>
                </div>
              </div>

              <Tabs defaultValue="fixed" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="fixed" data-testid="tab-fixed-commissions">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Fixed Commissions
                  </TabsTrigger>
                  <TabsTrigger value="products" data-testid="tab-product-commissions">
                    <Package className="h-4 w-4 mr-2" />
                    Per-Product
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="fixed" className="space-y-4 mt-4">
                  {/* Monthly Retainer */}
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <Label className="text-blue-800 font-medium">Monthly Retainer (Fixed)</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        value={commissionForm.monthly_retainer}
                        onChange={(e) => setCommissionForm(prev => ({ ...prev, monthly_retainer: parseFloat(e.target.value) || 0 }))}
                        className="pl-8"
                        placeholder="0"
                        data-testid="input-monthly-retainer"
                      />
                    </div>
                    <p className="text-xs text-blue-600 mt-1">Fixed monthly payment regardless of sales</p>
                  </div>

                  {/* Onboarding Commission */}
                  <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                    <Label className="text-purple-800 font-medium">Onboarding Commission</Label>
                    <div className="relative mt-2">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <Input
                        type="number"
                        value={commissionForm.onboarding_commission}
                        onChange={(e) => setCommissionForm(prev => ({ ...prev, onboarding_commission: parseFloat(e.target.value) || 0 }))}
                        className="pl-8"
                        placeholder="0"
                        data-testid="input-onboarding-commission"
                      />
                    </div>
                    <p className="text-xs text-purple-600 mt-1">Paid when they refer a new reseller who gets onboarded</p>
                  </div>

                  {/* Revenue Percentage */}
                  <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-200">
                    <Label className="text-emerald-800 font-medium">Revenue Commission (%)</Label>
                    <div className="relative mt-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={commissionForm.commission_percentage}
                        onChange={(e) => setCommissionForm(prev => ({ ...prev, commission_percentage: parseFloat(e.target.value) ?? 0 }))}
                        placeholder="0"
                        data-testid="input-commission-percentage"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                    </div>
                    <p className="text-xs text-emerald-600 mt-1">Percentage of total order value from referred resellers (use 0 if using per-product rates instead)</p>
                  </div>

                  {/* Commission Formula Preview */}
                  <div className="p-4 border rounded-lg bg-slate-50 border-slate-200">
                    <Label className="text-slate-800 font-medium">Commission Formula</Label>
                    <div className="mt-2 p-3 bg-white rounded border border-slate-200">
                      <code className="text-sm text-slate-700 block">
                        Total = Monthly Retainer + (Onboarding × Resellers) + (Per-Product Rate × Quantity)
                      </code>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Example: If {formatCurrency(commissionForm.monthly_retainer)} retainer + {formatCurrency(commissionForm.onboarding_commission)}/reseller + product rates from Per-Product tab
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="products" className="space-y-4 mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Set fixed commission amounts per product. Leave at 0 if no per-product commission applies.
                  </p>
                  
                  {categories.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                      <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No product categories found</p>
                    </div>
                  ) : (
                    categories.map(category => (
                      <div key={category.id} className="border rounded-lg p-4">
                        <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#c9a962]" />
                          {category.name}
                        </h4>
                        
                        {(category.products || []).length === 0 ? (
                          <p className="text-sm text-gray-400 italic">No products in this category</p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {(category.products || []).map(product => (
                              <div key={product.id}>
                                <Label className="text-xs text-gray-600">{product.name}</Label>
                                <div className="relative mt-1">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                                  <Input
                                    type="number"
                                    value={commissionForm.product_commissions[product.id] || ''}
                                    onChange={(e) => updateProductCommission(product.id, e.target.value)}
                                    className="pl-6 h-9 text-sm"
                                    placeholder="0"
                                    data-testid={`input-commission-${product.id}`}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSaveCommissions}
              disabled={saving}
              className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Commissions'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default SalesPartnersPage;
