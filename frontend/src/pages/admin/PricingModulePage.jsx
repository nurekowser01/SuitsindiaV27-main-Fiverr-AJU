import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Package,
  Ruler,
  Percent,
  Users,
  Globe,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PricingModulePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fabrics');
  const [loading, setLoading] = useState(true);

  // Fabrics (price code + SKU + base price per meter)
  const [fabrics, setFabrics] = useState([]);
  const [showFabricModal, setShowFabricModal] = useState(false);
  const [editingFabric, setEditingFabric] = useState(null);
  const [fabricForm, setFabricForm] = useState({
    code: '',  // Fabric Price Code (for pricing lookup)
    sku: '',   // Fabric SKU (for inventory tracking)
    name: '',
    description: '',
    base_price_per_meter: 0
  });
  const [savingFabric, setSavingFabric] = useState(false);

  // Product Consumption (meters per product + base CMT + base shipping)
  const [products, setProducts] = useState([]);
  const [productConsumption, setProductConsumption] = useState([]);
  const [savingConsumption, setSavingConsumption] = useState({});

  // Size Margins (% markup per size)
  const [sizeMargins, setSizeMargins] = useState({
    size_a_margin_percent: 0,
    size_b_margin_percent: 30,
    size_c_margin_percent: 50,
    size_a_range: '34-46',
    size_b_range: '47-54',
    size_c_range: '55+'
  });
  const [savingSize, setSavingSize] = useState(false);

  // Reseller Pricing
  const [resellers, setResellers] = useState([]);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [resellerPricing, setResellerPricing] = useState({
    cmt_margin_percent: 0,
    fabric_margin_percent: 0,
    styling_margin_percent: 0,
    shipping_margin_percent: 0,
    custom_base_cmt: '',
    custom_base_shipping: ''
  });
  const [savingReseller, setSavingReseller] = useState(false);

  // Country Surcharges
  const [countrySurcharges, setCountrySurcharges] = useState([]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countryForm, setCountryForm] = useState({
    country_code: '',
    country_name: '',
    surcharge_amount: 0
  });
  const [savingCountry, setSavingCountry] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [fabricsRes, consumptionRes, sizeRes, resellersRes, countriesRes, productsRes] = await Promise.all([
        api.get('/pricing/fabrics/all'),
        api.get('/pricing/product-consumption'),
        api.get('/pricing/size-margins'),
        api.get('/pricing/reseller-pricing'),
        api.get('/pricing/country-surcharges'),
        api.get('/products/categories')
      ]);

      setFabrics(fabricsRes.data);
      setProductConsumption(consumptionRes.data);
      setSizeMargins(sizeRes.data);
      setResellers(resellersRes.data);
      setCountrySurcharges(countriesRes.data);
      
      // Flatten products from categories
      const allProducts = [];
      productsRes.data.forEach(cat => {
        cat.products?.forEach(prod => {
          allProducts.push({ ...prod, category_name: cat.name });
        });
      });
      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  // ==================
  // FABRICS
  // ==================
  const handleSaveFabric = async () => {
    if (!fabricForm.code || !fabricForm.name) {
      toast.error('Code and Name are required');
      return;
    }

    setSavingFabric(true);
    try {
      if (editingFabric) {
        await api.put(`/pricing/fabrics/${editingFabric.id}`, fabricForm);
        toast.success('Fabric updated');
      } else {
        await api.post('/pricing/fabrics', fabricForm);
        toast.success('Fabric created');
      }
      setShowFabricModal(false);
      setEditingFabric(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save fabric');
    } finally {
      setSavingFabric(false);
    }
  };

  const handleEditFabric = (fabric) => {
    setEditingFabric(fabric);
    setFabricForm({
      code: fabric.code,
      sku: fabric.sku || '',
      name: fabric.name,
      description: fabric.description || '',
      base_price_per_meter: fabric.base_price_per_meter
    });
    setShowFabricModal(true);
  };

  const handleDeleteFabric = async (fabricId) => {
    if (!window.confirm('Delete this fabric?')) return;
    try {
      await api.delete(`/pricing/fabrics/${fabricId}`);
      toast.success('Fabric deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete fabric');
    }
  };

  // ==================
  // PRODUCT CONSUMPTION
  // ==================
  const getProductConsumption = (productId) => {
    return productConsumption.find(c => c.product_id === productId) || {
      fabric_consumption_meters: 3,
      base_cmt: 0,
      base_shipping: 60
    };
  };

  const handleSaveProductConsumption = async (product) => {
    const consumptionInput = document.getElementById(`consumption-${product.id}`);
    const cmtInput = document.getElementById(`cmt-${product.id}`);
    const shippingInput = document.getElementById(`shipping-${product.id}`);

    setSavingConsumption(prev => ({ ...prev, [product.id]: true }));
    try {
      await api.post('/pricing/product-consumption', {
        product_id: product.id,
        product_name: product.name,
        fabric_consumption_meters: parseFloat(consumptionInput.value) || 3,
        base_cmt: parseFloat(cmtInput.value) || 0,
        base_shipping: parseFloat(shippingInput.value) || 60
      });
      toast.success(`${product.name} settings saved`);
      fetchData();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSavingConsumption(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // ==================
  // SIZE MARGINS
  // ==================
  const handleSaveSizeMargins = async () => {
    setSavingSize(true);
    try {
      await api.put('/pricing/size-margins', sizeMargins);
      toast.success('Size margins updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingSize(false);
    }
  };

  // ==================
  // RESELLER PRICING
  // ==================
  const handleSelectReseller = async (reseller) => {
    setSelectedReseller(reseller);
    try {
      const response = await api.get(`/pricing/reseller-pricing/${reseller.reseller_email}`);
      setResellerPricing({
        cmt_margin_percent: response.data.cmt_margin_percent || 0,
        fabric_margin_percent: response.data.fabric_margin_percent || 0,
        styling_margin_percent: response.data.styling_margin_percent || 0,
        shipping_margin_percent: response.data.shipping_margin_percent || 0,
        custom_base_cmt: response.data.custom_base_cmt ?? '',
        custom_base_shipping: response.data.custom_base_shipping ?? ''
      });
    } catch (error) {
      setResellerPricing({
        cmt_margin_percent: 0,
        fabric_margin_percent: 0,
        styling_margin_percent: 0,
        shipping_margin_percent: 0,
        custom_base_cmt: '',
        custom_base_shipping: ''
      });
    }
  };

  const handleSaveResellerPricing = async () => {
    if (!selectedReseller) return;

    // Sanitize values - convert empty strings or '-' to 0
    const sanitizeValue = (val) => {
      if (val === '' || val === '-' || val === undefined || val === null) return 0;
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    };

    setSavingReseller(true);
    try {
      await api.put(`/pricing/reseller-pricing/${selectedReseller.reseller_email}`, {
        reseller_email: selectedReseller.reseller_email,
        reseller_name: selectedReseller.reseller_name,
        cmt_margin_percent: sanitizeValue(resellerPricing.cmt_margin_percent),
        fabric_margin_percent: sanitizeValue(resellerPricing.fabric_margin_percent),
        styling_margin_percent: sanitizeValue(resellerPricing.styling_margin_percent),
        shipping_margin_percent: sanitizeValue(resellerPricing.shipping_margin_percent),
        custom_base_cmt: resellerPricing.custom_base_cmt !== '' ? parseFloat(resellerPricing.custom_base_cmt) : null,
        custom_base_shipping: resellerPricing.custom_base_shipping !== '' ? parseFloat(resellerPricing.custom_base_shipping) : null
      });
      toast.success('Reseller pricing updated');
    } catch (error) {
      toast.error('Failed to update');
    } finally {
      setSavingReseller(false);
    }
  };

  // ==================
  // COUNTRY SURCHARGES
  // ==================
  const handleSaveCountry = async () => {
    if (!countryForm.country_code || !countryForm.country_name) {
      toast.error('Country code and name are required');
      return;
    }

    setSavingCountry(true);
    try {
      await api.post('/pricing/country-surcharges', {
        ...countryForm,
        is_active: true
      });
      toast.success('Country surcharge saved');
      setShowCountryModal(false);
      setCountryForm({ country_code: '', country_name: '', surcharge_amount: 0 });
      fetchData();
    } catch (error) {
      toast.error('Failed to save');
    } finally {
      setSavingCountry(false);
    }
  };

  const handleDeleteCountry = async (countryCode) => {
    if (!window.confirm('Delete this country surcharge?')) return;
    try {
      await api.delete(`/pricing/country-surcharges/${countryCode}`);
      toast.success('Country surcharge deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-[#1a2744] text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/dashboard')}
            className="text-white hover:bg-[#2a3754]"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Pricing Module</h1>
            <p className="text-sm text-gray-300">Configure fabrics, consumption, size margins, and reseller pricing</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex-wrap">
            <TabsTrigger value="fabrics" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Fabric Price Codes
            </TabsTrigger>
            <TabsTrigger value="consumption" className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              Product Consumption
            </TabsTrigger>
            <TabsTrigger value="sizes" className="flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Size Margins
            </TabsTrigger>
            <TabsTrigger value="resellers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Reseller Pricing
            </TabsTrigger>
            <TabsTrigger value="countries" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Country Surcharges
            </TabsTrigger>
          </TabsList>

          {/* Fabrics Tab */}
          <TabsContent value="fabrics">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Fabric Price Codes</CardTitle>
                    <CardDescription>Configure fabric price codes with base price per meter. Prices are calculated based on these codes.</CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingFabric(null);
                      setFabricForm({ code: '', sku: '', name: '', description: '', base_price_per_meter: 0 });
                      setShowFabricModal(true);
                    }}
                    className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                    data-testid="add-fabric-btn"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Fabric
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Price Code</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Base Price / Meter</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fabrics.map((fabric) => (
                      <TableRow key={fabric.id}>
                        <TableCell className="font-mono font-bold text-[#c9a962]">{fabric.code}</TableCell>
                        <TableCell className="font-mono text-gray-600">{fabric.sku || '-'}</TableCell>
                        <TableCell>{fabric.name}</TableCell>
                        <TableCell className="text-gray-500">{fabric.description || '-'}</TableCell>
                        <TableCell className="text-right font-medium">${fabric.base_price_per_meter}/m</TableCell>
                        <TableCell className="text-center">
                          <span className={`px-2 py-1 rounded text-xs ${fabric.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {fabric.is_active !== false ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditFabric(fabric)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDeleteFabric(fabric.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {fabrics.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No fabric price codes configured. Click "Add Fabric" to create one.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Product Consumption Tab */}
          <TabsContent value="consumption">
            <Card>
              <CardHeader>
                <CardTitle>Product Consumption & Base Costs</CardTitle>
                <CardDescription>
                  Configure fabric consumption (meters), base CMT, and base shipping for each product.
                  <br />
                  <span className="text-amber-600 text-xs mt-1 inline-block">
                    Note: Construction surcharges (Half Canvas, Full Canvas) are configured in Style Options for each product.
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-center">Fabric Consumption (m)</TableHead>
                      <TableHead className="text-center">Base CMT ($)</TableHead>
                      <TableHead className="text-center">Base Shipping ($)</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      const consumption = getProductConsumption(product.id);
                      return (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">{product.name}</TableCell>
                          <TableCell className="text-gray-500">{product.category_name}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              step="0.1"
                              id={`consumption-${product.id}`}
                              defaultValue={consumption.fabric_consumption_meters}
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              id={`cmt-${product.id}`}
                              defaultValue={consumption.base_cmt}
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              id={`shipping-${product.id}`}
                              defaultValue={consumption.base_shipping}
                              className="w-24 mx-auto text-center"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() => handleSaveProductConsumption(product)}
                              disabled={savingConsumption[product.id]}
                              className="bg-[#1a2744] hover:bg-[#2a3754] text-white"
                            >
                              {savingConsumption[product.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Size Margins Tab */}
          <TabsContent value="sizes">
            <Card>
              <CardHeader>
                <CardTitle>Size Margins</CardTitle>
                <CardDescription>Configure % markup on fabric price for each customer size category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div className="p-6 border rounded-lg bg-blue-50">
                    <h3 className="font-bold text-lg mb-1 text-blue-700">Size A</h3>
                    <p className="text-sm text-blue-600 mb-4">Range: {sizeMargins.size_a_range}</p>
                    <div>
                      <Label>Margin on Fabric Price (%)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={sizeMargins.size_a_margin_percent}
                          onChange={(e) => setSizeMargins(prev => ({ ...prev, size_a_margin_percent: parseFloat(e.target.value) || 0 }))}
                          className="flex-1"
                        />
                        <span className="text-gray-500 font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border rounded-lg bg-green-50">
                    <h3 className="font-bold text-lg mb-1 text-green-700">Size B</h3>
                    <p className="text-sm text-green-600 mb-4">Range: {sizeMargins.size_b_range}</p>
                    <div>
                      <Label>Margin on Fabric Price (%)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={sizeMargins.size_b_margin_percent}
                          onChange={(e) => setSizeMargins(prev => ({ ...prev, size_b_margin_percent: parseFloat(e.target.value) || 0 }))}
                          className="flex-1"
                        />
                        <span className="text-gray-500 font-medium">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 border rounded-lg bg-orange-50">
                    <h3 className="font-bold text-lg mb-1 text-orange-700">Size C</h3>
                    <p className="text-sm text-orange-600 mb-4">Range: {sizeMargins.size_c_range}</p>
                    <div>
                      <Label>Margin on Fabric Price (%)</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          type="number"
                          value={sizeMargins.size_c_margin_percent}
                          onChange={(e) => setSizeMargins(prev => ({ ...prev, size_c_margin_percent: parseFloat(e.target.value) || 0 }))}
                          className="flex-1"
                        />
                        <span className="text-gray-500 font-medium">%</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Example Calculation:</h4>
                  <p className="text-sm text-gray-600">
                    If fabric base price = $10/m and Size B margin = 30%, then:
                    <br />
                    <span className="font-mono bg-white px-2 py-1 rounded mt-1 inline-block">
                      Fabric price for Size B = $10 × (1 + 30%) = $13/m
                    </span>
                  </p>
                </div>

                <Button
                  onClick={handleSaveSizeMargins}
                  disabled={savingSize}
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                >
                  {savingSize ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Size Margins
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reseller Pricing Tab */}
          <TabsContent value="resellers">
            <div className="grid grid-cols-3 gap-6">
              <Card className="col-span-1">
                <CardHeader>
                  <CardTitle>Select Reseller</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {resellers.map((reseller) => (
                      <div
                        key={reseller.reseller_email}
                        className={`p-3 rounded-lg cursor-pointer border transition-colors ${
                          selectedReseller?.reseller_email === reseller.reseller_email
                            ? 'bg-[#c9a962] border-[#c9a962] text-black'
                            : 'hover:bg-gray-100 border-gray-200'
                        }`}
                        onClick={() => handleSelectReseller(reseller)}
                      >
                        <p className="font-medium">{reseller.reseller_name || reseller.reseller_email}</p>
                        <p className="text-sm opacity-75">{reseller.reseller_email}</p>
                      </div>
                    ))}
                    {resellers.length === 0 && (
                      <p className="text-center text-gray-500 py-4">No resellers found</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle>
                    {selectedReseller ? `Pricing for ${selectedReseller.reseller_name || selectedReseller.reseller_email}` : 'Reseller Pricing'}
                  </CardTitle>
                  <CardDescription>Set margin percentages (use negative values for discounts, e.g., -20% gives special pricing)</CardDescription>
                </CardHeader>
                <CardContent>
                  {selectedReseller ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-4 border rounded-lg">
                          <Label className="font-medium">CMT (Stitching) Margin</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              step="any"
                              value={resellerPricing.cmt_margin_percent}
                              onChange={(e) => {
                                const val = e.target.value;
                                setResellerPricing(prev => ({ 
                                  ...prev, 
                                  cmt_margin_percent: val === '' || val === '-' ? val : parseFloat(val) 
                                }));
                              }}
                              className="flex-1"
                              placeholder="e.g., 10 or -20"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Positive = markup, Negative = discount</p>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <Label className="font-medium">Fabric Margin</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              step="any"
                              value={resellerPricing.fabric_margin_percent}
                              onChange={(e) => {
                                const val = e.target.value;
                                setResellerPricing(prev => ({ 
                                  ...prev, 
                                  fabric_margin_percent: val === '' || val === '-' ? val : parseFloat(val) 
                                }));
                              }}
                              className="flex-1"
                              placeholder="e.g., 10 or -20"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Applied after size margin</p>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <Label className="font-medium">Styling Margin</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              step="any"
                              value={resellerPricing.styling_margin_percent}
                              onChange={(e) => {
                                const val = e.target.value;
                                setResellerPricing(prev => ({ 
                                  ...prev, 
                                  styling_margin_percent: val === '' || val === '-' ? val : parseFloat(val) 
                                }));
                              }}
                              className="flex-1"
                              placeholder="e.g., 10 or -20"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Applied to styling charges</p>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <Label className="font-medium">Shipping Margin</Label>
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              type="number"
                              step="any"
                              value={resellerPricing.shipping_margin_percent}
                              onChange={(e) => {
                                const val = e.target.value;
                                setResellerPricing(prev => ({ 
                                  ...prev, 
                                  shipping_margin_percent: val === '' || val === '-' ? val : parseFloat(val) 
                                }));
                              }}
                              className="flex-1"
                              placeholder="e.g., 10 or -20"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Applied to shipping rates</p>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Custom Base Values (Optional)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Custom Base CMT ($)</Label>
                            <Input
                              type="number"
                              placeholder="Leave empty to use product default"
                              value={resellerPricing.custom_base_cmt}
                              onChange={(e) => setResellerPricing(prev => ({ ...prev, custom_base_cmt: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label>Custom Base Shipping ($)</Label>
                            <Input
                              type="number"
                              placeholder="Leave empty to use product default"
                              value={resellerPricing.custom_base_shipping}
                              onChange={(e) => setResellerPricing(prev => ({ ...prev, custom_base_shipping: e.target.value }))}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        onClick={handleSaveResellerPricing}
                        disabled={savingReseller}
                        className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                      >
                        {savingReseller ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Reseller Pricing
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a reseller to configure their pricing</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Country Surcharges Tab */}
          <TabsContent value="countries">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Country Shipping Surcharges</CardTitle>
                    <CardDescription>Add additional shipping costs for specific countries</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowCountryModal(true)}
                    className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Country
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Country Code</TableHead>
                      <TableHead>Country Name</TableHead>
                      <TableHead className="text-right">Surcharge Amount</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {countrySurcharges.map((country) => (
                      <TableRow key={country.country_code}>
                        <TableCell className="font-mono font-bold">{country.country_code}</TableCell>
                        <TableCell>{country.country_name}</TableCell>
                        <TableCell className="text-right">${country.surcharge_amount}</TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-500"
                            onClick={() => handleDeleteCountry(country.country_code)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {countrySurcharges.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No country surcharges configured.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Fabric Modal */}
      <Dialog open={showFabricModal} onOpenChange={setShowFabricModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFabric ? 'Edit Fabric' : 'Add Fabric'}</DialogTitle>
            <DialogDescription>Configure fabric price code with base price per meter</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fabric Price Code *</Label>
                <Input
                  value={fabricForm.code}
                  onChange={(e) => setFabricForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., P001"
                  disabled={!!editingFabric}
                  data-testid="fabric-price-code-input"
                />
                <p className="text-xs text-gray-500 mt-1">Used for pricing lookup</p>
              </div>
              <div>
                <Label>Fabric SKU</Label>
                <Input
                  value={fabricForm.sku}
                  onChange={(e) => setFabricForm(prev => ({ ...prev, sku: e.target.value.toUpperCase() }))}
                  placeholder="e.g., FAB001"
                  data-testid="fabric-sku-input"
                />
                <p className="text-xs text-gray-500 mt-1">For inventory tracking</p>
              </div>
            </div>
            <div>
              <Label>Base Price per Meter ($) *</Label>
              <Input
                type="number"
                step="0.01"
                value={fabricForm.base_price_per_meter}
                onChange={(e) => setFabricForm(prev => ({ ...prev, base_price_per_meter: parseFloat(e.target.value) || 0 }))}
                placeholder="e.g., 25.00"
              />
            </div>
            <div>
              <Label>Name *</Label>
              <Input
                value={fabricForm.name}
                onChange={(e) => setFabricForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Premium Italian Wool"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Input
                value={fabricForm.description}
                onChange={(e) => setFabricForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowFabricModal(false)}>Cancel</Button>
              <Button onClick={handleSaveFabric} disabled={savingFabric} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                {savingFabric ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Country Modal */}
      <Dialog open={showCountryModal} onOpenChange={setShowCountryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Country Surcharge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country Code *</Label>
                <Input
                  value={countryForm.country_code}
                  onChange={(e) => setCountryForm(prev => ({ ...prev, country_code: e.target.value.toUpperCase() }))}
                  placeholder="e.g., US"
                  maxLength={3}
                />
              </div>
              <div>
                <Label>Country Name *</Label>
                <Input
                  value={countryForm.country_name}
                  onChange={(e) => setCountryForm(prev => ({ ...prev, country_name: e.target.value }))}
                  placeholder="e.g., United States"
                />
              </div>
            </div>
            <div>
              <Label>Surcharge Amount ($)</Label>
              <Input
                type="number"
                value={countryForm.surcharge_amount}
                onChange={(e) => setCountryForm(prev => ({ ...prev, surcharge_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCountryModal(false)}>Cancel</Button>
              <Button onClick={handleSaveCountry} disabled={savingCountry} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                {savingCountry ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </AdminLayout>
  );
};

export default PricingModulePage;
