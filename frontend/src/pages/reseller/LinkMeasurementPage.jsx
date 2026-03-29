import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Checkbox } from '../../components/ui/checkbox';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Home,
  ShoppingCart,
  Loader2,
  Check,
  X,
  Minus,
  Plus,
  Shirt,
  RotateCcw
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

// 1/8 inch = 0.125
const EIGHTH = 0.125;

const formatFraction = (val) => {
  if (val === 0) return '0';
  const sign = val < 0 ? '-' : '+';
  const abs = Math.abs(val);
  const whole = Math.floor(abs);
  const frac = abs - whole;
  
  const fractionMap = {
    0: '',
    0.125: '1/8',
    0.25: '1/4',
    0.375: '3/8',
    0.5: '1/2',
    0.625: '5/8',
    0.75: '3/4',
    0.875: '7/8',
  };
  
  const nearest = Math.round(frac * 8) / 8;
  const fracStr = fractionMap[nearest] || '';
  
  if (whole === 0 && fracStr) return `${sign}${fracStr}"`;
  if (fracStr) return `${sign}${whole} ${fracStr}"`;
  if (whole > 0) return `${sign}${whole}"`;
  return '0';
};

const LinkMeasurementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, order, itemIndex = 0 } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [measurementConfig, setMeasurementConfig] = useState(null);
  const [customerMeasurement, setCustomerMeasurement] = useState(null);
  
  const orderItem = order?.items?.[itemIndex];
  const orderProductName = orderItem?.product_name?.toLowerCase() || '';
  const linkedMeasurementType = orderItem?.measurement_type;
  const existingLinkedMeasurements = orderItem?.linked_measurements?.measurements;
  const hasExistingMeasurements = existingLinkedMeasurements && Object.keys(existingLinkedMeasurements).length > 0;
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeField, setActiveField] = useState(null);
  const [linkedMeasurements, setLinkedMeasurements] = useState({});

  // ── Try-On State ──
  const [measurementMode, setMeasurementMode] = useState('manual'); // 'manual' | 'tryon'
  const [garmentTypes, setGarmentTypes] = useState([]);
  const [selectedTryOn, setSelectedTryOn] = useState({}); // { garmentId: { fit_id, size } }
  const [baseSizeMeasurements, setBaseSizeMeasurements] = useState({}); // { fieldId: baseValue }
  const [adjustments, setAdjustments] = useState({}); // { fieldId: adjustment }
  const [manualOverrides, setManualOverrides] = useState({}); // { fieldId: value | null }

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('reseller_token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [configRes, measurementRes, garmentRes] = await Promise.all([
        axios.get(`${API_URL}/measurements/config`, { headers }),
        axios.get(`${API_URL}/measurements/${customer?.customer_id}`, { headers }),
        axios.get(`${API_URL}/size-repo/garment-types`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      setMeasurementConfig(configRes.data);
      setCustomerMeasurement(measurementRes.data);
      setGarmentTypes(garmentRes.data);
      
      const productTypes = configRes.data.product_types || [];
      let matchedProductId = productTypes[0]?.id;
      
      if (linkedMeasurementType) {
        const linkedProduct = productTypes.find(pt => pt.id === linkedMeasurementType);
        if (linkedProduct) matchedProductId = linkedProduct.id;
      } else if (orderProductName && productTypes.length > 0) {
        const normalizeForMatch = (str) => {
          if (!str) return '';
          const words = str.toLowerCase().trim().split(/\s+/);
          return words.map(w => w.endsWith('s') && w.length > 2 ? w.slice(0, -1) : w);
        };
        const orderWords = normalizeForMatch(orderProductName);
        const matched = productTypes.find(pt => {
          const ptWords = normalizeForMatch(pt.name);
          return orderWords.some(ow => ptWords.some(pw => ow.includes(pw) || pw.includes(ow)));
        });
        if (matched) matchedProductId = matched.id;
      }
      
      if (matchedProductId) setSelectedProduct(matchedProductId);
      
      const initial = {};
      configRes.data.fields?.forEach(field => {
        const bodyValue = measurementRes.data?.measurements?.[field.id] || field.default_value || 0;
        if (existingLinkedMeasurements && existingLinkedMeasurements[field.id]) {
          const existing = existingLinkedMeasurements[field.id];
          initial[field.id] = {
            body_measurement: existing.body_measurement || parseFloat(bodyValue) || 0,
            allowance: existing.allowance || 0,
            final_measurement: existing.final_measurement || parseFloat(bodyValue) || 0,
            needed: existing.needed !== undefined ? existing.needed : true
          };
        } else {
          initial[field.id] = {
            body_measurement: parseFloat(bodyValue) || 0,
            allowance: 0,
            final_measurement: parseFloat(bodyValue) || 0,
            needed: true
          };
        }
      });
      setLinkedMeasurements(initial);
      
      if (hasExistingMeasurements) {
        toast.success('Pre-populated with previous measurements and allowances');
      }
      
      if (configRes.data.fields?.length > 0) {
        setActiveField(configRes.data.fields[0].id);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load measurement data');
    } finally {
      setLoading(false);
    }
  };

  // Guard — auto-redirect to dashboard if no order context
  useEffect(() => {
    if (!customer || !order) {
      navigate('/reseller/dashboard', { replace: true });
    }
  }, [customer, order, navigate]);

  if (!customer || !order) {
    return null;
  }

  const handleProductSelect = (productId) => setSelectedProduct(productId);

  // ── Manual Mode Handlers ──
  const handleAllowanceChange = (fieldId, value) => {
    const allowance = parseFloat(value) || 0;
    setLinkedMeasurements(prev => {
      const bodyMeasurement = prev[fieldId]?.body_measurement || 0;
      return {
        ...prev,
        [fieldId]: { ...prev[fieldId], allowance, final_measurement: bodyMeasurement + allowance }
      };
    });
  };

  const handleFinalMeasurementChange = (fieldId, value) => {
    const finalMeasurement = parseFloat(value) || 0;
    setLinkedMeasurements(prev => {
      const bodyMeasurement = prev[fieldId]?.body_measurement || 0;
      return {
        ...prev,
        [fieldId]: { ...prev[fieldId], final_measurement: finalMeasurement, allowance: finalMeasurement - bodyMeasurement }
      };
    });
  };

  const handleNeededToggle = (fieldId) => {
    setLinkedMeasurements(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], needed: !prev[fieldId]?.needed }
    }));
  };

  // ── Try-On Mode Handlers ──
  const handleTryOnSelect = async (garmentId, fitId, size) => {
    setSelectedTryOn(prev => ({ ...prev, [garmentId]: { fit_id: fitId, size } }));
    const garment = garmentTypes.find(g => g.id === garmentId);
    const fieldIds = garment?.measurement_field_ids || [];
    
    try {
      const token = localStorage.getItem('reseller_token');
      const res = await axios.get(
        `${API_URL}/size-repo/lookup/${garmentId}/${fitId}/${size}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const sizeMeasurements = res.data.measurements || {};
      // Replace measurements for this garment's fields
      setBaseSizeMeasurements(prev => {
        const updated = { ...prev };
        fieldIds.forEach(fid => {
          updated[fid] = sizeMeasurements[fid] !== undefined ? sizeMeasurements[fid] : 0;
        });
        return updated;
      });
      
      // Always reset adjustments and manual overrides to 0 for this garment's fields
      setAdjustments(prev => {
        const updated = { ...prev };
        fieldIds.forEach(fid => { updated[fid] = 0; });
        return updated;
      });
      setManualOverrides(prev => {
        const updated = { ...prev };
        fieldIds.forEach(fid => { delete updated[fid]; });
        return updated;
      });
      
      const fitName = garment?.fits?.find(f => f.id === fitId)?.name || fitId;
      toast.success(`Loaded ${garment?.name} ${fitName} - Size ${size}`);
    } catch (err) {
      // Clear stale measurements for this garment's fields on failure
      setBaseSizeMeasurements(prev => {
        const updated = { ...prev };
        fieldIds.forEach(fid => { delete updated[fid]; });
        return updated;
      });
      setAdjustments(prev => {
        const updated = { ...prev };
        fieldIds.forEach(fid => { delete updated[fid]; });
        return updated;
      });
      setManualOverrides(prev => {
        const updated = { ...prev };
        fieldIds.forEach(fid => { delete updated[fid]; });
        return updated;
      });
      // Clear the size selection so the badge doesn't show
      setSelectedTryOn(prev => ({ ...prev, [garmentId]: { fit_id: fitId, size: null } }));
      
      const fitName = garment?.fits?.find(f => f.id === fitId)?.name || fitId;
      toast.error(`No sizes saved for ${garment?.name} ${fitName} Size ${size}. Please define it in the Size Repository.`);
    }
  };

  const handleAdjustmentStep = (fieldId, delta) => {
    setAdjustments(prev => {
      const current = prev[fieldId] || 0;
      const newVal = Math.round((current + delta) * 8) / 8;
      return { ...prev, [fieldId]: newVal };
    });
  };

  const resetAdjustment = (fieldId) => {
    setAdjustments(prev => ({ ...prev, [fieldId]: 0 }));
  };

  // ── Save ──
  const handleSave = async () => {
    try {
      setSaving(true);
      
      let finalMeasurements = {};
      
      if (measurementMode === 'tryon') {
        // Build from base + adjustments (or manual overrides)
        Object.keys(baseSizeMeasurements).forEach(fieldId => {
          const base = baseSizeMeasurements[fieldId] || 0;
          const adj = adjustments[fieldId] || 0;
          const hasManual = manualOverrides[fieldId] !== undefined && manualOverrides[fieldId] !== null && manualOverrides[fieldId] !== '';
          const finalVal = hasManual ? parseFloat(manualOverrides[fieldId]) || 0 : base + adj;
          finalMeasurements[fieldId] = {
            body_measurement: hasManual ? finalVal : base,
            allowance: hasManual ? 0 : adj,
            final_measurement: finalVal,
            needed: true,
            method: hasManual ? 'tryon_manual' : 'tryon',
            tryon_selections: selectedTryOn
          };
        });
      } else {
        Object.entries(linkedMeasurements).forEach(([fieldId, data]) => {
          if (data.needed) {
            finalMeasurements[fieldId] = { ...data, method: 'manual' };
          }
        });
      }
      
      const token = localStorage.getItem('reseller_token');
      await axios.patch(`${API_URL}/orders/${order.order_id}/link-measurement`, {
        item_index: itemIndex,
        linked_measurements: {
          product_type: selectedProduct,
          measurement_mode: measurementMode,
          tryon_selections: measurementMode === 'tryon' ? selectedTryOn : null,
          measurements: finalMeasurements
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Measurements linked successfully!');
      navigate('/reseller/orders', { state: { customer } });
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to link measurements');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate('/reseller/orders', { state: { customer } });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#1a2744]" />
      </div>
    );
  }

  const productTypes = measurementConfig?.product_types || [];
  const allFields = measurementConfig?.fields || [];
  const selectedProductType = productTypes.find(p => p.id === selectedProduct);
  const requiredFieldIds = selectedProductType?.measurement_ids || [];
  const visibleFields = allFields.filter(f => requiredFieldIds.includes(f.id) && !f.is_text);
  const activeFieldData = activeField ? linkedMeasurements[activeField] : null;
  const activeFieldConfig = allFields.find(f => f.id === activeField);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a2744] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
          <Button variant="ghost" size="icon" className="text-orange-400 hover:bg-white/10"
            onClick={() => navigate('/reseller/dashboard')}>
            <Home className="h-5 w-5" />
          </Button>
          {hasExistingMeasurements && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
              Returning Customer - Pre-filled
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 px-3 py-2 rounded text-white text-sm">
            {customer?.name} - {customer?.phone || ''}
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mode Toggle */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600">Method:</span>
        <div className="flex bg-gray-100 rounded-lg p-1" data-testid="measurement-mode-toggle">
          <button
            onClick={() => setMeasurementMode('manual')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              measurementMode === 'manual'
                ? 'bg-[#1a2744] text-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="mode-manual"
          >
            Manual Entry
          </button>
          <button
            onClick={() => setMeasurementMode('tryon')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
              measurementMode === 'tryon'
                ? 'bg-[#c9a962] text-black'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            data-testid="mode-tryon"
          >
            <Shirt className="h-4 w-4" />
            Try-On Method
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white border-r flex flex-col">
          {/* Product Selection */}
          <div className="p-4 border-b">
            <h3 className="font-medium text-sm text-gray-700 mb-3">Select Product</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {productTypes.map(product => (
                <label key={product.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedProduct === product.id}
                    onCheckedChange={() => handleProductSelect(product.id)}
                  />
                  <span className="text-sm">{product.name}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Measurement Fields */}
          <div className="flex-1 overflow-y-auto p-2">
            <h3 className="font-medium text-sm text-gray-700 mb-2 px-2">Measurements</h3>
            {visibleFields.map(field => {
              const data = linkedMeasurements[field.id];
              const isActive = activeField === field.id;
              const isNeeded = data?.needed !== false;
              const hasAllowance = data?.allowance !== 0;
              const tryOnAdj = adjustments[field.id];
              const tryOnBase = baseSizeMeasurements[field.id];
              
              return (
                <button
                  key={field.id}
                  onClick={() => setActiveField(field.id)}
                  className={`w-full p-3 rounded-lg mb-2 text-left transition-all ${
                    isActive 
                      ? 'bg-[#1a2744] text-white' 
                      : isNeeded ? 'bg-gray-100 hover:bg-gray-200' : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{field.name}</span>
                    {isNeeded && <Check className="h-4 w-4 text-green-400" />}
                  </div>
                  {measurementMode === 'tryon' && tryOnBase !== undefined ? (
                    <div className="text-xs mt-1 opacity-70">
                      Base: {tryOnBase} {tryOnAdj ? `(${formatFraction(tryOnAdj)})` : ''} = {(tryOnBase + (tryOnAdj || 0)).toFixed(3).replace(/\.?0+$/, '')}
                    </div>
                  ) : (
                    isNeeded && (
                      <div className="text-xs mt-1 opacity-70">
                        Body: {data?.body_measurement || 0}
                        {hasAllowance && <span> → Final: {data?.final_measurement || 0}</span>}
                      </div>
                    )
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {measurementMode === 'tryon' ? (
            /* ═══ TRY-ON MODE ═══ */
            <div className="max-w-3xl mx-auto space-y-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Try-On Measurement - {order.items?.[itemIndex]?.product_name}
              </h2>

              {/* Garment Selection Cards */}
              {garmentTypes.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <p className="text-yellow-700">No garment types defined in Size Repository.</p>
                  <p className="text-sm text-yellow-600 mt-1">Ask your admin to set up Jacket & Pants sizes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {garmentTypes.map(garment => {
                    const sel = selectedTryOn[garment.id];
                    return (
                      <div key={garment.id} className="bg-white rounded-xl shadow-sm p-4 border" data-testid={`tryon-garment-${garment.id}`}>
                        <h3 className="font-bold text-[#1a2744] mb-3 flex items-center gap-2">
                          <Shirt className="h-5 w-5 text-[#c9a962]" />
                          {garment.name}
                        </h3>
                        
                        {/* Fit Selection */}
                        <div className="mb-3">
                          <label className="text-xs text-gray-500 mb-1 block">Select Fit</label>
                          <div className="flex gap-2 flex-wrap">
                            {(garment.fits || []).map(fit => (
                              <button
                                key={fit.id}
                                onClick={() => setSelectedTryOn(prev => ({
                                  ...prev,
                                  [garment.id]: { ...prev[garment.id], fit_id: fit.id, size: null }
                                }))}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                  sel?.fit_id === fit.id
                                    ? 'bg-[#1a2744] text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                                data-testid={`tryon-fit-${fit.id}`}
                              >
                                {fit.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Size Selection */}
                        {sel?.fit_id && (() => {
                          const fit = (garment.fits || []).find(f => f.id === sel.fit_id);
                          if (!fit) return null;
                          const sizes = [];
                          for (let s = fit.size_min; s <= fit.size_max; s += (fit.size_step || 2)) {
                            sizes.push(s);
                          }
                          return (
                            <div>
                              <label className="text-xs text-gray-500 mb-1 block">Select Size</label>
                              <div className="flex gap-1.5 flex-wrap">
                                {sizes.map(s => (
                                  <button
                                    key={s}
                                    onClick={() => handleTryOnSelect(garment.id, sel.fit_id, s)}
                                    className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors ${
                                      sel?.size === s
                                        ? 'bg-[#c9a962] text-black'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                    data-testid={`tryon-size-${garment.id}-${s}`}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Selected Summary */}
                        {sel?.fit_id && sel?.size && (() => {
                          const fitName = (garment.fits || []).find(f => f.id === sel.fit_id)?.name || sel.fit_id;
                          return (
                            <div className="mt-3 bg-green-50 rounded-lg p-2 text-center">
                              <Badge className="bg-green-600">{garment.name}: {fitName} - Size {sel.size}</Badge>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Measurement Table */}
              {Object.keys(baseSizeMeasurements).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#1a2744] text-white text-xs font-semibold uppercase tracking-wider">
                    <div className="col-span-2">Field</div>
                    <div className="col-span-1 text-center">Base</div>
                    <div className="col-span-4 text-center">Adjustment (1/8")</div>
                    <div className="col-span-2 text-center">Manual Entry</div>
                    <div className="col-span-3 text-center">Final Value</div>
                  </div>
                  
                  <div className="divide-y divide-gray-100">
                    {visibleFields.filter(f => baseSizeMeasurements[f.id] !== undefined).map(field => {
                      const base = baseSizeMeasurements[field.id] || 0;
                      const adj = adjustments[field.id] || 0;
                      const hasManual = manualOverrides[field.id] !== undefined && manualOverrides[field.id] !== null && manualOverrides[field.id] !== '';
                      const finalVal = hasManual ? parseFloat(manualOverrides[field.id]) || 0 : base + adj;
                      const isActive = activeField === field.id;
                      
                      return (
                        <div
                          key={field.id}
                          onClick={() => setActiveField(field.id)}
                          className={`grid grid-cols-12 gap-2 px-4 py-3 items-center transition-colors cursor-pointer ${
                            isActive ? 'bg-[#faf6ed]' : 'hover:bg-gray-50'
                          }`}
                          data-testid={`adj-row-${field.id}`}
                        >
                          {/* Field Name */}
                          <div className="col-span-2">
                            <span className="text-sm font-semibold text-gray-700">{field.name}</span>
                          </div>
                          
                          {/* Base Value */}
                          <div className="col-span-1 text-center">
                            <span className="text-sm text-gray-500 tabular-nums">{base}"</span>
                          </div>
                          
                          {/* Adjustment Controls */}
                          <div className="col-span-4 flex items-center justify-center gap-1">
                            <Button
                              size="icon" variant="outline"
                              className={`h-7 w-7 rounded-full ${hasManual ? 'opacity-40' : ''}`}
                              disabled={hasManual}
                              onClick={(e) => { e.stopPropagation(); handleAdjustmentStep(field.id, -EIGHTH); }}
                              data-testid={`adj-minus-${field.id}`}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div className={`w-16 text-center text-xs font-bold rounded-md py-1 ${
                              hasManual ? 'bg-gray-50 text-gray-400' :
                              adj > 0 ? 'bg-green-100 text-green-700' :
                              adj < 0 ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {hasManual ? '--' : formatFraction(adj)}
                            </div>
                            <Button
                              size="icon" variant="outline"
                              className={`h-7 w-7 rounded-full ${hasManual ? 'opacity-40' : ''}`}
                              disabled={hasManual}
                              onClick={(e) => { e.stopPropagation(); handleAdjustmentStep(field.id, EIGHTH); }}
                              data-testid={`adj-plus-${field.id}`}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon" variant="ghost"
                              className="h-6 w-6 text-gray-400"
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                resetAdjustment(field.id);
                                setManualOverrides(prev => { const u = {...prev}; delete u[field.id]; return u; });
                              }}
                              data-testid={`adj-reset-${field.id}`}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          {/* Manual Entry */}
                          <div className="col-span-2 flex justify-center">
                            <Input
                              type="number"
                              step="0.125"
                              placeholder="--"
                              value={manualOverrides[field.id] ?? ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setManualOverrides(prev => {
                                  if (val === '') { const u = {...prev}; delete u[field.id]; return u; }
                                  return { ...prev, [field.id]: val };
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-20 h-8 text-center text-sm tabular-nums"
                              data-testid={`manual-input-${field.id}`}
                            />
                          </div>
                          
                          {/* Final Value */}
                          <div className="col-span-3 text-center">
                            <span className={`text-sm font-bold tabular-nums ${
                              hasManual ? 'text-blue-600' :
                              adj !== 0 ? 'text-[#c9a962]' : 'text-gray-700'
                            }`} data-testid={`final-val-${field.id}`}>
                              {finalVal.toFixed(3).replace(/\.?0+$/, '')}"
                              {hasManual && <span className="ml-1 text-[10px] font-normal text-blue-400">(manual)</span>}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ═══ MANUAL MODE (existing) ═══ */
            <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mx-auto">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Link Measurement - {order.items?.[itemIndex]?.product_name}
              </h2>
              
              {activeFieldConfig && activeFieldData ? (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-[#1a2744]">{activeFieldConfig.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Typical range: {activeFieldConfig.default_value - 5}" - {activeFieldConfig.default_value + 5}"
                    </p>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600 block mb-2">BODY MEASUREMENT</label>
                    <div className="flex items-center gap-4">
                      <Input type="number" value={activeFieldData.body_measurement} readOnly
                        className="text-2xl font-bold text-center bg-white w-32" />
                      <span className="text-gray-500">inches</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-600 block mb-2">
                      ALLOWANCE (+ or -) <span className="text-gray-400 font-normal">- Optional</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <Input type="number" step="0.125"
                        value={activeFieldData.allowance || ''}
                        onChange={(e) => handleAllowanceChange(activeField, e.target.value)}
                        className="text-2xl font-bold text-center w-32" placeholder="0" />
                      <span className="text-gray-500">inches</span>
                      <Button variant="outline" onClick={() => handleAllowanceChange(activeField, 0)}>Reset</Button>
                    </div>
                  </div>

                  {activeFieldData.allowance !== 0 && activeFieldData.allowance !== '' && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <label className="text-sm font-medium text-gray-600 block mb-2">FINAL MEASUREMENT</label>
                      <div className="flex items-center gap-4">
                        <Input type="number" step="0.125"
                          value={activeFieldData.final_measurement}
                          onChange={(e) => handleFinalMeasurementChange(activeField, e.target.value)}
                          className="text-2xl font-bold text-center bg-white w-32 border-2 border-green-500" />
                        <span className="text-gray-500">inches</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Body ({activeFieldData.body_measurement}) + Allowance ({activeFieldData.allowance}) = {activeFieldData.final_measurement}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="font-medium">Include this measurement?</span>
                    <div className="flex items-center gap-2">
                      <span className={activeFieldData.needed ? 'text-gray-400' : 'text-red-600 font-medium'}>Not Needed</span>
                      <Switch checked={activeFieldData.needed} onCheckedChange={() => handleNeededToggle(activeField)} />
                      <span className={activeFieldData.needed ? 'text-green-600 font-medium' : 'text-gray-400'}>Needed</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-12">Select a measurement field from the left sidebar</p>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t p-4 pb-20 flex justify-end gap-4">
        <Button variant="outline" onClick={handleCancel} className="h-12 px-8">Cancel</Button>
        <Button className="bg-[#1a2744] text-white h-12 px-8 text-lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Link Measurements'}
        </Button>
      </footer>
    </div>
  );
};

export default LinkMeasurementPage;
