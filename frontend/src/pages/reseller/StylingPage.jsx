import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { toast } from 'sonner';
import api from '../../lib/api';
import { 
  ArrowLeft, 
  Home,
  ShoppingCart,
  Loader2,
  Eye,
  EyeOff,
  Check,
  Upload,
  X,
  Image,
  Plus,
  Trash2,
  Save,
  FileDown,
  Bookmark,
  Lock,
  LockOpen
} from 'lucide-react';

const StylingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    customer, 
    category, 
    product, 
    configuration, 
    measurements,
    // For returning customers (copy order)
    prefillStyling,
    prefillMeasurements,
    sourceOrderId,
    returnMode,
    // For edit mode
    editMode,
    editOrderId
  } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [stylingData, setStylingData] = useState(null);
  const [resellerSettings, setResellerSettings] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedSubOptions, setSelectedSubOptions] = useState({});
  const [selectedConstruction, setSelectedConstruction] = useState(null);
  const [activeParameter, setActiveParameter] = useState(null);
  const [showPricing, setShowPricing] = useState(true);
  const [comments, setComments] = useState('');
  const [stylingImages, setStylingImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fullProduct, setFullProduct] = useState(product); // Store full product with config_fields
  
  // Fabric pricing state - to hold calculated fabric costs per set
  const [fabricPricing, setFabricPricing] = useState({});
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  
  // Cost view state - default shows customer prices (with margins)
  const [showCostView, setShowCostView] = useState(false);
  const [showSecretCodeModal, setShowSecretCodeModal] = useState(false);
  const [secretCodeInput, setSecretCodeInput] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  // Template state
  const { user, isStaff, getParentResellerEmail } = useAuth();
  const resellerId = (isStaff() ? getParentResellerEmail() : user?.email) || 'default';
  const [templates, setTemplates] = useState([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  
  // Text input values for text_only, image_and_text, and per-option text fields
  const [textInputValues, setTextInputValues] = useState({});
  
  // Configuration sets (dynamic fields based on product config)
  const [configSets, setConfigSets] = useState(() => {
    if (Array.isArray(configuration)) {
      return configuration;
    } else if (configuration && typeof configuration === 'object') {
      return [{ id: Date.now(), ...configuration }];
    }
    return [];
  });

  const productId = product?.id;

  // Fetch templates for this product
  const fetchTemplates = async () => {
    try {
      const response = await api.get('/styling/templates');
      // Filter templates for this product
      const productTemplates = response.data.filter(
        t => t.product_id === productId || t.is_global
      );
      setTemplates(productTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Load a template
  const loadTemplate = (template) => {
    if (template.options) {
      setSelectedOptions(template.options);
    }
    if (template.sub_options) {
      setSelectedSubOptions(template.sub_options);
    }
    if (template.text_inputs) {
      setTextInputValues(template.text_inputs);
    }
    if (template.construction) {
      setSelectedConstruction(template.construction);
    }
    setShowTemplateDialog(false);
    toast.success(`Loaded template: ${template.name}`);
  };

  // Save current selections as template
  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      await api.post('/styling/templates', {
        name: newTemplateName,
        product_id: productId,
        product_name: product?.name,
        options: selectedOptions,
        sub_options: selectedSubOptions,
        text_inputs: textInputValues,
        construction: selectedConstruction,
        user_id: user?.id,
        is_global: false
      });
      toast.success('Template saved successfully!');
      setShowSaveTemplateDialog(false);
      setNewTemplateName('');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  // Delete a template
  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`/styling/templates/${templateId}`);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  useEffect(() => {
    if (productId) {
      fetchData();
      fetchTemplates();
    } else {
      setLoading(false);
    }
  }, [productId]);

  // Pre-fill styling options if copying from existing order
  useEffect(() => {
    if (prefillStyling && stylingData) {
      // Pre-fill styling options
      if (prefillStyling.options) {
        setSelectedOptions(prefillStyling.options);
      }
      if (prefillStyling.sub_options) {
        setSelectedSubOptions(prefillStyling.sub_options);
      }
      if (prefillStyling.text_inputs) {
        setTextInputValues(prefillStyling.text_inputs);
      }
      if (prefillStyling.construction) {
        setSelectedConstruction(prefillStyling.construction);
      }
      if (prefillStyling.comments) {
        setComments(prefillStyling.comments);
      }
      if (prefillStyling.images) {
        setStylingImages(prefillStyling.images);
      }
    }
  }, [prefillStyling, stylingData]);

  // Fetch fabric pricing from backend when configuration changes
  const fetchFabricPricing = async () => {
    if (!product?.id) return;
    
    setCalculatingPrice(true);
    const newPricing = {};
    
    // Always fetch at least one pricing calculation even without fabric
    const setsToProcess = configSets.length > 0 ? configSets : [{}];
    
    for (let i = 0; i < setsToProcess.length; i++) {
      const set = setsToProcess[i];
      const fabricField = set.fabric || set.Fabric;
      const fabricCode = fabricField?.code || '';  // Can be empty
      const sizeCategory = set.size_category || 'A';
      
      try {
        // Get construction type from selected construction
        const constructionType = selectedConstruction?.id || '';
        
        // Calculate base styling total (surcharges only)
        let stylingTotal = 0;
        Object.entries(selectedOptions).forEach(([paramId, option]) => {
          if (option?.surcharge) {
            stylingTotal += option.surcharge;
          }
          // Add sub-option surcharge
          const subOpt = selectedSubOptions[paramId];
          if (subOpt?.surcharge) {
            stylingTotal += subOpt.surcharge;
          }
        });
        
        const response = await api.post('/pricing/calculate-price', {
          fabric_price_code: fabricCode,
          size_category: sizeCategory,
          product_id: product.id,
          styling_total: stylingTotal,
          construction_type: constructionType
        });
        
        newPricing[i] = response.data;
      } catch (error) {
        console.error(`Error calculating price for set ${i}:`, error);
        newPricing[i] = null;
      }
    }
    
    setFabricPricing(newPricing);
    setCalculatingPrice(false);
  };

  // Trigger pricing fetch when configuration or styling changes
  useEffect(() => {
    if (product?.id) {
      fetchFabricPricing();
    }
  }, [configSets, selectedConstruction, selectedOptions, selectedSubOptions, product?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [stylingRes, settingsRes, categoriesRes] = await Promise.all([
        api.get(`/styling/parameters/${productId}`),
        api.get(`/reseller-settings/${resellerId}`),
        api.get('/products/categories')
      ]);
      
      setStylingData(stylingRes.data);
      setResellerSettings(settingsRes.data);
      setShowPricing(settingsRes.data?.show_pricing ?? true);
      
      // Find the full product with config_fields from categories
      if (categoriesRes.data && category?.id) {
        const categoryData = categoriesRes.data.find(c => c.id === category.id);
        if (categoryData?.products) {
          const productData = categoryData.products.find(p => p.id === productId);
          if (productData) {
            setFullProduct({ ...product, config_fields: productData.config_fields || [] });
          }
        }
      }
      
      // Set default selections (only if not pre-filling from copied order)
      if (!prefillStyling) {
        const defaults = {};
        stylingRes.data.parameters?.forEach(param => {
          const defaultOption = param.options?.find(o => o.is_default);
          if (defaultOption) {
            defaults[param.id] = defaultOption;
          }
        });
        setSelectedOptions(defaults);
        
        // Set default construction
        const defaultConstruction = stylingRes.data.constructions?.find(c => c.is_default);
        if (defaultConstruction) {
          setSelectedConstruction(defaultConstruction);
        }
      }
      
      // Set first parameter as active
      if (stylingRes.data.parameters?.length > 0) {
        setActiveParameter(stylingRes.data.parameters[0].id);
      }
      
    } catch (error) {
      console.error('Error fetching styling data:', error);
      toast.error('Failed to load styling options');
    } finally {
      setLoading(false);
    }
  };

  // Guard - after all hooks
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

  const handleOptionSelect = (parameterId, option) => {
    setSelectedOptions(prev => ({
      ...prev,
      [parameterId]: option
    }));
    // Clear sub-option when parent option changes
    if (!option.has_sub_options) {
      setSelectedSubOptions(prev => {
        const next = { ...prev };
        delete next[parameterId];
        return next;
      });
    } else {
      // Auto-select default sub-option if available
      const defaultSub = (option.sub_options || []).find(s => s.is_default);
      if (defaultSub) {
        setSelectedSubOptions(prev => ({ ...prev, [parameterId]: defaultSub }));
      } else {
        setSelectedSubOptions(prev => {
          const next = { ...prev };
          delete next[parameterId];
          return next;
        });
      }
    }
  };

  const handleSubOptionSelect = (parameterId, subOption) => {
    setSelectedSubOptions(prev => ({
      ...prev,
      [parameterId]: subOption
    }));
  };

  const handleConstructionSelect = (construction) => {
    setSelectedConstruction(construction);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }
    
    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setStylingImages(prev => [...prev, {
          id: Date.now(),
          name: file.name,
          url: reader.result
        }]);
        toast.success('Image uploaded!');
        setUploadingImage(false);
      };
      reader.onerror = () => {
        toast.error('Failed to read image');
        setUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload image');
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (imageId) => {
    setStylingImages(prev => prev.filter(img => img.id !== imageId));
  };

  const togglePricing = async () => {
    try {
      await api.patch(`/reseller-settings/${resellerId}/toggle-pricing`, {});
      setShowPricing(!showPricing);
    } catch (error) {
      setShowPricing(!showPricing);
    }
  };

  // Configuration set management
  const handleDeleteConfigSet = (setIndex) => {
    if (configSets.length <= 1) {
      toast.error('You need at least one configuration set. Use "Add Set" to add a new one first.');
      return;
    }
    setConfigSets(prev => prev.filter((_, idx) => idx !== setIndex));
    toast.success('Configuration set removed');
  };

  const handleAddFabric = () => {
    // Navigate to configuration page with current state
    // Use fullProduct which has config_fields loaded from API
    navigate('/reseller/customize/configure', {
      state: {
        customer,
        category,
        product: fullProduct,
        existingConfiguration: configSets,
        returnMode: true
      }
    });
  };

  // Calculate pricing - shows CUSTOMER prices by default (with reseller margins)
  // When showCostView is true, shows COST prices (without reseller margins)
  // Backend calculates: Base → +Admin Margin → Reseller Cost → +Reseller Margin → Customer Price
  const calculatePricing = () => {
    if (!stylingData) return { cmt: 0, fabric: 0, styling: 0, shipping: 0, total: 0, total_reseller_cost: 0, total_customer_price: 0 };
    
    // Get pricing from backend which includes both admin and reseller margins
    let fabric = 0;
    let cmt = 0;
    let styling = 0;
    let shipping = 0;
    let hasBackendData = false;
    
    // Also track reseller cost (what reseller pays admin)
    let fabric_reseller = 0;
    let cmt_reseller = 0;
    let styling_reseller = 0;
    let shipping_reseller = 0;
    
    // And customer price (what customer pays reseller)
    let fabric_customer = 0;
    let cmt_customer = 0;
    let styling_customer = 0;
    let shipping_customer = 0;
    
    Object.values(fabricPricing).forEach(fp => {
      if (fp && fp.breakdown) {
        hasBackendData = true;
        
        // Always track both costs
        fabric_reseller += fp.breakdown.fabric?.cost_before_reseller_margin || 0;
        cmt_reseller += fp.breakdown.cmt?.cost_before_reseller_margin || 0;
        styling_reseller += fp.breakdown.styling?.cost_before_reseller_margin || 0;
        shipping_reseller += fp.breakdown.shipping?.cost_before_reseller_margin || 0;
        
        fabric_customer += fp.breakdown.fabric?.final_cost || 0;
        cmt_customer += fp.breakdown.cmt?.final_cost || 0;
        styling_customer += fp.breakdown.styling?.final_cost || 0;
        shipping_customer += fp.breakdown.shipping?.final_cost || 0;
        
        if (showCostView) {
          // Show RESELLER'S COST (after admin margin, before reseller margin)
          fabric += fp.breakdown.fabric?.cost_before_reseller_margin || 0;
          cmt += fp.breakdown.cmt?.cost_before_reseller_margin || 0;
          styling += fp.breakdown.styling?.cost_before_reseller_margin || 0;
          shipping += fp.breakdown.shipping?.cost_before_reseller_margin || 0;
        } else {
          // Show CUSTOMER PRICE (after both admin and reseller margins)
          fabric += fp.breakdown.fabric?.final_cost || 0;
          cmt += fp.breakdown.cmt?.final_cost || 0;
          styling += fp.breakdown.styling?.final_cost || 0;
          shipping += fp.breakdown.shipping?.final_cost || 0;
        }
      }
    });
    
    // Only use fallback if backend pricing is not yet available (initial load)
    // This fallback does NOT include admin margins, so should only be used temporarily
    if (!hasBackendData && Object.keys(fabricPricing).length === 0) {
      // Show loading state or basic estimates without margins
      // These values will be replaced once backend returns data
      let cmtBase = stylingData.base_cmt_price || 0;
      if (selectedConstruction) {
        cmtBase += selectedConstruction.base_price || 0;
      }
      cmt = cmtBase * Math.max(configSets.length || 1, 1);
      
      let stylingBase = 0;
      Object.entries(selectedOptions).forEach(([paramId, option]) => {
        if (option?.surcharge) {
          stylingBase += option.surcharge;
        }
        const subOpt = selectedSubOptions[paramId];
        if (subOpt?.surcharge) {
          stylingBase += subOpt.surcharge;
        }
      });
      styling = stylingBase;
      
      // Note: These are BASE prices without any margins - they will update once backend responds
    }
    
    const total_reseller_cost = Math.round(fabric_reseller + cmt_reseller + styling_reseller + shipping_reseller);
    const total_customer_price = Math.round(fabric_customer + cmt_customer + styling_customer + shipping_customer);
    
    return {
      cmt: Math.round(cmt),
      fabric: Math.round(fabric),
      styling: Math.round(styling),
      shipping: Math.round(shipping),
      total: Math.round(cmt + fabric + styling + shipping),
      // For payment purposes - store both totals
      total_reseller_cost: total_reseller_cost,  // What reseller pays admin
      total_customer_price: total_customer_price  // What customer pays reseller
    };
  };

  // Verify secret code to unlock cost view
  const handleVerifySecretCode = async () => {
    if (!secretCodeInput.trim()) {
      toast.error('Please enter the secret code');
      return;
    }
    
    setVerifyingCode(true);
    try {
      // Use different endpoint for staff vs reseller
      if (isStaff && isStaff()) {
        await api.post(`/staff/${user.email}/verify-secret-code`, {
          code: secretCodeInput
        });
      } else {
        await api.post(`/reseller-settings/${resellerId}/verify-cost-code`, {
          code: secretCodeInput
        });
      }
      setShowCostView(true);
      setShowSecretCodeModal(false);
      setSecretCodeInput('');
      toast.success('Cost view unlocked');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid secret code');
    } finally {
      setVerifyingCode(false);
    }
  };

  // Handle lock button click
  const handleCostViewToggle = () => {
    if (showCostView) {
      // Switch back to customer view
      setShowCostView(false);
      toast.info('Switched to customer pricing');
    } else {
      // Open secret code modal
      setShowSecretCodeModal(true);
    }
  };

  const pricing = calculatePricing();

  const handleAddToCart = () => {
    // Build cart item
    const cartItem = {
      id: Date.now().toString(), // Unique ID for cart item
      customer,
      category,
      product,
      configuration: configSets,
      styling: {
        options: selectedOptions,
        sub_options: selectedSubOptions,
        text_inputs: textInputValues,
        construction: selectedConstruction,
        comments,
        images: stylingImages
      },
      pricing,
      prefillMeasurements,
      sourceOrderId,
      addedAt: new Date().toISOString()
    };
    
    // Get existing cart items from localStorage
    const existingCart = JSON.parse(localStorage.getItem('reseller_cart') || '[]');
    
    // Add new item to cart
    existingCart.push(cartItem);
    
    // Save back to localStorage
    localStorage.setItem('reseller_cart', JSON.stringify(existingCart));
    
    // Show success message - DON'T navigate away
    toast.success(`Added to cart! (${existingCart.length} items in cart)`, {
      action: {
        label: 'View Cart',
        onClick: () => navigate('/reseller/cart', { state: { customer } })
      }
    });
    
    // User can now continue to add to WIP or add more items
  };

  const handleAddToWIP = async () => {
    try {
      const orderData = {
        customer_id: customer.customer_id,
        customer_name: customer.name,
        items: [{
          product_id: product.id,
          product_name: product.name,
          category_id: category?.id,
          category_name: category?.name,
          measurement_type: fullProduct?.measurement_type || null,
          configuration: configSets,
          styling: {
            options: selectedOptions,
            sub_options: selectedSubOptions,
            text_inputs: textInputValues,
            construction: selectedConstruction,
            comments,
            images: stylingImages
          },
          pricing: pricing,
          linked_measurements: prefillMeasurements || null,
          measurement_linked: !!prefillMeasurements,
          source_order_id: sourceOrderId || null
        }]
      };
      
      if (editMode && editOrderId) {
        // Update existing order
        await api.put(`/orders/${editOrderId}`, orderData);
        toast.success('Order updated successfully!');
      } else {
        // Create new order
        await api.post('/orders', orderData);
        toast.success('Saved to Work in Progress!');
      }
      
      navigate('/reseller/orders', { state: { customer } });
    } catch (error) {
      console.error('Error saving order:', error);
      toast.error('Failed to save order');
    }
  };

  const companyName = resellerSettings?.company_name || 'Suits India';
  const logoUrl = resellerSettings?.logo_url || 'https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png';
  const theme = resellerSettings?.theme || {};

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  const parameters = stylingData?.parameters || [];
  const constructions = stylingData?.constructions || [];
  const activeParam = parameters.find(p => p.id === activeParameter);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: theme.background_color || '#0f1829' }}>
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePricing}
            className="h-10 w-10"
            data-testid="toggle-pricing-btn"
          >
            {showPricing ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
          
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
              src={logoUrl} 
              alt={companyName} 
              className="h-10 w-auto object-contain"
            />
          </div>
          
          <div>
            <h1 className="text-lg font-semibold text-gray-800">{product.name}</h1>
            <p className="text-sm text-gray-500">Customer: {customer?.name}</p>
            {returnMode && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Returning Customer</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Template buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
            className="hidden md:flex items-center gap-1"
            data-testid="load-template-btn"
          >
            <FileDown className="h-4 w-4" />
            Load Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveTemplateDialog(true)}
            className="hidden md:flex items-center gap-1"
            data-testid="save-template-btn"
          >
            <Save className="h-4 w-4" />
            Save Template
          </Button>
          
          <div className="hidden md:flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-lg">
            <span className="text-sm text-gray-600">{customer?.name}</span>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/dashboard')}
            className="h-10 w-10"
          >
            <Home className="h-5 w-5 text-gray-600" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-10 w-10 relative">
            <ShoppingCart className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      {/* Load Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-[#c9a962]" />
              Load Styling Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {templates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No templates saved yet. Create your first template by selecting styling options and clicking "Save Template".</p>
            ) : (
              templates.map(template => (
                <div 
                  key={template.id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1 cursor-pointer" onClick={() => loadTemplate(template)}>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-xs text-gray-500">
                      {template.product_name} • {Object.keys(template.options || {}).length} options
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="h-5 w-5 text-[#c9a962]" />
              Save as Template
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Template Name</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Classic Business Suit"
                className="mt-1"
              />
            </div>
            <p className="text-xs text-gray-500">
              This will save your current styling selections ({Object.keys(selectedOptions).length} options selected)
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>Cancel</Button>
              <Button onClick={saveAsTemplate} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Parameters */}
        <aside className="w-28 bg-[#1a2744] flex flex-col overflow-y-auto">
          {/* Load Template Button */}
          <button
            onClick={() => setShowTemplateDialog(true)}
            className="px-2 py-3 bg-[#c9a962] text-black text-xs font-medium hover:bg-[#b89952] flex items-center justify-center gap-1"
            data-testid="sidebar-load-template-btn"
          >
            <Bookmark className="h-3 w-3" />
            Load Template
          </button>
          
          {parameters.map((param) => (
            <button
              key={param.id}
              onClick={() => setActiveParameter(param.id)}
              className={`px-2 py-4 text-left border-l-4 transition-all ${
                activeParameter === param.id
                  ? 'bg-[#c9a962] border-[#c9a962] text-black font-medium'
                  : 'border-transparent text-white/80 hover:bg-white/10'
              }`}
              data-testid={`param-${param.id}`}
            >
              <span className="text-xs leading-tight block">{param.name}</span>
              {(selectedOptions[param.id] || (param.input_type === 'text_only' && textInputValues[param.id])) && (
                <Check className="h-3 w-3 mt-1 text-green-400" />
              )}
            </button>
          ))}
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 overflow-y-auto">
          {/* Product Title Bar */}
          <div className="bg-white rounded-lg p-3 mb-4">
            <h2 className="text-center font-semibold text-gray-800">{product.name}</h2>
          </div>

          {/* Configuration Details Section - Dynamic fields */}
          <div className="bg-white rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3 border-b pb-2">
              <h3 className="text-sm font-medium text-gray-500">Configuration Details</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleAddFabric}
                className="text-[#c9a962] border-[#c9a962] hover:bg-[#c9a962] hover:text-black"
                data-testid="add-config-btn"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Set
              </Button>
            </div>
            
            {configSets.length > 0 ? (
              <div className="space-y-4">
                {configSets.map((configSet, setIndex) => {
                  // Get all field keys from this set (excluding 'id')
                  const fieldKeys = Object.keys(configSet).filter(key => key !== 'id');
                  const hasAnyData = fieldKeys.some(key => configSet[key]?.code);
                  
                  if (!hasAnyData) return null;
                  
                  return (
                    <div key={configSet.id || setIndex} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">Set #{setIndex + 1}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteConfigSet(setIndex)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-config-${setIndex}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-4 items-start flex-wrap">
                        {fieldKeys.map(fieldKey => {
                          const fieldData = configSet[fieldKey];
                          if (!fieldData?.code && !fieldData?.sku) return null;
                          
                          const displayName = fieldKey.charAt(0).toUpperCase() + fieldKey.slice(1);
                          
                          return (
                            <div key={fieldKey} className="text-center">
                              {fieldData.image ? (
                                <img 
                                  src={fieldData.image} 
                                  alt={displayName}
                                  className="w-16 h-16 object-cover rounded border"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                                  <Image className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                              {/* Show both Code and SKU */}
                              {fieldData.code && (
                                <p className="text-xs text-gray-600 mt-1 font-mono font-bold">{fieldData.code}</p>
                              )}
                              {fieldData.sku && (
                                <p className="text-xs text-blue-600 font-mono">SKU: {fieldData.sku}</p>
                              )}
                              <p className="text-xs text-gray-400">{displayName}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No configuration</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddFabric}
                  className="mt-2"
                >
                  Add Configuration
                </Button>
              </div>
            )}
          </div>

          {/* Construction Variant Selection */}
          {constructions.length > 0 && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-2">Select Variant</h3>
              <div className="flex gap-2 flex-wrap">
                {constructions.map((construction) => (
                  <Button
                    key={construction.id}
                    variant={selectedConstruction?.id === construction.id ? "default" : "outline"}
                    className={selectedConstruction?.id === construction.id 
                      ? "bg-[#c9a962] hover:bg-[#b89952] text-black" 
                      : ""}
                    onClick={() => handleConstructionSelect(construction)}
                    data-testid={`construction-${construction.id}`}
                  >
                    {construction.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Active Parameter Options */}
          {activeParam && (
            <div className="bg-white rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-2">
                {activeParam.name}
              </h3>

              {/* TEXT ONLY mode — just a text input, no image cards */}
              {activeParam.input_type === 'text_only' ? (
                <div className="py-2" data-testid={`text-only-${activeParam.id}`}>
                  <Input
                    value={textInputValues[activeParam.id] || ''}
                    onChange={(e) => setTextInputValues(prev => ({ ...prev, [activeParam.id]: e.target.value }))}
                    placeholder={activeParam.text_label || `Enter ${activeParam.name}...`}
                    className="text-sm"
                    data-testid={`text-input-${activeParam.id}`}
                  />
                </div>
              ) : (
                <>
                  {/* IMAGE_ONLY or IMAGE_AND_TEXT — show image cards */}
                  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {activeParam.options?.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleOptionSelect(activeParam.id, option)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedOptions[activeParam.id]?.id === option.id
                            ? 'border-[#c9a962] bg-[#c9a962]/10'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        data-testid={`option-${option.id}`}
                      >
                        {option.image ? (
                          <img 
                            src={option.image} 
                            alt={option.name}
                            className="w-full aspect-square object-contain mb-2"
                          />
                        ) : (
                          <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center mb-2">
                            <span className="text-2xl">&#9826;</span>
                          </div>
                        )}
                        {showPricing && option.surcharge > 0 && (
                          <p className="text-xs text-gray-500">Upcharge - {option.surcharge}</p>
                        )}
                        <p className="text-xs font-medium text-gray-800">{option.name}</p>
                        {option.has_sub_options && (option.sub_options || []).length > 0 && (
                          <p className="text-[10px] text-blue-500 mt-0.5">has sub-options</p>
                        )}
                        {option.has_text_input && (
                          <p className="text-[10px] text-purple-500 mt-0.5">+ text</p>
                        )}
                      </button>
                    ))}
                
                    {/* Check Order Notes option */}
                    <button
                      onClick={() => document.getElementById('comments-input')?.focus()}
                      className="p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300"
                    >
                      <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center mb-2">
                        <span className="text-xs font-bold text-center">Check<br/>Order<br/>Notes</span>
                      </div>
                      <p className="text-xs font-medium text-gray-800">Order Notes</p>
                    </button>
                  </div>

                  {/* Per-option text input (when option has_text_input and is selected) */}
                  {(() => {
                    const selectedOpt = selectedOptions[activeParam.id];
                    if (!selectedOpt?.has_text_input) return null;
                    const textKey = `${activeParam.id}__${selectedOpt.id}`;
                    return (
                      <div className="mt-3 pt-3 border-t border-purple-200" data-testid={`option-text-${activeParam.id}`}>
                        <label className="text-xs font-medium text-purple-600 mb-1 block">
                          {selectedOpt.text_label || `Enter details for ${selectedOpt.name}`}
                        </label>
                        <Input
                          value={textInputValues[textKey] || ''}
                          onChange={(e) => setTextInputValues(prev => ({ ...prev, [textKey]: e.target.value }))}
                          placeholder={selectedOpt.text_label || 'Type here...'}
                          className="text-sm border-purple-300"
                          data-testid={`option-text-input-${activeParam.id}`}
                        />
                      </div>
                    );
                  })()}

                  {/* Parameter-level text input (for image_and_text mode) */}
                  {activeParam.input_type === 'image_and_text' && (
                    <div className="mt-3 pt-3 border-t border-purple-200" data-testid={`param-text-${activeParam.id}`}>
                      <label className="text-xs font-medium text-purple-600 mb-1 block">
                        {activeParam.text_label || `Additional notes for ${activeParam.name}`}
                      </label>
                      <Input
                        value={textInputValues[activeParam.id] || ''}
                        onChange={(e) => setTextInputValues(prev => ({ ...prev, [activeParam.id]: e.target.value }))}
                        placeholder={activeParam.text_label || 'Type here...'}
                        className="text-sm border-purple-300"
                        data-testid={`param-text-input-${activeParam.id}`}
                      />
                    </div>
                  )}

                  {/* Sub-Options Section */}
                  {(() => {
                    const selectedOpt = selectedOptions[activeParam.id];
                    if (!selectedOpt?.has_sub_options || !(selectedOpt.sub_options || []).length) return null;
                    return (
                      <div className="mt-4 pt-4 border-t-2 border-blue-200" data-testid={`sub-options-${activeParam.id}`}>
                        <h4 className="text-sm font-medium text-blue-600 mb-3">
                          Select {selectedOpt.name} Sub-Option
                        </h4>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                          {(selectedOpt.sub_options || []).map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleSubOptionSelect(activeParam.id, sub)}
                              className={`p-3 rounded-lg border-2 transition-all ${
                                selectedSubOptions[activeParam.id]?.id === sub.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-blue-300'
                              }`}
                              data-testid={`sub-option-${sub.id}`}
                            >
                              {sub.image ? (
                                <img 
                                  src={sub.image} 
                                  alt={sub.name}
                                  className="w-full aspect-square object-contain mb-2"
                                />
                              ) : (
                                <div className="w-full aspect-square bg-blue-50 rounded flex items-center justify-center mb-2">
                                  <span className="text-lg text-blue-400">&#9826;</span>
                                </div>
                              )}
                              {showPricing && sub.surcharge > 0 && (
                                <p className="text-xs text-gray-500">Upcharge - {sub.surcharge}</p>
                              )}
                              <p className="text-xs font-medium text-gray-800">{sub.name}</p>
                              {sub.has_text_input && (
                                <p className="text-[10px] text-purple-500 mt-0.5">+ text</p>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* Per-sub-option text input */}
                        {(() => {
                          const selectedSub = selectedSubOptions[activeParam.id];
                          if (!selectedSub?.has_text_input) return null;
                          const subTextKey = `${activeParam.id}__${selectedOpt.id}__${selectedSub.id}`;
                          return (
                            <div className="mt-3 pt-3 border-t border-purple-200">
                              <label className="text-xs font-medium text-purple-600 mb-1 block">
                                {selectedSub.text_label || `Enter details for ${selectedSub.name}`}
                              </label>
                              <Input
                                value={textInputValues[subTextKey] || ''}
                                onChange={(e) => setTextInputValues(prev => ({ ...prev, [subTextKey]: e.target.value }))}
                                placeholder={selectedSub.text_label || 'Type here...'}
                                className="text-sm border-purple-300"
                                data-testid={`sub-text-input-${activeParam.id}`}
                              />
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="bg-gray-200 rounded-lg p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Comments</label>
            <div className="flex gap-3">
              <textarea
                id="comments-input"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Type here..."
                className="flex-1 p-3 rounded-lg border border-gray-300 resize-none h-24 focus:outline-none focus:ring-2 focus:ring-[#c9a962]"
                data-testid="styling-comments"
              />
              <div className="flex flex-col gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    data-testid="styling-image-upload"
                  />
                  <div className={`flex items-center gap-2 px-4 py-2 border rounded-lg bg-white hover:bg-gray-50 ${uploadingImage ? 'opacity-50' : ''}`}>
                    {uploadingImage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="text-sm">Upload Image</span>
                  </div>
                </label>
              </div>
            </div>
            
            {/* Uploaded Images Preview */}
            {stylingImages.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {stylingImages.map((img) => (
                  <div key={img.id} className="relative group">
                    <img 
                      src={img.url} 
                      alt={img.name}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Pricing */}
        {showPricing && (
          <aside className="w-56 bg-white border-l p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm text-gray-700">
                {showCostView ? 'Your Cost' : 'Customer Price'}
              </h3>
              <button
                onClick={handleCostViewToggle}
                className={`p-1.5 rounded-lg transition-colors ${
                  showCostView 
                    ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
                title={showCostView ? 'Switch to customer pricing' : 'View your cost (requires code)'}
                data-testid="cost-view-toggle"
              >
                {showCostView ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </button>
            </div>
            
            {showCostView && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                <p className="text-xs text-amber-700 text-center">
                  Viewing your cost price
                </p>
              </div>
            )}
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">CMT</span>
                <span className="font-medium">₹{pricing.cmt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Fabric</span>
                <span className="font-medium">
                  {calculatingPrice ? (
                    <Loader2 className="h-3 w-3 animate-spin inline" />
                  ) : (
                    `₹${pricing.fabric}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Styling</span>
                <span className="font-medium">₹{pricing.styling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">₹{pricing.shipping}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className={`font-bold ${showCostView ? 'text-amber-600' : 'text-[#c9a962]'}`}>
                    ₹{pricing.total}
                  </span>
                </div>
              </div>
            </div>
            {configSets.length > 1 && (
              <p className="text-xs text-blue-600 mt-3">
                Price includes {configSets.length} sets
              </p>
            )}
          </aside>
        )}
      </div>

      {/* Secret Code Modal */}
      <Dialog open={showSecretCodeModal} onOpenChange={setShowSecretCodeModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-amber-600" />
              Enter Secret Code
            </DialogTitle>
            <DialogDescription>
              Enter your secret code to view cost prices
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              value={secretCodeInput}
              onChange={(e) => setSecretCodeInput(e.target.value)}
              placeholder="Enter secret code"
              className="text-center text-lg tracking-widest"
              onKeyDown={(e) => e.key === 'Enter' && handleVerifySecretCode()}
              autoFocus
              data-testid="secret-code-verify-input"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSecretCodeModal(false);
                  setSecretCodeInput('');
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleVerifySecretCode}
                disabled={verifyingCode}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                data-testid="verify-secret-code-btn"
              >
                {verifyingCode ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Unlock'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Action Bar */}
      <footer className="bg-gray-100 p-4 border-t flex items-center justify-center gap-4">
        <Button
          onClick={handleAddToCart}
          className="bg-[#c9a962] hover:bg-[#b89952] text-black px-8"
          data-testid="add-to-cart-btn"
        >
          Add to Cart
        </Button>
        <Button
          onClick={handleAddToWIP}
          variant="outline"
          className="px-8"
          data-testid="add-to-wip-btn"
        >
          Add to WIP
        </Button>
      </footer>

      {/* Bottom Navigation */}
      <nav className="bg-[#c9a962] p-2">
        <div className="flex justify-center gap-8">
          <button className="p-3 rounded-lg hover:bg-black/10">
            <span className="text-2xl">👔</span>
          </button>
          <button className="p-3 rounded-lg hover:bg-black/10 bg-black/20">
            <span className="text-2xl">👕</span>
          </button>
          <button className="p-3 rounded-lg hover:bg-black/10">
            <span className="text-2xl">👖</span>
          </button>
          <button className="p-3 rounded-lg hover:bg-black/10">
            <span className="text-2xl">👞</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default StylingPage;
