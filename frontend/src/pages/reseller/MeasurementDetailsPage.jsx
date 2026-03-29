import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Home,
  ShoppingCart,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const MeasurementDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, photos, skipPhotos } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [measurementConfig, setMeasurementConfig] = useState(null);
  
  // Form state
  const [height, setHeight] = useState('');
  const [heightUnit, setHeightUnit] = useState('cms');
  const [weight, setWeight] = useState('');
  const [weightUnit, setWeightUnit] = useState('kgs');
  const [selectedProducts, setSelectedProducts] = useState(['jacket']);
  const [measurements, setMeasurements] = useState({});
  const [preference, setPreference] = useState('');
  const [bodyPreferences, setBodyPreferences] = useState({});
  const [showPreferences, setShowPreferences] = useState(false);

  useEffect(() => {
    if (customer?.customer_id) {
      fetchMeasurementData();
    }
  }, [customer?.customer_id]);

  const fetchMeasurementData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('reseller_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      // Fetch config and existing measurements in parallel
      const [configRes, existingRes] = await Promise.all([
        axios.get(`${API_URL}/measurements/config`, { headers }),
        axios.get(`${API_URL}/measurements/${customer.customer_id}`, { headers })
      ]);
      
      setMeasurementConfig(configRes.data);
      
      // Initialize measurements with default values
      const initialMeasurements = {};
      configRes.data.fields?.forEach(field => {
        initialMeasurements[field.id] = field.default_value || '';
      });
      
      // Check if customer has existing measurements
      const existing = existingRes.data;
      if (existing && existing.measurements && Object.keys(existing.measurements).length > 0) {
        // Merge existing measurements over defaults
        Object.keys(existing.measurements).forEach(key => {
          if (existing.measurements[key] !== '' && existing.measurements[key] !== null) {
            initialMeasurements[key] = existing.measurements[key];
          }
        });
        
        // Also restore other saved data
        if (existing.height?.value) {
          setHeight(existing.height.value);
          setHeightUnit(existing.height.unit || 'cms');
        }
        if (existing.weight?.value) {
          setWeight(existing.weight.value);
          setWeightUnit(existing.weight.unit || 'kgs');
        }
        if (existing.selected_products?.length > 0) {
          setSelectedProducts(existing.selected_products);
        }
        if (existing.preference) {
          setPreference(existing.preference);
        }
        if (existing.body_preferences) {
          setBodyPreferences(existing.body_preferences);
        }
        
        toast.info('Loaded existing measurements for this customer');
      }
      
      setMeasurements(initialMeasurements);
    } catch (error) {
      console.error('Error fetching measurement data:', error);
      toast.error('Failed to load measurement data');
    } finally {
      setLoading(false);
    }
  };

  // Guard - after hooks
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">No customer selected</p>
          <Button onClick={() => navigate('/reseller/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleProductToggle = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(p => p !== productId)
        : [...prev, productId]
    );
  };

  const handleMeasurementChange = (fieldId, value) => {
    setMeasurements(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleFinish = async () => {
    // Validate that at least some measurements are filled
    const filledMeasurements = Object.values(measurements).filter(v => v && v !== '');
    if (filledMeasurements.length === 0) {
      toast.warning('Please enter at least one measurement before saving');
      return;
    }
    
    try {
      setSaving(true);
      
      const measurementData = {
        customer_id: customer.customer_id,
        height: { value: height, unit: heightUnit },
        weight: { value: weight, unit: weightUnit },
        selected_products: selectedProducts,
        measurements: measurements,
        preference: preference,
        body_preferences: bodyPreferences,
        photos: photos || [],
        created_at: new Date().toISOString()
      };
      
      console.log('Saving measurements:', measurementData);
      
      const token = localStorage.getItem('reseller_token');
      const response = await axios.post(`${API_URL}/measurements`, measurementData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Save response:', response.data);
      
      toast.success('Measurements saved successfully! Redirecting to dashboard...');
      
      // Short delay to let user see the success message
      setTimeout(() => {
        navigate('/reseller/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error saving measurements:', error);
      toast.error('Failed to save measurements. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#1a2744]" />
      </div>
    );
  }

  // Get product types from config or use defaults
  const productTypes = measurementConfig?.product_types || [];
  const allFields = measurementConfig?.fields || [];

  // Calculate which measurement fields to show based on selected products
  const getRequiredMeasurementIds = () => {
    const requiredIds = new Set();
    
    selectedProducts.forEach(productId => {
      const productType = productTypes.find(pt => pt.id === productId);
      if (productType?.measurement_ids) {
        productType.measurement_ids.forEach(id => requiredIds.add(id));
      }
    });
    
    return requiredIds;
  };

  const requiredMeasurementIds = getRequiredMeasurementIds();
  
  // Filter fields to show only those required by selected products
  const visibleFields = allFields.filter(field => 
    !field.is_text && requiredMeasurementIds.has(field.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a2744] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="h-10 w-auto"
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-orange-400 hover:bg-white/10">
              <Camera className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-orange-400 hover:bg-white/10">
              <Upload className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-orange-400 hover:bg-white/10"
              onClick={() => navigate('/reseller/dashboard')}
            >
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <Button 
            className="bg-[#1a2744] border border-white/30 text-white text-xs hover:bg-white/10"
            onClick={() => navigate('/admin/login')}
          >
            Go to B2B<br/>Admin Page
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-orange-500 px-3 py-2 rounded text-white text-sm">
            {customer?.name} - {customer?.phone || ''}
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white text-sm">
            Add Customer
          </Button>
          <Button variant="ghost" size="icon" className="text-white">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
          {/* Title */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <h1 className="text-lg font-medium text-gray-800">
              Step 2: Share Basic Measurements & Body Description
            </h1>
            <Button 
              variant="outline"
              onClick={() => navigate('/reseller/measurement/photos', { state: { customer } })}
            >
              &lt; Back
            </Button>
          </div>

          {/* Customer Name */}
          <p className="text-gray-500 mb-6">{customer?.name}</p>

          {/* Basic Details Section */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-600 mb-4 pb-2 border-b">
              Share your basic details
            </h2>
            
            <div className="grid grid-cols-2 gap-8 mb-6">
              {/* Height */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-16">Height</label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm cursor-pointer ${heightUnit === 'cms' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
                        onClick={() => setHeightUnit('cms')}>cms</span>
                  <Switch 
                    checked={heightUnit === 'feet'}
                    onCheckedChange={(checked) => setHeightUnit(checked ? 'feet' : 'cms')}
                  />
                  <span className={`text-sm cursor-pointer ${heightUnit === 'feet' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
                        onClick={() => setHeightUnit('feet')}>feet</span>
                </div>
                <Input
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="168 cms"
                  className="w-32"
                  data-testid="height-input"
                />
              </div>
              
              {/* Weight */}
              <div className="flex items-center gap-4">
                <label className="text-sm text-gray-600 w-16">Weight</label>
                <div className="flex items-center gap-2">
                  <span className={`text-sm cursor-pointer ${weightUnit === 'kgs' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
                        onClick={() => setWeightUnit('kgs')}>kgs</span>
                  <Switch 
                    checked={weightUnit === 'lbs'}
                    onCheckedChange={(checked) => setWeightUnit(checked ? 'lbs' : 'kgs')}
                  />
                  <span className={`text-sm cursor-pointer ${weightUnit === 'lbs' ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
                        onClick={() => setWeightUnit('lbs')}>lbs</span>
                </div>
                <Input
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="90"
                  className="w-32"
                  data-testid="weight-input"
                />
              </div>
            </div>

            {/* Product Selection */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-500 mb-3">Select products to measure:</p>
              <div className="grid grid-cols-4 gap-4">
                {productTypes.map(product => (
                  <label 
                    key={product.id} 
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={() => handleProductToggle(product.id)}
                      data-testid={`product-${product.id}`}
                    />
                    <span className="text-sm text-gray-700">{product.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Measurements Section */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-600 mb-4 pb-2 border-b">
              Measurements {selectedProducts.length > 0 ? `(${visibleFields.length} required)` : '(Select a product above)'}
            </h2>
            
            {visibleFields.length > 0 ? (
              <div className="grid grid-cols-4 gap-4">
                {visibleFields.map(field => (
                  <button
                    key={field.id}
                    className="p-4 rounded-lg text-center transition-all bg-[#1a2744] text-white hover:bg-[#2a3754]"
                    onClick={() => {
                      const value = prompt(`Enter ${field.name}:`, measurements[field.id] || field.default_value || '');
                      if (value !== null) {
                        handleMeasurementChange(field.id, value);
                      }
                    }}
                    data-testid={`measurement-${field.id}`}
                  >
                    {field.name}-{measurements[field.id] || field.default_value || '?'}
                  </button>
                ))}
                
                {/* Body Description Button */}
                <button
                  className="p-4 rounded-lg text-center bg-purple-100 text-purple-800 border-2 border-purple-300 hover:bg-purple-200"
                  onClick={() => setShowPreferences(true)}
                  data-testid="measurement-preference"
                >
                  BODY DESCRIPTION{Object.keys(bodyPreferences).length > 0 ? ` (${Object.keys(bodyPreferences).length})` : ''}
                </button>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
                Please select at least one product type above to see required measurements.
              </p>
            )}
          </div>

          {/* Body Description Modal */}
          {showPreferences && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                  <h2 className="text-xl font-semibold text-gray-800">BODY DESCRIPTION</h2>
                  <button 
                    onClick={() => setShowPreferences(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  {(measurementConfig?.body_preferences || []).map((pref) => (
                    <div key={pref.id} className="border rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-3">{pref.name}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {(pref.options || []).map((option, optIdx) => {
                          const optionData = typeof option === 'object' ? option : { name: option, image: '' };
                          const optionName = optionData.name || option;
                          const optionImage = optionData.image || '';
                          const isSelected = bodyPreferences[pref.id] === optionName || bodyPreferences[pref.id] === option;
                          
                          return (
                            <button
                              key={optIdx}
                              className={`p-3 rounded-lg text-sm transition-all border-2 ${
                                isSelected
                                  ? 'bg-[#1a2744] text-white border-[#1a2744]' 
                                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                              }`}
                              onClick={() => setBodyPreferences(prev => ({
                                ...prev,
                                [pref.id]: optionName
                              }))}
                            >
                              {optionImage && (
                                <img 
                                  src={optionImage} 
                                  alt={optionName}
                                  className="w-full h-16 object-cover rounded mb-2"
                                />
                              )}
                              <span className="font-medium">{optionName}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {/* Notes field */}
                  <div className="border rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Additional Notes</p>
                    <textarea
                      className="w-full border rounded-lg p-3 text-sm"
                      rows={3}
                      placeholder="Any other body description notes or special requirements..."
                      value={preference}
                      onChange={(e) => setPreference(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-4 border-t bg-gray-50 flex justify-end">
                  <Button 
                    onClick={() => setShowPreferences(false)}
                    className="bg-[#1a2744] text-white"
                  >
                    Save Body Description
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Finish Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-amber-600">
              * Click "Save Measurements" to save your changes
            </p>
            <Button 
              className="bg-[#1a2744] text-white hover:bg-[#2a3754] px-12 py-3 font-semibold"
              onClick={handleFinish}
              disabled={saving || selectedProducts.length === 0}
              data-testid="finish-btn"
            >
              {saving ? 'Saving...' : 'Save Measurements'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MeasurementDetailsPage;
