import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import api from '../../lib/api';
import { 
  ArrowLeft, 
  Home,
  ShoppingCart,
  Camera,
  Upload,
  X,
  Check,
  Image as ImageIcon,
  ChevronRight,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const ProductConfigurePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    customer, 
    category, 
    product: initialProduct, 
    existingConfiguration, 
    returnMode,
    editMode,
    editOrderId,
    prefillStyling,
    prefillMeasurements
  } = location.state || {};
  
  // State for full product with config_fields (fetched if needed)
  const [product, setProduct] = useState(initialProduct);
  const [loadingProduct, setLoadingProduct] = useState(false);
  
  // Get config fields from product (dynamic based on admin configuration)
  const configFields = product?.config_fields || [];
  
  // Initialize configuration sets based on existing data or create empty set
  const [configSets, setConfigSets] = useState(() => {
    if (existingConfiguration && Array.isArray(existingConfiguration)) {
      return existingConfiguration;
    } else if (existingConfiguration && typeof existingConfiguration === 'object') {
      // Convert old single format to new array format
      return [{ id: Date.now(), ...existingConfiguration }];
    }
    // Create empty set with all config fields initialized
    const emptySet = { id: Date.now(), size_category: 'A' };
    configFields.forEach(field => {
      emptySet[field.name.toLowerCase()] = {};
    });
    return [emptySet];
  });

  // Fabric lookup state (base price per meter)
  const [fabricInfo, setFabricInfo] = useState({});
  const [lookingUpFabric, setLookingUpFabric] = useState({});

  // Lookup fabric by code to get base price
  const lookupFabric = async (setIndex, code) => {
    if (!code || code.length < 2) return;
    
    setLookingUpFabric(prev => ({ ...prev, [setIndex]: true }));
    try {
      const response = await api.get(`/pricing/fabrics/lookup/${code}`);
      setFabricInfo(prev => ({
        ...prev,
        [setIndex]: response.data
      }));
    } catch (error) {
      // Fabric code not found
      setFabricInfo(prev => ({
        ...prev,
        [setIndex]: null
      }));
    } finally {
      setLookingUpFabric(prev => ({ ...prev, [setIndex]: false }));
    }
  };

  // Fetch product config_fields if not present (needed for edit mode)
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (initialProduct && !initialProduct.config_fields && initialProduct.id) {
        setLoadingProduct(true);
        try {
          const response = await api.get('/products/categories');
          // Find the product in categories
          for (const cat of response.data) {
            const foundProduct = cat.products?.find(p => p.id === initialProduct.id);
            if (foundProduct) {
              setProduct({
                ...initialProduct,
                config_fields: foundProduct.config_fields || []
              });
              break;
            }
          }
        } catch (error) {
          console.error('Error fetching product details:', error);
        } finally {
          setLoadingProduct(false);
        }
      }
    };
    
    fetchProductDetails();
  }, [initialProduct]);

  // Show loading while fetching product details
  if (loadingProduct) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  // Redirect if no product selected
  if (!customer || !product) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">No product selected</p>
          <Button onClick={() => navigate('/reseller/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // If no config fields defined and not loading, show message
  if (configFields.length === 0 && !loadingProduct) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">No configuration fields defined for this product</p>
          <p className="text-sm text-gray-400 mb-4">Please configure fields in the admin panel</p>
          <Button onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleFieldChange = (setIndex, fieldName, key, value) => {
    setConfigSets(prev => {
      const updated = [...prev];
      const fieldKey = fieldName.toLowerCase();
      updated[setIndex] = {
        ...updated[setIndex],
        [fieldKey]: {
          ...updated[setIndex][fieldKey],
          [key]: value
        }
      };
      return updated;
    });
  };

  const handleImageCapture = (setIndex, fieldName) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => handleFileSelect(setIndex, fieldName, e.target.files[0]);
    input.click();
  };

  const handleFileUpload = (setIndex, fieldName) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => handleFileSelect(setIndex, fieldName, e.target.files[0]);
    input.click();
  };

  const handleFileSelect = (setIndex, fieldName, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      handleFieldChange(setIndex, fieldName, 'image', e.target.result);
      handleFieldChange(setIndex, fieldName, 'fileName', file.name);
      toast.success(`${fieldName} image uploaded!`);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (setIndex, fieldName) => {
    handleFieldChange(setIndex, fieldName, 'image', null);
    handleFieldChange(setIndex, fieldName, 'fileName', null);
  };

  const addConfigSet = () => {
    const newSet = { id: Date.now() };
    configFields.forEach(field => {
      newSet[field.name.toLowerCase()] = {};
    });
    setConfigSets(prev => [...prev, newSet]);
    toast.success('New configuration set added');
  };

  const removeConfigSet = (setIndex) => {
    if (configSets.length <= 1) {
      toast.error('You need at least one configuration set');
      return;
    }
    setConfigSets(prev => prev.filter((_, idx) => idx !== setIndex));
    toast.success('Configuration set removed');
  };

  const isConfigSetComplete = (configSet) => {
    // Check if all required fields have codes
    // Support both 'is_required' and 'required' field names from API
    return configFields.every(field => {
      const isRequired = field.is_required || field.required;
      if (isRequired) {
        const fieldKey = field.name.toLowerCase();
        return configSet[fieldKey]?.code && configSet[fieldKey].code.trim() !== '';
      }
      return true;
    });
  };

  const allRequiredFieldsComplete = () => {
    return configSets.every(set => isConfigSetComplete(set));
  };

  const handleProceed = () => {
    if (!allRequiredFieldsComplete()) {
      const requiredFields = configFields.filter(f => f.is_required || f.required).map(f => f.name).join(', ');
      toast.error(`Please enter codes for required fields: ${requiredFields}`);
      return;
    }

    // Enrich configuration with fabric details (image, name, SKU, base_price)
    const enrichedConfigSets = configSets.map((configSet, idx) => {
      const enriched = { ...configSet };
      Object.keys(enriched).forEach(fieldKey => {
        const isFabricField = fieldKey === 'fabric' || configFields.find(f => f.id === fieldKey)?.name?.toLowerCase().includes('fabric');
        if (isFabricField && fabricInfo[idx]) {
          enriched[fieldKey] = {
            ...enriched[fieldKey],
            name: fabricInfo[idx].name,
            image: fabricInfo[idx].image_url || fabricInfo[idx].image,
            sku: fabricInfo[idx].sku || enriched[fieldKey]?.sku,
            base_price: fabricInfo[idx].base_price_per_meter,
          };
        }
      });
      return enriched;
    });

    // Navigate to styling page with enriched configuration
    navigate('/reseller/styling', {
      state: {
        customer,
        category,
        product,
        configuration: enrichedConfigSets,
        returnMode,
        editMode,
        editOrderId,
        prefillStyling,
        prefillMeasurements
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1829]">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <img 
              src={LOGO_URL} 
              alt="Suits India" 
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {returnMode ? 'Edit Configuration' : 'Configure'} {product.name}
            </h1>
            <p className="text-sm text-gray-500">
              Customer: {customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/dashboard')}
            className="h-10 w-10"
          >
            <Home className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" className="h-10 w-10">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Product Info */}
          <div className="bg-[#1a2744] rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-[#c9a962]/20 flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-[#c9a962]" />
                </div>
                <div>
                  <h2 className="text-white text-xl font-semibold">{product.name}</h2>
                  <p className="text-white/60 text-sm">{category?.name}</p>
                  <p className="text-white/40 text-xs mt-1">
                    {configFields.length} configuration field{configFields.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <Button
                onClick={addConfigSet}
                className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                data-testid="add-config-set-btn"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Set
              </Button>
            </div>
          </div>

          {/* Configuration Sets */}
          <div className="space-y-8">
            {configSets.map((configSet, setIndex) => (
              <div 
                key={configSet.id}
                className={`bg-[#1a2744] rounded-xl overflow-hidden transition-all ${
                  isConfigSetComplete(configSet) ? 'ring-2 ring-green-500' : ''
                }`}
              >
                {/* Set Header */}
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0f1829]">
                  <div className="flex items-center gap-3">
                    <h3 className="text-white font-semibold text-lg">
                      Set #{setIndex + 1}
                    </h3>
                    {isConfigSetComplete(configSet) && (
                      <div className="bg-green-500 rounded-full p-1">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  {configSets.length > 1 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeConfigSet(setIndex)}
                      data-testid={`remove-config-set-${setIndex}`}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>

                {/* Dynamic Fields for this set */}
                <div className="p-4 space-y-4">
                  {/* Size Category Selector */}
                  <div className="bg-[#0f1829] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-white font-medium">Customer Size Category</h4>
                      <span className="text-red-400 text-sm">*Required</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {['A', 'B', 'C'].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => {
                            setConfigSets(prev => {
                              const updated = [...prev];
                              updated[setIndex] = { ...updated[setIndex], size_category: size };
                              return updated;
                            });
                          }}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            configSet.size_category === size
                              ? 'border-[#c9a962] bg-[#c9a962]/20 text-[#c9a962]'
                              : 'border-white/20 text-white/60 hover:border-white/40'
                          }`}
                          data-testid={`size-category-${size}-${setIndex}`}
                        >
                          <div className="font-bold text-lg">Size {size}</div>
                          <div className="text-xs opacity-75">
                            {size === 'A' && '34-46'}
                            {size === 'B' && '47-54'}
                            {size === 'C' && '55+'}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {configFields.map((field) => {
                    const fieldKey = field.name.toLowerCase();
                    const fieldData = configSet[fieldKey] || {};
                    // Check for image support
                    const showImage = field.input_type === 'code_and_image' || 
                                     field.type === 'code_with_image' ||
                                     field.type === 'code_and_image';
                    // Check for required
                    const isRequired = field.is_required || field.required;
                    // Check if this is a fabric field
                    const isFabricField = fieldKey === 'fabric' || field.name.toLowerCase().includes('fabric');
                    const fabric = isFabricField ? fabricInfo[setIndex] : null;
                    
                    return (
                      <div key={field.id || field.name} className="bg-[#0f1829] rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <h4 className="text-white font-medium">{field.name}</h4>
                          {isRequired ? (
                            <span className="text-red-400 text-sm">*Required</span>
                          ) : (
                            <span className="text-white/40 text-sm">Optional</span>
                          )}
                          {fieldData?.code && (
                            <Check className="h-4 w-4 text-green-400 ml-auto" />
                          )}
                        </div>
                        
                        {isFabricField ? (
                          /* Fabric field: Price Code + SKU + Image */
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Fabric Price Code */}
                              <div className="space-y-2">
                                <Label className="text-white/80">
                                  Fabric Price Code
                                  {isRequired && <span className="text-red-400 ml-1">*</span>}
                                </Label>
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Enter price code (e.g., P001)"
                                    value={fieldData?.code || ''}
                                    onChange={(e) => {
                                      handleFieldChange(setIndex, field.name, 'code', e.target.value);
                                      // Auto-lookup fabric when code changes
                                      if (e.target.value.length >= 2) {
                                        lookupFabric(setIndex, e.target.value);
                                      }
                                    }}
                                    onBlur={(e) => lookupFabric(setIndex, e.target.value)}
                                    className="bg-[#1a2744] border-white/20 text-white placeholder:text-white/40 h-12 flex-1"
                                    data-testid={`fabric-price-code-${setIndex}`}
                                  />
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-12 border-white/20 text-white"
                                    onClick={() => lookupFabric(setIndex, fieldData?.code)}
                                    disabled={lookingUpFabric[setIndex]}
                                  >
                                    {lookingUpFabric[setIndex] ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Lookup'}
                                  </Button>
                                </div>
                                
                                {/* Show fabric info from price code lookup */}
                                {fabric && (
                                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                                    <div className="text-green-400 font-medium text-sm">{fabric.name}</div>
                                    <div className="text-white/60 text-xs mt-1">
                                      Base Price: ${fabric.base_price_per_meter}/meter
                                    </div>
                                  </div>
                                )}
                                {fieldData?.code && fabric === null && !lookingUpFabric[setIndex] && (
                                  <div className="text-yellow-400/80 text-xs">
                                    Fabric price code not found in system
                                  </div>
                                )}
                              </div>

                              {/* Fabric SKU - for product identification */}
                              <div className="space-y-2">
                                <Label className="text-white/80">
                                  Fabric SKU
                                  {isRequired && <span className="text-red-400 ml-1">*</span>}
                                </Label>
                                <Input
                                  placeholder="Enter fabric SKU (e.g., FAB-001)"
                                  value={fieldData?.sku || ''}
                                  onChange={(e) => handleFieldChange(setIndex, field.name, 'sku', e.target.value)}
                                  className="bg-[#1a2744] border-white/20 text-white placeholder:text-white/40 h-12"
                                  data-testid={`fabric-sku-${setIndex}`}
                                />
                                <p className="text-white/40 text-xs">Product identification code</p>
                              </div>
                            </div>

                            {/* Fabric Image - full width below */}
                            {showImage && (
                              <div className="space-y-2">
                                <Label className="text-white/80">
                                  Fabric Image
                                  <span className="text-white/40 ml-1 text-xs">(for confirmation)</span>
                                </Label>
                                
                                {fieldData?.image ? (
                                  <div className="relative">
                                    <img 
                                      src={fieldData.image}
                                      alt="Fabric preview"
                                      className="w-full h-32 object-cover rounded-lg"
                                    />
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="absolute top-2 right-2 h-6 w-6"
                                      onClick={() => handleRemoveImage(setIndex, field.name)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleImageCapture(setIndex, field.name)}
                                      size="sm"
                                      className="flex-1 bg-[#c9a962] hover:bg-[#b89952] text-black"
                                    >
                                      <Camera className="h-4 w-4 mr-1" />
                                      Camera
                                    </Button>
                                    <Button
                                      onClick={() => handleFileUpload(setIndex, field.name)}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                                    >
                                      <Upload className="h-4 w-4 mr-1" />
                                      Upload
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          /* Standard layout for Lining/Button fields with Code + SKU + Image */
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Code Input */}
                              <div className="space-y-2">
                                <Label className="text-white/80">
                                  {field.name} Code
                                  {isRequired && <span className="text-red-400 ml-1">*</span>}
                                </Label>
                                <Input
                                  placeholder={`Enter ${field.name.toLowerCase()} code`}
                                  value={fieldData?.code || ''}
                                  onChange={(e) => handleFieldChange(setIndex, field.name, 'code', e.target.value)}
                                  className="bg-[#1a2744] border-white/20 text-white placeholder:text-white/40 h-12"
                                  data-testid={`${fieldKey}-code-${setIndex}`}
                                />
                              </div>

                              {/* SKU Input */}
                              <div className="space-y-2">
                                <Label className="text-white/80">
                                  {field.name} SKU
                                  <span className="text-white/40 ml-1 text-xs">(optional)</span>
                                </Label>
                                <Input
                                  placeholder={`Enter ${field.name.toLowerCase()} SKU`}
                                  value={fieldData?.sku || ''}
                                  onChange={(e) => handleFieldChange(setIndex, field.name, 'sku', e.target.value)}
                                  className="bg-[#1a2744] border-white/20 text-white placeholder:text-white/40 h-12"
                                  data-testid={`${fieldKey}-sku-${setIndex}`}
                                />
                                <p className="text-white/40 text-xs">Product identification code</p>
                              </div>
                            </div>

                            {/* Image Upload (full width below) */}
                            {showImage && (
                              <div className="space-y-2">
                                <Label className="text-white/80">
                                  {field.name} Image
                                  <span className="text-white/40 ml-1 text-xs">(optional)</span>
                                </Label>
                                
                                {fieldData?.image ? (
                                  <div className="relative">
                                    <img 
                                      src={fieldData.image}
                                      alt={`${field.name} preview`}
                                      className="w-full h-32 object-cover rounded-lg"
                                    />
                                    <Button
                                      size="icon"
                                      variant="destructive"
                                      className="absolute top-2 right-2 h-6 w-6"
                                      onClick={() => handleRemoveImage(setIndex, field.name)}
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => handleImageCapture(setIndex, field.name)}
                                      size="sm"
                                      className="flex-1 bg-[#c9a962] hover:bg-[#b89952] text-black"
                                    >
                                      <Camera className="h-4 w-4 mr-1" />
                                      Camera
                                    </Button>
                                    <Button
                                      onClick={() => handleFileUpload(setIndex, field.name)}
                                      variant="outline"
                                      size="sm"
                                      className="flex-1 border-white/20 text-white hover:bg-white/10"
                                    >
                                      <Upload className="h-4 w-4 mr-1" />
                                      Upload
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="bg-[#0a0f1a] p-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Info */}
          <div className="text-sm text-white/60">
            {configSets.length} set{configSets.length > 1 ? 's' : ''} configured
          </div>

          {/* Proceed Button */}
          <Button
            onClick={handleProceed}
            disabled={!allRequiredFieldsComplete()}
            className={`h-12 px-8 text-lg ${
              allRequiredFieldsComplete()
                ? 'bg-[#c9a962] hover:bg-[#b89952] text-black'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
            data-testid="proceed-to-styling-btn"
          >
            {returnMode ? 'Update & Continue' : 'Next: Styling'}
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default ProductConfigurePage;
