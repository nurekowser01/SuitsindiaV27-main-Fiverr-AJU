import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  Ruler,
  Plus,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
  Loader2,
  Edit2,
  X,
} from 'lucide-react';

const SizeRepositoryPage = () => {
  const [garmentTypes, setGarmentTypes] = useState([]);
  const [measurementFields, setMeasurementFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedGarment, setExpandedGarment] = useState(null);
  const [expandedFit, setExpandedFit] = useState(null);
  const [fitSizes, setFitSizes] = useState({}); // { "garment_fit": [sizes] }
  const [loadingSizes, setLoadingSizes] = useState(null);
  const [savingSizes, setSavingSizes] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [garmentRes, configRes] = await Promise.all([
        api.get('/size-repo/garment-types'),
        api.get('/measurements/config')
      ]);
      setGarmentTypes(garmentRes.data);
      setMeasurementFields(configRes.data.fields || []);
      
      // Default expand first garment
      if (garmentRes.data.length > 0) {
        setExpandedGarment(garmentRes.data[0].id);
      }
    } catch (err) {
      toast.error('Failed to load size repository');
    } finally {
      setLoading(false);
    }
  };

  // ── Garment Type CRUD ──

  const addGarmentType = () => {
    const id = `garment-${Date.now()}`;
    setGarmentTypes(prev => [...prev, {
      id,
      name: 'New Garment',
      fits: [],
      measurement_field_ids: []
    }]);
    setExpandedGarment(id);
  };

  const updateGarment = (garmentId, field, value) => {
    setGarmentTypes(prev => prev.map(g =>
      g.id === garmentId ? { ...g, [field]: value } : g
    ));
  };

  const deleteGarment = (garmentId) => {
    if (!window.confirm('Delete this garment type and all its fits/sizes?')) return;
    setGarmentTypes(prev => prev.filter(g => g.id !== garmentId));
  };

  // ── Fit CRUD ──

  const addFit = (garmentId) => {
    const fitId = `fit-${Date.now()}`;
    setGarmentTypes(prev => prev.map(g => {
      if (g.id !== garmentId) return g;
      return {
        ...g,
        fits: [...(g.fits || []), {
          id: fitId,
          name: 'New Fit',
          size_min: 32,
          size_max: 46,
          size_step: 2
        }]
      };
    }));
  };

  const updateFit = (garmentId, fitId, field, value) => {
    setGarmentTypes(prev => prev.map(g => {
      if (g.id !== garmentId) return g;
      return {
        ...g,
        fits: (g.fits || []).map(f =>
          f.id === fitId ? { ...f, [field]: value } : f
        )
      };
    }));
  };

  const deleteFit = (garmentId, fitId) => {
    setGarmentTypes(prev => prev.map(g => {
      if (g.id !== garmentId) return g;
      return { ...g, fits: (g.fits || []).filter(f => f.id !== fitId) };
    }));
  };

  // ── Save Garment Types ──

  const saveGarmentTypes = async () => {
    setSaving(true);
    try {
      const res = await api.put('/size-repo/garment-types', { garment_types: garmentTypes });
      setGarmentTypes(res.data);
      toast.success('Garment types saved');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Size Measurements ──

  const loadFitSizes = async (garmentId, fitId) => {
    const key = `${garmentId}_${fitId}`;
    if (fitSizes[key]) {
      setExpandedFit(expandedFit === key ? null : key);
      return;
    }
    setLoadingSizes(key);
    try {
      const res = await api.get(`/size-repo/sizes/${garmentId}/${fitId}`);
      setFitSizes(prev => ({ ...prev, [key]: res.data }));
      setExpandedFit(key);
    } catch (err) {
      setFitSizes(prev => ({ ...prev, [key]: [] }));
      setExpandedFit(key);
    } finally {
      setLoadingSizes(null);
    }
  };

  const generateSizes = (garmentId, fit) => {
    const key = `${garmentId}_${fit.id}`;
    const garment = garmentTypes.find(g => g.id === garmentId);
    const fieldIds = garment?.measurement_field_ids || [];
    const sizes = [];
    
    for (let s = (fit.size_min || 32); s <= (fit.size_max || 46); s += (fit.size_step || 2)) {
      const existing = (fitSizes[key] || []).find(sz => sz.size === s);
      if (existing) {
        sizes.push(existing);
      } else {
        const measurements = {};
        fieldIds.forEach(fid => { measurements[fid] = 0; });
        sizes.push({ size: s, measurements, garment_id: garmentId, fit_id: fit.id });
      }
    }
    setFitSizes(prev => ({ ...prev, [key]: sizes }));
  };

  const updateSizeMeasurement = (key, sizeVal, fieldId, value) => {
    setFitSizes(prev => ({
      ...prev,
      [key]: (prev[key] || []).map(s => {
        if (s.size !== sizeVal) return s;
        return { ...s, measurements: { ...s.measurements, [fieldId]: parseFloat(value) || 0 } };
      })
    }));
  };

  const saveFitSizes = async (garmentId, fitId) => {
    const key = `${garmentId}_${fitId}`;
    setSavingSizes(key);
    try {
      const res = await api.put(`/size-repo/sizes/${garmentId}/${fitId}`, {
        sizes: fitSizes[key] || []
      });
      setFitSizes(prev => ({ ...prev, [key]: res.data }));
      toast.success('Size measurements saved');
    } catch (err) {
      toast.error('Failed to save sizes');
    } finally {
      setSavingSizes(null);
    }
  };

  // ── Measurement field selection for a garment ──
  const toggleMeasurementField = (garmentId, fieldId) => {
    setGarmentTypes(prev => prev.map(g => {
      if (g.id !== garmentId) return g;
      const ids = g.measurement_field_ids || [];
      return {
        ...g,
        measurement_field_ids: ids.includes(fieldId)
          ? ids.filter(id => id !== fieldId)
          : [...ids, fieldId]
      };
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  return (
    <AdminLayout>
    <div className="space-y-6" data-testid="size-repository-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ruler className="h-7 w-7 text-[#c9a962]" />
            Size Repository
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Define base sizes for Try-On measurements. Resellers select a size, then adjust +/-.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addGarmentType} data-testid="add-garment-type-btn">
            <Plus className="h-4 w-4 mr-1" /> Add Garment Type
          </Button>
          <Button
            onClick={saveGarmentTypes}
            disabled={saving}
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            data-testid="save-garment-types-btn"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
            Save Structure
          </Button>
        </div>
      </div>

      {/* Garment Types */}
      {garmentTypes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Ruler className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No garment types defined. Add Jacket, Pants, etc.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {garmentTypes.map((garment) => (
            <div key={garment.id} className="border rounded-lg overflow-hidden" data-testid={`garment-${garment.id}`}>
              {/* Garment Header */}
              <div
                className="flex items-center justify-between p-4 bg-[#1a2744] text-white cursor-pointer"
                onClick={() => setExpandedGarment(expandedGarment === garment.id ? null : garment.id)}
              >
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={garment.name}
                    onChange={(e) => updateGarment(garment.id, 'name', e.target.value)}
                    className="w-48 h-8 bg-white/10 border-white/20 text-white placeholder-white/50"
                  />
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {(garment.fits || []).length} fits
                  </Badge>
                  <Badge variant="secondary" className="bg-[#c9a962]/30 text-[#c9a962]">
                    {(garment.measurement_field_ids || []).length} fields
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon" variant="ghost"
                    className="text-red-300 hover:bg-red-500/20"
                    onClick={(e) => { e.stopPropagation(); deleteGarment(garment.id); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  {expandedGarment === garment.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {/* Garment Body */}
              {expandedGarment === garment.id && (
                <div className="p-4 space-y-4">
                  {/* Measurement Fields Selection */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Measurement Fields for {garment.name}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {measurementFields.map(field => (
                        <button
                          key={field.id}
                          onClick={() => toggleMeasurementField(garment.id, field.id)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            (garment.measurement_field_ids || []).includes(field.id)
                              ? 'bg-[#1a2744] text-white'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {field.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fits */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-sm font-medium">Fits</Label>
                      <Button size="sm" variant="outline" onClick={() => addFit(garment.id)}>
                        <Plus className="h-3 w-3 mr-1" /> Add Fit
                      </Button>
                    </div>

                    {(garment.fits || []).length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">No fits defined</p>
                    ) : (
                      <div className="space-y-2">
                        {(garment.fits || []).map((fit) => {
                          const fitKey = `${garment.id}_${fit.id}`;
                          const isExpanded = expandedFit === fitKey;
                          const sizes = fitSizes[fitKey] || [];
                          const fieldIds = garment.measurement_field_ids || [];
                          const fields = measurementFields.filter(f => fieldIds.includes(f.id));

                          return (
                            <div key={fit.id} className="border rounded-lg overflow-hidden">
                              {/* Fit Header */}
                              <div className="flex items-center gap-3 p-3 bg-gray-50">
                                <Input
                                  value={fit.name}
                                  onChange={(e) => updateFit(garment.id, fit.id, 'name', e.target.value)}
                                  className="w-40 h-8 text-sm font-semibold"
                                  placeholder="Fit name"
                                />
                                <div className="flex items-center gap-1">
                                  <Label className="text-xs text-gray-500">From</Label>
                                  <Input
                                    type="number"
                                    value={fit.size_min || ''}
                                    onChange={(e) => updateFit(garment.id, fit.id, 'size_min', parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-xs"
                                  />
                                  <Label className="text-xs text-gray-500">To</Label>
                                  <Input
                                    type="number"
                                    value={fit.size_max || ''}
                                    onChange={(e) => updateFit(garment.id, fit.id, 'size_max', parseInt(e.target.value) || 0)}
                                    className="w-16 h-8 text-xs"
                                  />
                                  <Label className="text-xs text-gray-500">Step</Label>
                                  <Input
                                    type="number"
                                    value={fit.size_step || 2}
                                    onChange={(e) => updateFit(garment.id, fit.id, 'size_step', parseInt(e.target.value) || 2)}
                                    className="w-14 h-8 text-xs"
                                  />
                                </div>
                                <Button
                                  size="sm" variant="outline"
                                  className="text-xs h-8"
                                  onClick={() => loadFitSizes(garment.id, fit.id)}
                                  disabled={loadingSizes === fitKey}
                                >
                                  {loadingSizes === fitKey ? (
                                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                  ) : isExpanded ? (
                                    <ChevronUp className="h-3 w-3 mr-1" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                  )}
                                  Sizes
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  className="text-xs h-8 text-blue-600"
                                  onClick={() => generateSizes(garment.id, fit)}
                                >
                                  <Edit2 className="h-3 w-3 mr-1" /> Generate
                                </Button>
                                <Button
                                  size="icon" variant="ghost"
                                  className="h-7 w-7 text-red-500"
                                  onClick={() => deleteFit(garment.id, fit.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Size Measurements Table */}
                              {isExpanded && (
                                <div className="p-3">
                                  {sizes.length === 0 ? (
                                    <p className="text-sm text-gray-400 text-center py-4">
                                      Click "Generate" to create size rows based on the range above
                                    </p>
                                  ) : (
                                    <>
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-sm border-collapse">
                                          <thead>
                                            <tr className="bg-gray-100">
                                              <th className="px-3 py-2 text-left font-medium text-gray-700 sticky left-0 bg-gray-100 z-10 border-r">
                                                Size
                                              </th>
                                              {fields.map(f => (
                                                <th key={f.id} className="px-2 py-2 text-center font-medium text-gray-700 min-w-[80px]">
                                                  {f.name}
                                                </th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {sizes.map((sizeRow) => (
                                              <tr key={sizeRow.size} className="border-t hover:bg-gray-50">
                                                <td className="px-3 py-1 font-bold text-[#1a2744] sticky left-0 bg-white z-10 border-r">
                                                  {sizeRow.size}
                                                </td>
                                                {fields.map(f => (
                                                  <td key={f.id} className="px-1 py-1">
                                                    <Input
                                                      type="number"
                                                      step="0.125"
                                                      value={sizeRow.measurements?.[f.id] || ''}
                                                      onChange={(e) => updateSizeMeasurement(fitKey, sizeRow.size, f.id, e.target.value)}
                                                      className="h-7 text-xs text-center w-full"
                                                      placeholder="0"
                                                    />
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                      <div className="mt-3 flex justify-end">
                                        <Button
                                          size="sm"
                                          onClick={() => saveFitSizes(garment.id, fit.id)}
                                          disabled={savingSizes === fitKey}
                                          className="bg-[#c9a962] text-black"
                                        >
                                          {savingSizes === fitKey ? (
                                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                          ) : (
                                            <Save className="h-3 w-3 mr-1" />
                                          )}
                                          Save {fit.name} Sizes
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </AdminLayout>
  );
};

export default SizeRepositoryPage;
