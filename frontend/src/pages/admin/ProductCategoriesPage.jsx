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
  Package, 
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
  Settings2,
  Camera
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Default config field types
const FIELD_TYPES = [
  { value: 'code_with_image', label: 'Code + Image (Camera/Upload)' },
  { value: 'text', label: 'Text Input' },
  { value: 'dropdown', label: 'Dropdown Select' },
  { value: 'number', label: 'Number Input' },
];

const ProductCategoriesPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [measurementTypes, setMeasurementTypes] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedProducts, setExpandedProducts] = useState({});
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newProductName, setNewProductName] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchMeasurementTypes();
  }, []);

  const fetchMeasurementTypes = async () => {
    try {
      const response = await axios.get(`${API_URL}/measurements/config`);
      setMeasurementTypes(response.data?.product_types || []);
    } catch (error) {
      console.error('Error fetching measurement types:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_URL}/products/categories`);
      setCategories(response.data);
      const expanded = {};
      response.data.forEach(cat => expanded[cat.id] = true);
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const toggleProductConfig = (productKey) => {
    setExpandedProducts(prev => ({ ...prev, [productKey]: !prev[productKey] }));
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    const newCategory = {
      id: newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
      name: newCategoryName,
      icon: 'default',
      description: '',
      products: [],
      is_active: true,
      order: categories.length,
    };
    setCategories(prev => [...prev, newCategory]);
    setExpandedCategories(prev => ({ ...prev, [newCategory.id]: true }));
    setNewCategoryName('');
    toast.success('Category added!');
  };

  const handleDeleteCategory = (categoryId) => {
    if (window.confirm('Delete this category and all its products?')) {
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      toast.success('Category removed!');
    }
  };

  const handleUpdateCategory = (categoryId, field, value) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId ? { ...cat, [field]: value } : cat
    ));
  };

  const handleAddProduct = (categoryId) => {
    if (!newProductName.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    const newProduct = {
      id: newProductName.toLowerCase().replace(/\s+/g, '-'),
      name: newProductName,
      description: '',
      image: '',
      is_active: true,
      config_fields: [
        { id: 'fabric', name: 'Fabric', type: 'code_with_image', required: true },
      ],
    };
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, products: [...(cat.products || []), newProduct] }
        : cat
    ));
    setNewProductName('');
    toast.success('Product added!');
  };

  const handleDeleteProduct = (categoryId, productId) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { ...cat, products: cat.products.filter(p => p.id !== productId) }
        : cat
    ));
    toast.success('Product removed!');
  };

  const handleUpdateProduct = (categoryId, productId, field, value) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { 
            ...cat, 
            products: cat.products.map(p => 
              p.id === productId ? { ...p, [field]: value } : p
            )
          }
        : cat
    ));
  };

  // Config field management
  const handleAddConfigField = (categoryId, productId) => {
    const newField = {
      id: `field-${Date.now()}`,
      name: 'New Field',
      type: 'code_with_image',
      required: false,
    };
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { 
            ...cat, 
            products: cat.products.map(p => 
              p.id === productId 
                ? { ...p, config_fields: [...(p.config_fields || []), newField] }
                : p
            )
          }
        : cat
    ));
  };

  const handleUpdateConfigField = (categoryId, productId, fieldId, key, value) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { 
            ...cat, 
            products: cat.products.map(p => 
              p.id === productId 
                ? { 
                    ...p, 
                    config_fields: (p.config_fields || []).map(f =>
                      f.id === fieldId ? { ...f, [key]: value } : f
                    )
                  }
                : p
            )
          }
        : cat
    ));
  };

  const handleDeleteConfigField = (categoryId, productId, fieldId) => {
    setCategories(prev => prev.map(cat => 
      cat.id === categoryId 
        ? { 
            ...cat, 
            products: cat.products.map(p => 
              p.id === productId 
                ? { ...p, config_fields: (p.config_fields || []).filter(f => f.id !== fieldId) }
                : p
            )
          }
        : cat
    ));
  };

  const handleMoveCategory = (index, direction) => {
    const newCategories = [...categories];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;
    [newCategories[index], newCategories[newIndex]] = [newCategories[newIndex], newCategories[index]];
    setCategories(newCategories);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/products/categories/bulk`, categories, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('All changes saved!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
            <Package className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Product Categories</h1>
              <p className="text-[#666]">Manage categories, products, and their configuration fields</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-[#c9a962] hover:bg-[#b89952] text-black">
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>

        {/* Add Category */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                placeholder="Category name (e.g., 'Accessories')"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                className="flex-1"
              />
              <Button onClick={handleAddCategory} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Categories List */}
        <div className="space-y-4">
          {categories.map((category, categoryIndex) => (
            <Card key={category.id} className="overflow-hidden">
              {/* Category Header */}
              <div 
                className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); handleMoveCategory(categoryIndex, 'up'); }}
                      disabled={categoryIndex === 0}>
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={(e) => { e.stopPropagation(); handleMoveCategory(categoryIndex, 'down'); }}
                      disabled={categoryIndex === categories.length - 1}>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <GripVertical className="h-5 w-5 text-gray-400" />
                  
                  {editingCategory === category.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <Input value={category.name} onChange={(e) => handleUpdateCategory(category.id, 'name', e.target.value)} className="w-48" />
                      <Button size="icon" variant="ghost" onClick={() => setEditingCategory(null)}>
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <Button size="icon" variant="ghost" className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); setEditingCategory(category.id); }}>
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  
                  <Badge variant="secondary">{category.products?.length || 0} products</Badge>
                  <Badge variant={category.is_active ? "default" : "outline"} className={category.is_active ? "bg-green-100 text-green-800" : ""}>
                    {category.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm"
                    onClick={(e) => { e.stopPropagation(); handleUpdateCategory(category.id, 'is_active', !category.is_active); }}>
                    {category.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-50"
                    onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {expandedCategories[category.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {/* Category Content */}
              {expandedCategories[category.id] && (
                <CardContent className="pt-4">
                  {/* Add Product */}
                  <div className="flex gap-2 mb-4">
                    <Input
                      placeholder="New product name"
                      value={editingCategory === `add-${category.id}` ? newProductName : ''}
                      onChange={(e) => { setEditingCategory(`add-${category.id}`); setNewProductName(e.target.value); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { handleAddProduct(category.id); setEditingCategory(null); } }}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={() => { handleAddProduct(category.id); setEditingCategory(null); }}
                      className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                      <Plus className="h-4 w-4 mr-1" /> Add Product
                    </Button>
                  </div>

                  {/* Products List */}
                  {category.products && category.products.length > 0 ? (
                    <div className="space-y-3">
                      {category.products.map((product) => {
                        const productKey = `${category.id}-${product.id}`;
                        return (
                          <div key={product.id} className="border rounded-lg overflow-hidden">
                            {/* Product Header */}
                            <div 
                              className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                              onClick={() => toggleProductConfig(productKey)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="font-medium">{product.name}</span>
                                {product.description && <span className="text-sm text-gray-500">- {product.description}</span>}
                                <Badge variant="outline" className="text-xs">
                                  <Settings2 className="h-3 w-3 mr-1" />
                                  {product.config_fields?.length || 0} fields
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={product.is_active ? "default" : "outline"} 
                                  className={`cursor-pointer ${product.is_active ? "bg-green-100 text-green-800" : ""}`}
                                  onClick={(e) => { e.stopPropagation(); handleUpdateProduct(category.id, product.id, 'is_active', !product.is_active); }}>
                                  {product.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteProduct(category.id, product.id); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                {expandedProducts[productKey] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            {/* Product Config Fields */}
                            {expandedProducts[productKey] && (
                              <div className="p-4 bg-white border-t">
                                {/* Measurement Type Selector */}
                                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                                    <Package className="h-4 w-4 text-blue-600" />
                                    Linked Measurement Type
                                  </Label>
                                  <Select
                                    value={product.measurement_type || 'none'}
                                    onValueChange={(v) => handleUpdateProduct(category.id, product.id, 'measurement_type', v === 'none' ? null : v)}
                                  >
                                    <SelectTrigger className="w-full bg-white">
                                      <SelectValue placeholder="Select measurement type..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">-- No measurement type --</SelectItem>
                                      {measurementTypes.map(mt => (
                                        <SelectItem key={mt.id} value={mt.id}>{mt.name}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <p className="text-xs text-blue-600 mt-1">
                                    This determines which measurements are required when ordering this product
                                  </p>
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                  <Label className="text-sm font-semibold flex items-center gap-2">
                                    <Camera className="h-4 w-4 text-[#c9a962]" />
                                    Configuration Fields (Fabric, Lining, etc.)
                                  </Label>
                                  <Button size="sm" variant="outline" onClick={() => handleAddConfigField(category.id, product.id)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add Field
                                  </Button>
                                </div>

                                {product.config_fields && product.config_fields.length > 0 ? (
                                  <div className="space-y-2">
                                    {product.config_fields.map((field, fieldIndex) => (
                                      <div key={field.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                        <span className="text-xs text-gray-500 w-6">{fieldIndex + 1}.</span>
                                        <Input
                                          placeholder="Field name"
                                          value={field.name}
                                          onChange={(e) => handleUpdateConfigField(category.id, product.id, field.id, 'name', e.target.value)}
                                          className="w-32 h-8 text-sm"
                                        />
                                        <Select
                                          value={field.type}
                                          onValueChange={(v) => handleUpdateConfigField(category.id, product.id, field.id, 'type', v)}
                                        >
                                          <SelectTrigger className="w-48 h-8 text-sm">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {FIELD_TYPES.map(t => (
                                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <div className="flex items-center gap-1">
                                          <Switch
                                            checked={field.required}
                                            onCheckedChange={(v) => handleUpdateConfigField(category.id, product.id, field.id, 'required', v)}
                                          />
                                          <span className="text-xs text-gray-500">Required</span>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500"
                                          onClick={() => handleDeleteConfigField(category.id, product.id, field.id)}>
                                          <X className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 text-center py-2">
                                    No configuration fields. Add fields like Fabric, Lining, Button, etc.
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No products. Add one above.</p>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>

        {categories.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No categories yet. Add your first category above.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default ProductCategoriesPage;
