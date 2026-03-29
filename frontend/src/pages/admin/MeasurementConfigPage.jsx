import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Ruler, 
  Plus, 
  Trash2, 
  Save, 
  GripVertical,
  Loader2,
  Check,
  X,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const MeasurementConfigPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({ fields: [], product_types: [], body_preferences: [] });

  // Default body preference options
  const defaultPreferences = [
    { id: 'back-shape', name: 'Back Shape', options: ['Normal', 'Hunched', 'Erect', 'Slight Forward Stoop'] },
    { id: 'arms', name: 'Arms', options: ['Normal', 'Forward', 'Backward'] },
    { id: 'seat-type', name: 'Seat Type', options: ['Normal', 'Flat', 'Prominent'] },
    { id: 'shoulder-type', name: 'Shoulder Type', options: ['Normal', 'Square', 'Sloping'] },
    { id: 'chest-type', name: 'Chest Type', options: ['Normal', 'Pigeon', 'Hollow'] },
    { id: 'thigh-type', name: 'Thigh Type', options: ['Normal', 'Heavy', 'Thin'] },
    { id: 'shoulder-angle', name: 'Shoulder Angle', options: ['Normal', 'Left High', 'Right High'] },
    { id: 'stomach-type', name: 'Stomach Type', options: ['Normal', 'Flat', 'Prominent'] },
    { id: 'trouser-position', name: 'Trouser Position', options: ['Normal', 'Above Waist', 'Below Waist'] }
  ];

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/measurements/config`);
      // Ensure body_preferences exists
      const data = {
        ...response.data,
        body_preferences: response.data.body_preferences || defaultPreferences
      };
      setConfig(data);
    } catch (error) {
      console.error('Error fetching config:', error);
      toast.error('Failed to load measurement config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await axios.put(`${API_URL}/measurements/config`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Configuration saved!');
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  // Field management
  const addField = () => {
    const newField = {
      id: `field-${Date.now()}`,
      name: 'NEW FIELD',
      default_value: 0,
      unit: 'inches',
      is_required: true,
      is_text: false,
      order: config.fields.length + 1
    };
    setConfig(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }));
  };

  const updateField = (index, key, value) => {
    setConfig(prev => {
      const newFields = [...prev.fields];
      newFields[index] = { ...newFields[index], [key]: value };
      return { ...prev, fields: newFields };
    });
  };

  const deleteField = (index) => {
    if (window.confirm('Delete this measurement field?')) {
      setConfig(prev => ({
        ...prev,
        fields: prev.fields.filter((_, i) => i !== index)
      }));
    }
  };

  // Move field up/down
  const moveField = (index, direction) => {
    setConfig(prev => {
      const newFields = [...prev.fields];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= newFields.length) return prev;
      
      // Swap positions
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      
      // Update order values
      newFields.forEach((field, i) => {
        field.order = i + 1;
      });
      
      return { ...prev, fields: newFields };
    });
  };

  // Product type management
  const addProductType = () => {
    const newType = {
      id: `product-${Date.now()}`,
      name: 'New Product',
      measurement_ids: []
    };
    setConfig(prev => ({
      ...prev,
      product_types: [...prev.product_types, newType]
    }));
    toast.success('Product type added! Configure its measurements below.');
  };

  const updateProductType = (index, key, value) => {
    setConfig(prev => {
      const newProductTypes = [...prev.product_types];
      newProductTypes[index] = { ...newProductTypes[index], [key]: value };
      return { ...prev, product_types: newProductTypes };
    });
  };

  const deleteProductType = (index) => {
    if (window.confirm('Delete this product type?')) {
      setConfig(prev => ({
        ...prev,
        product_types: prev.product_types.filter((_, i) => i !== index)
      }));
    }
  };

  const toggleMeasurementForProduct = (productIndex, measurementId) => {
    setConfig(prev => {
      const newProductTypes = [...prev.product_types];
      const product = { ...newProductTypes[productIndex] };
      const currentIds = product.measurement_ids || [];
      
      if (currentIds.includes(measurementId)) {
        product.measurement_ids = currentIds.filter(id => id !== measurementId);
      } else {
        product.measurement_ids = [...currentIds, measurementId];
      }
      
      newProductTypes[productIndex] = product;
      return { ...prev, product_types: newProductTypes };
    });
  };

  // Body Preference management
  const addPreference = () => {
    const newPref = {
      id: `pref-${Date.now()}`,
      name: 'New Preference',
      options: ['Option 1', 'Option 2']
    };
    setConfig(prev => ({
      ...prev,
      body_preferences: [...(prev.body_preferences || []), newPref]
    }));
  };

  const updatePreference = (index, key, value) => {
    setConfig(prev => {
      const newPrefs = [...(prev.body_preferences || [])];
      newPrefs[index] = { ...newPrefs[index], [key]: value };
      return { ...prev, body_preferences: newPrefs };
    });
  };

  const deletePreference = (index) => {
    if (window.confirm('Delete this preference?')) {
      setConfig(prev => ({
        ...prev,
        body_preferences: (prev.body_preferences || []).filter((_, i) => i !== index)
      }));
    }
  };

  const addOptionToPreference = (prefIndex) => {
    setConfig(prev => {
      const newPrefs = [...(prev.body_preferences || [])];
      const pref = { ...newPrefs[prefIndex] };
      pref.options = [...(pref.options || []), 'New Option'];
      newPrefs[prefIndex] = pref;
      return { ...prev, body_preferences: newPrefs };
    });
  };

  const updatePreferenceOption = (prefIndex, optIndex, value, image = null) => {
    setConfig(prev => {
      const newPrefs = [...(prev.body_preferences || [])];
      const pref = { ...newPrefs[prefIndex] };
      const newOptions = [...(pref.options || [])];
      
      // Store as object with name and image
      if (image !== null) {
        newOptions[optIndex] = { name: value, image: image };
      } else {
        // If just updating name, preserve existing image
        const existingOption = newOptions[optIndex];
        const existingImage = typeof existingOption === 'object' ? existingOption.image : '';
        newOptions[optIndex] = { name: value, image: existingImage };
      }
      
      pref.options = newOptions;
      newPrefs[prefIndex] = pref;
      return { ...prev, body_preferences: newPrefs };
    });
  };

  const deletePreferenceOption = (prefIndex, optIndex) => {
    setConfig(prev => {
      const newPrefs = [...(prev.body_preferences || [])];
      const pref = { ...newPrefs[prefIndex] };
      pref.options = (pref.options || []).filter((_, i) => i !== optIndex);
      newPrefs[prefIndex] = pref;
      return { ...prev, body_preferences: newPrefs };
    });
  };

  const resetToDefaultPreferences = () => {
    if (window.confirm('Reset to default body description categories?')) {
      setConfig(prev => ({
        ...prev,
        body_preferences: defaultPreferences
      }));
      toast.success('Reset to default body descriptions');
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
            <Ruler className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Measurement Configuration</h1>
              <p className="text-[#666]">Configure measurement fields and product types</p>
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

        {/* Measurement Fields */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Measurement Fields</CardTitle>
                <CardDescription>
                  Configure the measurement fields shown in the measurement form
                </CardDescription>
              </div>
              <Button onClick={addField} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                {/* Move Up/Down Buttons */}
                <div className="flex flex-col gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                    onClick={() => moveField(index, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-gray-400 hover:text-gray-600 hover:bg-gray-200"
                    onClick={() => moveField(index, 'down')}
                    disabled={index === config.fields.length - 1}
                  >
                    <ArrowDown className="h-3 w-3" />
                  </Button>
                </div>
                
                <Input
                  value={field.name}
                  onChange={(e) => updateField(index, 'name', e.target.value.toUpperCase())}
                  placeholder="Field Name"
                  className="w-40 font-medium"
                />
                
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Default:</Label>
                  <Input
                    type="number"
                    value={field.default_value || 0}
                    onChange={(e) => updateField(index, 'default_value', parseFloat(e.target.value) || 0)}
                    className="w-20"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Unit:</Label>
                  <Input
                    value={field.unit || 'inches'}
                    onChange={(e) => updateField(index, 'unit', e.target.value)}
                    className="w-20"
                  />
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.is_required}
                    onCheckedChange={(v) => updateField(index, 'is_required', v)}
                  />
                  <Label className="text-xs">Required</Label>
                </div>
                
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.is_text}
                    onCheckedChange={(v) => updateField(index, 'is_text', v)}
                  />
                  <Label className="text-xs">Text Input</Label>
                </div>
                
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-red-500 hover:bg-red-50 ml-auto"
                  onClick={() => deleteField(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            {config.fields.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No measurement fields configured. Add fields above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Product Types */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Types</CardTitle>
                <CardDescription>
                  Configure which measurements are required for each product type. Click on measurement badges to toggle.
                </CardDescription>
              </div>
              <Button 
                onClick={addProductType} 
                className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                data-testid="add-product-type-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Product Type
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {config.product_types.map((productType, productIndex) => (
              <div key={productType.id} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center gap-4 mb-4">
                  <Input
                    value={productType.name}
                    onChange={(e) => updateProductType(productIndex, 'name', e.target.value)}
                    placeholder="Product Name"
                    className="w-48 font-medium"
                    data-testid={`product-type-name-${productIndex}`}
                  />
                  <span className="text-sm text-gray-500">
                    ({(productType.measurement_ids || []).length} measurements selected)
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50 ml-auto"
                    onClick={() => deleteProductType(productIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {config.fields.filter(f => !f.is_text).map(field => {
                    const isSelected = (productType.measurement_ids || []).includes(field.id);
                    return (
                      <button
                        key={field.id}
                        onClick={() => toggleMeasurementForProduct(productIndex, field.id)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-[#c9a962] text-black ring-2 ring-[#c9a962] ring-offset-1'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                        data-testid={`toggle-${productType.id}-${field.id}`}
                      >
                        {isSelected && <Check className="h-4 w-4" />}
                        {field.name}
                      </button>
                    );
                  })}
                </div>
                
                {config.fields.filter(f => !f.is_text).length === 0 && (
                  <p className="text-gray-400 text-sm">
                    Add measurement fields above first.
                  </p>
                )}
              </div>
            ))}
            
            {config.product_types.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No product types configured. Click "Add Product Type" above to add one.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Body Description */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>BODY DESCRIPTION</CardTitle>
                <CardDescription>
                  Configure body description options with images that can be selected during measurement (e.g., Back Shape, Shoulder Type)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={resetToDefaultPreferences} 
                  variant="outline"
                >
                  Reset to Defaults
                </Button>
                <Button 
                  onClick={addPreference} 
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(config.body_preferences || []).map((pref, prefIndex) => (
              <div key={pref.id} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center gap-4 mb-3">
                  <Input
                    value={pref.name}
                    onChange={(e) => updatePreference(prefIndex, 'name', e.target.value)}
                    placeholder="Category Name (e.g., Shoulder Type)"
                    className="w-48 font-medium"
                  />
                  <span className="text-sm text-gray-500">
                    ({(pref.options || []).length} options)
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addOptionToPreference(prefIndex)}
                    className="ml-auto"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Option
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-50"
                    onClick={() => deletePreference(prefIndex)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(pref.options || []).map((option, optIndex) => {
                    const optionData = typeof option === 'object' ? option : { name: option, image: '' };
                    const optionName = optionData.name || option;
                    const optionImage = optionData.image || '';
                    
                    return (
                      <div key={optIndex} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <Input
                            value={optionName}
                            onChange={(e) => updatePreferenceOption(prefIndex, optIndex, e.target.value, optionImage)}
                            className="h-8 text-sm font-medium"
                            placeholder="Option name"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-gray-400 hover:text-red-500 ml-1"
                            onClick={() => deletePreferenceOption(prefIndex, optIndex)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Image upload/URL input */}
                        <div className="space-y-2">
                          {optionImage ? (
                            <div className="relative group">
                              <img 
                                src={optionImage} 
                                alt={optionName}
                                className="w-full h-20 object-cover rounded border"
                              />
                              <Button
                                size="icon"
                                variant="destructive"
                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => updatePreferenceOption(prefIndex, optIndex, optionName, '')}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="border-2 border-dashed border-gray-300 rounded p-2 text-center">
                              <ImageIcon className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                              <Input
                                type="text"
                                placeholder="Paste image URL"
                                className="h-7 text-xs"
                                onBlur={(e) => {
                                  if (e.target.value) {
                                    updatePreferenceOption(prefIndex, optIndex, optionName, e.target.value);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && e.target.value) {
                                    updatePreferenceOption(prefIndex, optIndex, optionName, e.target.value);
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {(config.body_preferences || []).length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No body description categories configured. Click "Add Category" or "Reset to Defaults" above.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default MeasurementConfigPage;
