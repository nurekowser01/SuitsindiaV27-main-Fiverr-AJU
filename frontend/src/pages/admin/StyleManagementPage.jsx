import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Palette, 
  Plus, 
  Trash2, 
  Save, 
  GripVertical,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  Check,
  Loader2,
  Image,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Layers,
  Type,
  ImageIcon
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const StyleManagementPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stylingData, setStylingData] = useState(null);
  const [expandedParams, setExpandedParams] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      fetchStylingData(selectedProduct);
    }
  }, [selectedProduct]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/categories`);
      const allProducts = [];
      response.data.forEach(cat => {
        cat.products?.forEach(p => {
          allProducts.push({ ...p, category: cat.name });
        });
      });
      setProducts(allProducts);
      if (allProducts.length > 0) {
        setSelectedProduct(allProducts[0].id);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchStylingData = async (productId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/styling/parameters/${productId}`);
      setStylingData(response.data);
      // Expand all parameters by default
      const expanded = {};
      response.data.parameters?.forEach(p => {
        expanded[p.id] = true;
      });
      setExpandedParams(expanded);
    } catch (error) {
      console.error('Error fetching styling:', error);
      toast.error('Failed to load styling data');
    } finally {
      setLoading(false);
    }
  };

  const toggleParam = (paramId) => {
    setExpandedParams(prev => ({ ...prev, [paramId]: !prev[paramId] }));
  };

  const updateBaseCMT = (value) => {
    setStylingData(prev => ({ ...prev, base_cmt_price: parseFloat(value) || 0 }));
  };

  // Construction management
  const addConstruction = () => {
    const newConstruction = {
      id: `construction-${Date.now()}`,
      name: 'New Construction',
      description: '',
      base_price: 0,
      is_default: false
    };
    setStylingData(prev => ({
      ...prev,
      constructions: [...(prev.constructions || []), newConstruction]
    }));
  };

  const updateConstruction = (index, field, value) => {
    setStylingData(prev => {
      const constructions = [...prev.constructions];
      constructions[index] = { ...constructions[index], [field]: value };
      return { ...prev, constructions };
    });
  };

  const deleteConstruction = (index) => {
    setStylingData(prev => ({
      ...prev,
      constructions: prev.constructions.filter((_, i) => i !== index)
    }));
  };

  // Parameter management
  const addParameter = () => {
    const newParam = {
      id: `param-${Date.now()}`,
      name: 'New Parameter',
      order: (stylingData?.parameters?.length || 0) + 1,
      is_required: true,
      options: []
    };
    setStylingData(prev => ({
      ...prev,
      parameters: [...(prev.parameters || []), newParam]
    }));
    setExpandedParams(prev => ({ ...prev, [newParam.id]: true }));
  };

  const updateParameter = (paramId, field, value) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => 
        p.id === paramId ? { ...p, [field]: value } : p
      )
    }));
  };

  const deleteParameter = (paramId) => {
    if (window.confirm('Delete this parameter and all its options?')) {
      setStylingData(prev => ({
        ...prev,
        parameters: prev.parameters.filter(p => p.id !== paramId)
      }));
    }
  };

  // Move parameter up/down
  const moveParameter = (index, direction) => {
    setStylingData(prev => {
      const newParams = [...prev.parameters];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newParams.length) return prev;
      
      // Swap positions
      [newParams[index], newParams[newIndex]] = [newParams[newIndex], newParams[index]];
      
      // Update order values
      newParams.forEach((param, i) => {
        param.order = i + 1;
      });
      
      return { ...prev, parameters: newParams };
    });
  };

  // Move option up/down within a parameter
  const moveOption = (paramId, optionIndex, direction) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => {
        if (p.id !== paramId) return p;
        
        const newOptions = [...p.options];
        const newIndex = direction === 'up' ? optionIndex - 1 : optionIndex + 1;
        if (newIndex < 0 || newIndex >= newOptions.length) return p;
        
        // Swap positions
        [newOptions[optionIndex], newOptions[newIndex]] = [newOptions[newIndex], newOptions[optionIndex]];
        
        return { ...p, options: newOptions };
      })
    }));
  };

  // Option management
  const addOption = (paramId) => {
    const newOption = {
      id: `option-${Date.now()}`,
      name: 'New Option',
      image: '',
      surcharge: 0,
      is_default: false
    };
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => 
        p.id === paramId 
          ? { ...p, options: [...(p.options || []), newOption] }
          : p
      )
    }));
  };

  const updateOption = (paramId, optionId, field, value) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => 
        p.id === paramId 
          ? { 
              ...p, 
              options: p.options.map(o => 
                o.id === optionId ? { ...o, [field]: value } : o
              )
            }
          : p
      )
    }));
  };

  const deleteOption = (paramId, optionId) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p => 
        p.id === paramId 
          ? { ...p, options: p.options.filter(o => o.id !== optionId) }
          : p
      )
    }));
  };

  // Sub-option management
  const toggleSubOptions = (paramId, optionId, enabled) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p =>
        p.id === paramId
          ? {
              ...p,
              options: p.options.map(o =>
                o.id === optionId
                  ? { ...o, has_sub_options: enabled, sub_options: enabled ? (o.sub_options || []) : [] }
                  : o
              )
            }
          : p
      )
    }));
  };

  const addSubOption = (paramId, optionId) => {
    const newSub = {
      id: `sub-${Date.now()}`,
      name: 'New Sub-Option',
      image: '',
      surcharge: 0,
      is_default: false
    };
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p =>
        p.id === paramId
          ? {
              ...p,
              options: p.options.map(o =>
                o.id === optionId
                  ? { ...o, sub_options: [...(o.sub_options || []), newSub] }
                  : o
              )
            }
          : p
      )
    }));
  };

  const updateSubOption = (paramId, optionId, subId, field, value) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p =>
        p.id === paramId
          ? {
              ...p,
              options: p.options.map(o =>
                o.id === optionId
                  ? {
                      ...o,
                      sub_options: (o.sub_options || []).map(s =>
                        s.id === subId ? { ...s, [field]: value } : s
                      )
                    }
                  : o
              )
            }
          : p
      )
    }));
  };

  const deleteSubOption = (paramId, optionId, subId) => {
    setStylingData(prev => ({
      ...prev,
      parameters: prev.parameters.map(p =>
        p.id === paramId
          ? {
              ...p,
              options: p.options.map(o =>
                o.id === optionId
                  ? { ...o, sub_options: (o.sub_options || []).filter(s => s.id !== subId) }
                  : o
              )
            }
          : p
      )
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/styling/parameters/${selectedProduct}`, stylingData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Styling configuration saved!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedProduct) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Palette className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Style Management</h1>
              <p className="text-[#666]">Configure styling parameters, options, and pricing for each product</p>
            </div>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            size="lg" 
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {/* Product Selector */}
        <Card>
          <CardHeader>
            <CardTitle>Select Product</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProduct} onValueChange={setSelectedProduct}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select a product" />
              </SelectTrigger>
              <SelectContent>
                {products.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
          </div>
        ) : stylingData && (
          <>
            {/* Base Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-[#c9a962]" />
                  Base CMT Price
                </CardTitle>
                <CardDescription>
                  Base Cut, Make, Trim price for this product (before constructions and styling)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Label className="text-lg">₹</Label>
                  <Input
                    type="number"
                    value={stylingData.base_cmt_price || 0}
                    onChange={(e) => updateBaseCMT(e.target.value)}
                    className="w-32 text-lg"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Construction Types */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Construction Types</CardTitle>
                    <CardDescription>
                      Different construction methods with price variations (e.g., Fused, Half Canvas, Full Canvas)
                    </CardDescription>
                  </div>
                  <Button onClick={addConstruction} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Construction
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {stylingData.constructions?.length > 0 ? (
                  <div className="space-y-3">
                    {stylingData.constructions.map((c, index) => (
                      <div key={c.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <Input
                          value={c.name}
                          onChange={(e) => updateConstruction(index, 'name', e.target.value)}
                          placeholder="Name"
                          className="w-40"
                        />
                        <Input
                          value={c.description || ''}
                          onChange={(e) => updateConstruction(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="flex-1"
                        />
                        <div className="flex items-center gap-2">
                          <Label className="text-sm text-gray-500">+₹</Label>
                          <Input
                            type="number"
                            value={c.base_price || 0}
                            onChange={(e) => updateConstruction(index, 'base_price', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={c.is_default}
                            onCheckedChange={(v) => {
                              // Unset all others first
                              stylingData.constructions.forEach((_, i) => {
                                if (i !== index) updateConstruction(i, 'is_default', false);
                              });
                              updateConstruction(index, 'is_default', v);
                            }}
                          />
                          <Label className="text-xs">Default</Label>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50"
                          onClick={() => deleteConstruction(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No construction types. Add one above.</p>
                )}
              </CardContent>
            </Card>

            {/* Style Parameters */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Style Parameters</CardTitle>
                    <CardDescription>
                      Configure styling options for this product (Lapel, Pocket, Vent, etc.)
                    </CardDescription>
                  </div>
                  <Button onClick={addParameter} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Parameter
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {stylingData.parameters?.map((param, paramIndex) => (
                  <div key={param.id} className="border rounded-lg overflow-hidden">
                    {/* Parameter Header */}
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleParam(param.id)}
                    >
                      <div className="flex items-center gap-4">
                        {/* Move Up/Down Buttons */}
                        <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                            onClick={() => moveParameter(paramIndex, 'up')}
                            disabled={paramIndex === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                            onClick={() => moveParameter(paramIndex, 'down')}
                            disabled={paramIndex === stylingData.parameters.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          value={param.name}
                          onChange={(e) => updateParameter(param.id, 'name', e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-48 font-semibold"
                        />
                        <Badge variant="secondary">
                          {param.options?.length || 0} options
                        </Badge>
                        {/* Input Type Selector */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={param.input_type || 'image_only'}
                            onValueChange={(v) => updateParameter(param.id, 'input_type', v)}
                          >
                            <SelectTrigger className="w-36 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="image_only">
                                <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> Image Only</span>
                              </SelectItem>
                              <SelectItem value="text_only">
                                <span className="flex items-center gap-1"><Type className="h-3 w-3" /> Text Only</span>
                              </SelectItem>
                              <SelectItem value="image_and_text">
                                <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /><Type className="h-3 w-3" /> Image + Text</span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={param.is_required}
                            onCheckedChange={(v) => updateParameter(param.id, 'is_required', v)}
                          />
                          <Label className="text-xs">Required</Label>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-500 hover:bg-red-50"
                          onClick={(e) => { e.stopPropagation(); deleteParameter(param.id); }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        {expandedParams[param.id] ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>

                    {/* Parameter Options */}
                    {expandedParams[param.id] && (
                      <div className="p-4 bg-white">
                        {/* Text Label for text_only and image_and_text */}
                        {(param.input_type === 'text_only' || param.input_type === 'image_and_text') && (
                          <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <Label className="text-xs font-medium text-purple-700 flex items-center gap-1 mb-2">
                              <Type className="h-3 w-3" />
                              Text Field Configuration
                            </Label>
                            <Input
                              value={param.text_label || ''}
                              onChange={(e) => updateParameter(param.id, 'text_label', e.target.value)}
                              placeholder="Text field label/placeholder (e.g., 'Enter monogram text')"
                              className="text-sm"
                              data-testid={`text-label-${param.id}`}
                            />
                          </div>
                        )}

                        {/* Options grid (hidden for text_only) */}
                        {param.input_type !== 'text_only' && (
                          <>
                            <div className="flex items-center justify-between mb-3">
                              <Label className="font-medium">Options</Label>
                              <Button size="sm" variant="outline" onClick={() => addOption(param.id)}>
                                <Plus className="h-3 w-3 mr-1" />
                                Add Option
                              </Button>
                            </div>
                        
                            {param.options?.length > 0 ? (
                              <div className="space-y-2">
                                {param.options.map((option, optionIndex) => (
                                  <div key={option.id}>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                      {/* Move Up/Down Buttons */}
                                      <div className="flex flex-col gap-0.5">
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                                          onClick={() => moveOption(param.id, optionIndex, 'up')}
                                          disabled={optionIndex === 0}
                                        >
                                          <ArrowUp className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-5 w-5 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                                          onClick={() => moveOption(param.id, optionIndex, 'down')}
                                          disabled={optionIndex === param.options.length - 1}
                                        >
                                          <ArrowDown className="h-3 w-3" />
                                        </Button>
                                      </div>
                                  
                                      {/* Option Name */}
                                      <Input
                                        value={option.name}
                                        onChange={(e) => updateOption(param.id, option.id, 'name', e.target.value)}
                                        placeholder="Option name"
                                        className="text-sm h-8 w-40"
                                      />
                                  
                                      {/* Image URL */}
                                      <div className="flex-1">
                                        <Input
                                          value={option.image || ''}
                                          onChange={(e) => updateOption(param.id, option.id, 'image', e.target.value)}
                                          placeholder="Image URL"
                                          className="text-xs h-8"
                                        />
                                      </div>
                                  
                                      {/* Surcharge */}
                                      <div className="flex items-center gap-1">
                                        <Label className="text-xs text-gray-500">+₹</Label>
                                        <Input
                                          type="number"
                                          value={option.surcharge || 0}
                                          onChange={(e) => updateOption(param.id, option.id, 'surcharge', parseFloat(e.target.value) || 0)}
                                          className="text-xs h-8 w-20"
                                        />
                                      </div>
                                  
                                      {/* Default Toggle */}
                                      <div className="flex items-center gap-1">
                                        <Switch
                                          checked={option.is_default}
                                          onCheckedChange={(v) => {
                                            param.options.forEach(o => {
                                              if (o.id !== option.id) {
                                                updateOption(param.id, o.id, 'is_default', false);
                                              }
                                            });
                                            updateOption(param.id, option.id, 'is_default', v);
                                          }}
                                        />
                                        <Label className="text-xs">Default</Label>
                                      </div>

                                      {/* Text Input Toggle */}
                                      <div className="flex items-center gap-1 border-l pl-2 ml-1">
                                        <Switch
                                          checked={option.has_text_input || false}
                                          onCheckedChange={(v) => updateOption(param.id, option.id, 'has_text_input', v)}
                                          data-testid={`text-toggle-${option.id}`}
                                        />
                                        <Label className="text-xs text-purple-600 whitespace-nowrap flex items-center gap-0.5">
                                          <Type className="h-3 w-3" />
                                          Txt
                                        </Label>
                                      </div>

                                      {/* Sub-Options Toggle */}
                                      <div className="flex items-center gap-1 border-l pl-2 ml-1">
                                        <Switch
                                          checked={option.has_sub_options || false}
                                          onCheckedChange={(v) => toggleSubOptions(param.id, option.id, v)}
                                          data-testid={`sub-toggle-${option.id}`}
                                        />
                                        <Label className="text-xs text-blue-600 whitespace-nowrap flex items-center gap-0.5">
                                          <Layers className="h-3 w-3" />
                                          Sub
                                        </Label>
                                      </div>
                                  
                                      {/* Delete Button */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-6 w-6 text-red-500 hover:bg-red-50"
                                        onClick={() => deleteOption(param.id, option.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>

                                    {/* Text Input Label (shown when has_text_input is on) */}
                                    {option.has_text_input && (
                                      <div className="ml-10 mt-1 mb-1 pl-4 py-2">
                                        <Input
                                          value={option.text_label || ''}
                                          onChange={(e) => updateOption(param.id, option.id, 'text_label', e.target.value)}
                                          placeholder="Text field label (e.g., 'Enter custom text')"
                                          className="text-xs h-7 border-purple-300 bg-purple-50"
                                          data-testid={`option-text-label-${option.id}`}
                                        />
                                      </div>
                                    )}

                                    {/* Sub-Options Section */}
                                    {option.has_sub_options && (
                                      <div className="ml-10 mt-1 mb-2 border-l-2 border-blue-300 pl-4 py-2 bg-blue-50/50 rounded-r-lg">
                                        <div className="flex items-center justify-between mb-2">
                                          <Label className="text-xs font-medium text-blue-700 flex items-center gap-1">
                                            <Layers className="h-3 w-3" />
                                            Sub-Options for "{option.name}"
                                          </Label>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 text-xs border-blue-300 text-blue-600 hover:bg-blue-100"
                                            onClick={() => addSubOption(param.id, option.id)}
                                            data-testid={`add-sub-${option.id}`}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Add Sub-Option
                                          </Button>
                                        </div>
                                        {(option.sub_options || []).length > 0 ? (
                                          <div className="space-y-1.5">
                                            {(option.sub_options || []).map((sub) => (
                                              <div key={sub.id}>
                                                <div className="flex items-center gap-2 p-2 bg-white rounded border border-blue-200">
                                                  <Input
                                                    value={sub.name}
                                                    onChange={(e) => updateSubOption(param.id, option.id, sub.id, 'name', e.target.value)}
                                                    placeholder="Sub-option name"
                                                    className="text-xs h-7 w-32"
                                                  />
                                                  <div className="flex-1">
                                                    <Input
                                                      value={sub.image || ''}
                                                      onChange={(e) => updateSubOption(param.id, option.id, sub.id, 'image', e.target.value)}
                                                      placeholder="Image URL"
                                                      className="text-xs h-7"
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Label className="text-xs text-gray-500">+₹</Label>
                                                    <Input
                                                      type="number"
                                                      value={sub.surcharge || 0}
                                                      onChange={(e) => updateSubOption(param.id, option.id, sub.id, 'surcharge', parseFloat(e.target.value) || 0)}
                                                      className="text-xs h-7 w-16"
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1">
                                                    <Switch
                                                      checked={sub.is_default}
                                                      onCheckedChange={(v) => {
                                                        (option.sub_options || []).forEach(s => {
                                                          if (s.id !== sub.id) updateSubOption(param.id, option.id, s.id, 'is_default', false);
                                                        });
                                                        updateSubOption(param.id, option.id, sub.id, 'is_default', v);
                                                      }}
                                                    />
                                                    <Label className="text-xs">Def</Label>
                                                  </div>
                                                  {/* Text Input Toggle for Sub-Option */}
                                                  <div className="flex items-center gap-1 border-l pl-1">
                                                    <Switch
                                                      checked={sub.has_text_input || false}
                                                      onCheckedChange={(v) => updateSubOption(param.id, option.id, sub.id, 'has_text_input', v)}
                                                    />
                                                    <Label className="text-xs text-purple-600"><Type className="h-3 w-3" /></Label>
                                                  </div>
                                                  <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-5 w-5 text-red-500 hover:bg-red-50"
                                                    onClick={() => deleteSubOption(param.id, option.id, sub.id)}
                                                  >
                                                    <X className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                                {/* Sub-option text label */}
                                                {sub.has_text_input && (
                                                  <div className="mt-1 ml-4">
                                                    <Input
                                                      value={sub.text_label || ''}
                                                      onChange={(e) => updateSubOption(param.id, option.id, sub.id, 'text_label', e.target.value)}
                                                      placeholder="Text field label"
                                                      className="text-xs h-6 border-purple-300 bg-purple-50"
                                                    />
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <p className="text-xs text-blue-400 text-center py-2">No sub-options yet</p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-center py-4 text-sm">
                                No options yet. Add options above.
                              </p>
                            )}
                          </>
                        )}

                        {/* text_only info */}
                        {param.input_type === 'text_only' && (
                          <div className="text-center py-4 text-sm text-purple-500">
                            This parameter uses a free text input — no image options needed.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {(!stylingData.parameters || stylingData.parameters.length === 0) && (
                  <p className="text-gray-500 text-center py-8">
                    No style parameters configured. Add parameters like Lapel, Pocket, Vent, etc.
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default StyleManagementPage;
