import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ShoppingCart, 
  Search, 
  Eye, 
  Edit, 
  Save, 
  X,
  User,
  Package,
  Ruler,
  DollarSign,
  MessageSquare,
  Palette,
  Image as ImageIcon,
  Loader2,
  History,
  Trash2,
  FileText,
  Download,
  MessageCircle,
  Truck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Comprehensive Order Details Modal - Same as Reseller POS
const OrderDetailsModal = ({ isOpen, onClose, order, onSave, measurementConfig }) => {
  const [editMode, setEditMode] = useState(false);
  const [editedOrder, setEditedOrder] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [showMeasurementSummary, setShowMeasurementSummary] = useState(false);
  const [pastMeasurements, setPastMeasurements] = useState([]);
  const [loadingPastMeasurements, setLoadingPastMeasurements] = useState(false);
  const { token } = useAuth();

  // Create a lookup map for measurement field names
  const getMeasurementName = (fieldId) => {
    if (!measurementConfig?.fields) {
      return fieldId.replace(/-/g, ' ').replace(/field /i, '');
    }
    const field = measurementConfig.fields.find(f => f.id === fieldId);
    return field?.name || fieldId.replace(/-/g, ' ').replace(/field /i, '');
  };

  // Fetch past measurements for the customer from past orders
  const fetchPastMeasurements = async () => {
    if (!order?.customer_id) return;
    
    setLoadingPastMeasurements(true);
    try {
      // Fetch all orders for this customer
      const response = await axios.get(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Filter orders for this customer and extract measurements
      const customerOrders = response.data
        .filter(o => o.customer_id === order.customer_id && o.order_id !== order.order_id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      const measurementsHistory = [];
      customerOrders.forEach(pastOrder => {
        pastOrder.items?.forEach(item => {
          if (item.linked_measurements?.measurements) {
            measurementsHistory.push({
              order_id: pastOrder.order_id,
              product_name: item.product_name,
              date: pastOrder.created_at,
              measurements: item.linked_measurements.measurements
            });
          }
        });
      });
      
      setPastMeasurements(measurementsHistory);
      setShowMeasurementSummary(true);
    } catch (error) {
      console.error('Error fetching past measurements:', error);
      toast.error('Failed to load past measurements');
    } finally {
      setLoadingPastMeasurements(false);
    }
  };

  useEffect(() => {
    if (order) {
      setEditedOrder(JSON.parse(JSON.stringify(order)));
      setAdminComment(order.admin_comments || '');
      setEditMode(false);
      setShowMeasurementSummary(false);
      setPastMeasurements([]);
    }
  }, [order]);

  if (!order || !editedOrder) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${API_URL}/orders/admin/${editedOrder.order_id}`,
        { ...editedOrder, admin_comments: adminComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Order updated successfully');
      setEditMode(false);
      onSave?.();
    } catch (error) {
      toast.error('Failed to save order');
    } finally {
      setSaving(false);
    }
  };

  const updateMeasurementAllowance = (itemIndex, fieldId, value) => {
    const updated = { ...editedOrder };
    const item = updated.items[itemIndex];
    if (item.linked_measurements?.measurements?.[fieldId]) {
      const allowance = parseFloat(value) || 0;
      const bodyMeasurement = item.linked_measurements.measurements[fieldId].body_measurement || 0;
      item.linked_measurements.measurements[fieldId] = {
        ...item.linked_measurements.measurements[fieldId],
        allowance: allowance,
        final_measurement: bodyMeasurement + allowance
      };
    }
    setEditedOrder(updated);
  };

  // Update body measurement
  const updateBodyMeasurement = (itemIndex, fieldId, value) => {
    const updated = { ...editedOrder };
    const item = updated.items[itemIndex];
    if (item.linked_measurements?.measurements?.[fieldId]) {
      const bodyMeasurement = parseFloat(value) || 0;
      const allowance = item.linked_measurements.measurements[fieldId].allowance || 0;
      item.linked_measurements.measurements[fieldId] = {
        ...item.linked_measurements.measurements[fieldId],
        body_measurement: bodyMeasurement,
        final_measurement: bodyMeasurement + allowance
      };
    }
    setEditedOrder(updated);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      wip: { color: 'bg-yellow-500', label: 'Work in Progress' },
      placed: { color: 'bg-blue-500', label: 'Placed' },
      processing: { color: 'bg-purple-500', label: 'Processing' },
      shipped: { color: 'bg-green-500', label: 'Shipped' },
      delivered: { color: 'bg-green-700', label: 'Delivered' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-500', label: status };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-[#c9a962]" />
              <div>
                <DialogTitle className="text-xl">Order Details</DialogTitle>
                <DialogDescription className="font-mono">{order.order_id}</DialogDescription>
              </div>
              {getStatusBadge(order.status)}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={fetchPastMeasurements}
                disabled={loadingPastMeasurements}
                className="border-blue-300 text-blue-600 hover:bg-blue-50"
              >
                <Ruler className="h-4 w-4 mr-2" />
                {loadingPastMeasurements ? 'Loading...' : 'Measurement Summary'}
              </Button>
              {!editMode ? (
                <Button onClick={() => setEditMode(true)} variant="outline">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Order
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Measurement Summary Section */}
          {showMeasurementSummary && (
            <div className="border-2 border-blue-200 rounded-lg bg-blue-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-blue-800 flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Measurement History for {order.customer_name}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowMeasurementSummary(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {pastMeasurements.length === 0 ? (
                <p className="text-center text-blue-600 py-4">No previous orders with measurements found for this customer.</p>
              ) : (
                <div className="space-y-4 max-h-60 overflow-y-auto">
                  {pastMeasurements.map((history, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-mono text-sm text-blue-700">{history.order_id}</span>
                          <span className="mx-2">•</span>
                          <span className="font-medium">{history.product_name}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(history.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                        {Object.entries(history.measurements).slice(0, 12).map(([fieldId, data]) => (
                          <div key={fieldId} className="bg-gray-50 rounded px-2 py-1">
                            <span className="text-gray-500 block">{getMeasurementName(fieldId)}</span>
                            <span className="font-bold">{data.final_measurement || data.body_measurement}"</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Customer Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Customer ID</p>
              <p className="font-mono text-sm">{order.customer_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="font-medium capitalize">{order.payment_method?.replace('_', ' ') || 'Not Set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '-'}
              </p>
            </div>
          </div>

          {/* Items */}
          {editedOrder.items?.map((item, itemIndex) => (
            <div key={itemIndex} className="border rounded-lg overflow-hidden">
              {/* Item Header */}
              <div className="bg-[#1a2744] text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5" />
                  <span className="font-semibold text-lg">{item.product_name}</span>
                  {item.category_name && (
                    <Badge variant="secondary" className="bg-white/20">{item.category_name}</Badge>
                  )}
                </div>
                {item.pricing && (
                  <div className="text-right">
                    <span className="text-[#c9a962] text-xl font-bold">₹{item.pricing.total}</span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-6">
                {/* Configuration Section */}
                <div>
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Configuration (Fabric/Lining/Button)
                  </h4>
                  {Array.isArray(item.configuration) && item.configuration.length > 0 ? (
                    <div className="space-y-4">
                      {item.configuration.map((configSet, setIdx) => (
                        <div key={setIdx} className="bg-gray-50 rounded-lg p-4">
                          <p className="text-xs text-gray-500 mb-3">Set #{setIdx + 1}</p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(configSet).filter(([key]) => key !== 'id' && key !== 'size_category').map(([key, value]) => (
                              (value?.code || value?.sku) && (
                                <div key={key} className="text-center">
                                  {value?.image ? (
                                    <img 
                                      src={value.image} 
                                      alt={key}
                                      className="w-20 h-20 object-cover rounded-lg mx-auto mb-2 border"
                                    />
                                  ) : (
                                    <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center border">
                                      <ImageIcon className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                  {value.code && <p className="font-mono text-sm font-bold">{value.code}</p>}
                                  {value.sku && <p className="font-mono text-xs text-blue-600">SKU: {value.sku}</p>}
                                  <p className="text-xs text-gray-500 capitalize">{key}</p>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : typeof item.configuration === 'object' && Object.keys(item.configuration).length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-gray-50 rounded-lg p-4">
                      {Object.entries(item.configuration).filter(([key]) => key !== 'id' && key !== 'size_category').map(([key, value]) => (
                        (value?.code || value?.sku) && (
                          <div key={key} className="text-center">
                            {value?.image ? (
                              <img 
                                src={value.image} 
                                alt={key}
                                className="w-20 h-20 object-cover rounded-lg mx-auto mb-2 border"
                              />
                            ) : (
                              <div className="w-20 h-20 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center border">
                                <ImageIcon className="h-6 w-6 text-gray-400" />
                              </div>
                            )}
                            {value.code && <p className="font-mono text-sm font-bold">{value.code}</p>}
                            {value.sku && <p className="font-mono text-xs text-blue-600">SKU: {value.sku}</p>}
                            <p className="text-xs text-gray-500 capitalize">{key}</p>
                          </div>
                        )
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No configuration data</p>
                  )}
                </div>

                {/* Styling Section */}
                {item.styling && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Styling Options
                    </h4>
                    
                    {/* Construction */}
                    {item.styling.construction && (
                      <div className="mb-4 p-3 bg-yellow-50 rounded-lg inline-block">
                        <p className="text-xs text-gray-500">Construction Variant</p>
                        <p className="font-semibold">{item.styling.construction.name}</p>
                        {item.styling.construction.base_price > 0 && (
                          <p className="text-sm text-green-600">+₹{item.styling.construction.base_price}</p>
                        )}
                      </div>
                    )}

                    {/* Style Options with Images */}
                    {item.styling.options && Object.keys(item.styling.options).length > 0 && (
                      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 mt-3">
                        {Object.entries(item.styling.options).map(([key, option]) => (
                          <div key={key} className="p-3 bg-gray-50 rounded-lg text-center">
                            <p className="text-xs text-gray-500 capitalize mb-2">{key.replace(/-/g, ' ')}</p>
                            {option?.image ? (
                              <img 
                                src={option.image} 
                                alt={option?.name}
                                className="w-16 h-16 object-contain mx-auto mb-2 rounded border bg-white"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                                <span className="text-2xl">👔</span>
                              </div>
                            )}
                            <p className="font-medium text-sm">{option?.name || '-'}</p>
                            {option?.surcharge > 0 && (
                              <p className="text-xs text-green-600">+₹{option.surcharge}</p>
                            )}
                            {/* Show text input value if exists */}
                            {item.styling.text_inputs && (() => {
                              const matchingEntries = Object.entries(item.styling.text_inputs).filter(([k]) => k === key || k.startsWith(key + '__'));
                              return matchingEntries.length > 0 ? matchingEntries.map(([k, v]) => (
                                <p key={k} className="mt-1.5 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 break-words">
                                  "{v}"
                                </p>
                              )) : null;
                            })()}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Styling Comments */}
                    {item.styling.comments && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 mb-1">
                          <MessageSquare className="h-4 w-4 inline mr-1" />
                          Customer Comments
                        </p>
                        <p className="text-sm text-gray-800">{item.styling.comments}</p>
                      </div>
                    )}

                    {/* Styling Reference Images */}
                    {item.styling.images && item.styling.images.length > 0 && (
                      <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-600 mb-2">Reference Images</p>
                        <div className="flex gap-2 flex-wrap">
                          {item.styling.images.map((img, idx) => (
                            <img 
                              key={img.id || idx}
                              src={img.url} 
                              alt={img.name || `Image ${idx + 1}`}
                              className="w-24 h-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                              onClick={() => window.open(img.url, '_blank')}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Measurements Section */}
                {item.linked_measurements?.measurements && Object.keys(item.linked_measurements.measurements).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      Measurements & Allowances
                      {item.linked_measurements?.measurement_mode === 'tryon' && (
                        <span className="text-xs bg-[#c9a962] text-black px-2 py-0.5 rounded font-medium">Try-On</span>
                      )}
                      {editMode && <Badge variant="outline" className="ml-2 bg-green-50 text-green-700">Editable</Badge>}
                    </h4>
                    
                    {/* Try-On Selection Summary */}
                    {item.linked_measurements?.measurement_mode === 'tryon' && item.linked_measurements?.tryon_selections && !editMode && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {Object.entries(item.linked_measurements.tryon_selections).map(([garmentId, sel]) => {
                          if (!sel?.fit_id || !sel?.size) return null;
                          return (
                            <div key={garmentId} className="inline-flex items-center gap-2 bg-[#faf6ed] border border-[#c9a962]/30 rounded-lg px-3 py-1.5">
                              <span className="text-sm font-medium text-[#1a2744] capitalize">{garmentId}</span>
                              <span className="text-xs text-gray-400">|</span>
                              <span className="text-sm text-gray-600 capitalize">{sel.fit_id}</span>
                              <span className="text-xs text-gray-400">|</span>
                              <span className="text-sm font-bold text-[#c9a962]">Size {sel.size}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Measurement</th>
                            <th className="px-3 py-2 text-center font-medium">
                              {item.linked_measurements?.measurement_mode === 'tryon' ? 'Base Size' : 'Body'}
                            </th>
                            <th className="px-3 py-2 text-center font-medium">Allowance</th>
                            <th className="px-3 py-2 text-center font-medium">Final</th>
                            {item.linked_measurements?.measurement_mode === 'tryon' && !editMode && (
                              <th className="px-3 py-2 text-center font-medium">Method</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(item.linked_measurements.measurements).map(([fieldId, data]) => {
                            const isManualOverride = data.method === 'tryon_manual';
                            const isTryon = item.linked_measurements?.measurement_mode === 'tryon';
                            
                            return (
                              <tr key={fieldId} className="border-t hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium uppercase">{getMeasurementName(fieldId)}</td>
                                <td className="px-3 py-2 text-center">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={data.body_measurement || ''}
                                      onChange={(e) => updateBodyMeasurement(itemIndex, fieldId, e.target.value)}
                                      className="w-20 h-8 text-center mx-auto"
                                      placeholder="0"
                                    />
                                  ) : isTryon && isManualOverride ? (
                                    <span className="text-gray-400">--</span>
                                  ) : (
                                    <span>{data.body_measurement}"</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {editMode ? (
                                    <Input
                                      type="number"
                                      step="0.25"
                                      value={data.allowance || 0}
                                      onChange={(e) => updateMeasurementAllowance(itemIndex, fieldId, e.target.value)}
                                      className="w-20 h-8 text-center mx-auto"
                                    />
                                  ) : isTryon && isManualOverride ? (
                                    <span className="text-gray-400">--</span>
                                  ) : (
                                    data.allowance !== 0 && data.allowance !== undefined ? (
                                      <span className={data.allowance > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                        {data.allowance > 0 ? '+' : ''}{data.allowance}"
                                      </span>
                                    ) : <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center font-bold">
                                  {data.body_measurement || data.allowance || data.final_measurement ? (
                                    <span>{data.final_measurement || ((data.body_measurement || 0) + (data.allowance || 0))}"</span>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                                {isTryon && !editMode && (
                                  <td className="px-3 py-2 text-center">
                                    {isManualOverride ? (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Manual</span>
                                    ) : (
                                      <span className="text-xs bg-[#faf6ed] text-[#8a7340] px-2 py-0.5 rounded font-medium">Try-On</span>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pricing Breakdown */}
                {item.pricing && (
                  <div className="flex items-center gap-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                    <div className="flex gap-8 text-sm">
                      <div>
                        <p className="text-gray-500">CMT (Base)</p>
                        <p className="text-xl font-bold">₹{item.pricing.cmt}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Styling</p>
                        <p className="text-xl font-bold">₹{item.pricing.styling}</p>
                      </div>
                      <div className="border-l pl-8">
                        <p className="text-gray-500">Total</p>
                        <p className="text-2xl font-bold text-[#c9a962]">₹{item.pricing.total}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Admin Comments */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#1a2744] text-white px-4 py-2 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Admin Comments (Internal)</span>
            </div>
            <div className="p-4">
              <Textarea
                placeholder="Add internal notes about this order..."
                value={adminComment}
                onChange={(e) => setAdminComment(e.target.value)}
                disabled={!editMode}
                rows={3}
                className={editMode ? 'border-blue-300' : ''}
              />
              {!editMode && !adminComment && (
                <p className="text-gray-400 text-sm mt-2">No admin comments yet</p>
              )}
            </div>
          </div>

          {/* Payment & Status (Editable) */}
          {editMode && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={editedOrder.payment_method || 'not_set'}
                  onValueChange={(value) => setEditedOrder({...editedOrder, payment_method: value === 'not_set' ? '' : value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_set">Not Set</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="stripe">Online Payment (Stripe)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Status</Label>
                <Select
                  value={editedOrder.payment_status || 'pending'}
                  onValueChange={(value) => setEditedOrder({...editedOrder, payment_status: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main Admin Orders Page
const AdminOrdersPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [measurementConfig, setMeasurementConfig] = useState(null);
  const [orderSettings, setOrderSettings] = useState(null);
  
  // Shipping Tracking Modal
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingOrder, setShippingOrder] = useState(null);
  const [shippingForm, setShippingForm] = useState({
    courier_name: '',
    awb_number: '',
    shipped_date: '',
    expected_delivery: '',
    tracking_url: '',
    notes: ''
  });
  const [savingShipping, setSavingShipping] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchMeasurementConfig();
    fetchOrderSettings();
  }, [activeTab]);

  const fetchOrderSettings = async () => {
    try {
      const response = await axios.get(`${API_URL}/orders/settings/order-config`);
      setOrderSettings(response.data);
    } catch (error) {
      console.error('Error fetching order settings:', error);
    }
  };

  const fetchMeasurementConfig = async () => {
    try {
      const response = await axios.get(`${API_URL}/measurements/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMeasurementConfig(response.data);
    } catch (error) {
      console.error('Error fetching measurement config:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = activeTab !== 'all' ? { status: activeTab } : {};
      const response = await axios.get(`${API_URL}/orders/admin/all`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Check if placed order should be visible to admin (past visibility delay)
  const isOrderVisibleToAdmin = (order) => {
    if (order.status !== 'placed') return true; // Always show WIP and other statuses
    
    const visibilityDelayMinutes = orderSettings?.admin_visibility_delay_minutes || 60;
    const orderDate = new Date(order.placed_at || order.updated_at || order.created_at);
    const now = new Date();
    const diffMinutes = (now - orderDate) / (1000 * 60);
    
    return diffMinutes >= visibilityDelayMinutes;
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.patch(
        `${API_URL}/orders/admin/${orderId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Order status updated to ${newStatus}`);
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/orders/admin/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Order deleted successfully');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to delete order');
    }
  };

  // Shipping Tracking Functions
  const handleOpenShippingModal = async (order) => {
    setShippingOrder(order);
    // Load existing shipping details if any
    if (order.shipping_details) {
      setShippingForm({
        courier_name: order.shipping_details.courier_name || '',
        awb_number: order.shipping_details.awb_number || '',
        shipped_date: order.shipping_details.shipped_date || '',
        expected_delivery: order.shipping_details.expected_delivery || '',
        tracking_url: order.shipping_details.tracking_url || '',
        notes: order.shipping_details.notes || ''
      });
    } else {
      setShippingForm({
        courier_name: '',
        awb_number: '',
        shipped_date: new Date().toISOString().split('T')[0],
        expected_delivery: '',
        tracking_url: '',
        notes: ''
      });
    }
    setShowShippingModal(true);
  };

  const handleSaveShipping = async () => {
    if (!shippingForm.courier_name || !shippingForm.awb_number) {
      toast.error('Courier name and AWB number are required');
      return;
    }

    setSavingShipping(true);
    try {
      await axios.post(
        `${API_URL}/pricing/shipping-tracking`,
        {
          order_id: shippingOrder.order_id,
          ...shippingForm
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Shipping details saved successfully');
      setShowShippingModal(false);
      fetchOrders();
    } catch (error) {
      console.error('Error saving shipping:', error);
      toast.error(error.response?.data?.detail || 'Failed to save shipping details');
    } finally {
      setSavingShipping(false);
    }
  };

  const handleDownloadPDF = async (orderId) => {
    try {
      // Open PDF in new window/tab (browser will handle print to PDF)
      const pdfUrl = `${API_URL}/admin/orders/${orderId}/pdf`;
      const response = await axios.get(pdfUrl, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'text'
      });
      
      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response.data);
      printWindow.document.close();
      printWindow.focus();
      
      // Auto-trigger print dialog after a short delay
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast.success('PDF opened for printing');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const handleStartChat = async (orderId) => {
    try {
      // Create or get existing chat for this order
      const response = await axios.get(`${API_URL}/chats/order/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Chat opened! Check the chat widget in bottom-right corner.');
      // The chat widget will poll and show the new chat
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error(error.response?.data?.detail || 'Failed to start chat');
    }
  };

  // Filter orders based on search and visibility
  const filteredOrders = orders
    .filter(order => isOrderVisibleToAdmin(order))
    .filter(order => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        order.order_id?.toLowerCase().includes(term) ||
        order.customer_name?.toLowerCase().includes(term) ||
        order.customer_id?.toLowerCase().includes(term)
      );
    });

  const getStatusBadge = (status) => {
    const statusConfig = {
      wip: { color: 'bg-yellow-500', label: 'WIP' },
      placed: { color: 'bg-blue-500', label: 'Placed' },
      processing: { color: 'bg-purple-500', label: 'Processing' },
      shipped: { color: 'bg-green-500', label: 'Shipped' },
      delivered: { color: 'bg-green-700', label: 'Delivered' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-500', label: status };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  const getOrderTotal = (order) => {
    return order.items?.reduce((sum, item) => sum + (item.pricing?.total || 0), 0) || 0;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShoppingCart className="h-8 w-8" />
            <h1 className="text-3xl font-bold">Order Management</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({orders.length})</TabsTrigger>
            <TabsTrigger value="wip">WIP</TabsTrigger>
            <TabsTrigger value="placed">Placed</TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Orders</CardTitle>
                <CardDescription>
                  Click on any order to view full details, edit measurements, and add comments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading orders...</div>
                ) : filteredOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No orders found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium">Order ID</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Customer</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Products</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Total</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Payment</th>
                          <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                          <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredOrders.map((order) => (
                          <tr 
                            key={order.order_id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <td className="px-4 py-3 font-mono text-sm">{order.order_id}</td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium">{order.customer_name}</p>
                                <p className="text-xs text-gray-500">{order.customer_id}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {order.items?.map((item, idx) => (
                                  <Badge key={idx} variant="outline" className="mr-1">
                                    {item.product_name}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-[#c9a962]">
                              ₹{getOrderTotal(order)}
                            </td>
                            <td className="px-4 py-3">
                              {getStatusBadge(order.status)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">
                                {order.payment_method?.replace('_', ' ') || 'Not Set'}
                              </Badge>
                              {order.payment_status === 'paid' && (
                                <Badge className="ml-1 bg-green-500 text-white">Paid</Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              {order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setSelectedOrder(order)}
                                  title="View details"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenShippingModal(order)}
                                  title={order.shipping_details?.awb_number ? "Edit shipping" : "Add shipping"}
                                  className={order.shipping_details?.awb_number ? "text-green-600 hover:text-green-800" : "text-orange-500 hover:text-orange-700"}
                                  data-testid={`shipping-order-${order.order_id}`}
                                >
                                  <Truck className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleStartChat(order.order_id)}
                                  title="Chat about this order"
                                  className="text-blue-600 hover:text-blue-800"
                                  data-testid={`chat-order-${order.order_id}`}
                                >
                                  <MessageCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDownloadPDF(order.order_id)}
                                  title="Download PDF"
                                  className="text-purple-600 hover:text-purple-800"
                                  data-testid={`pdf-order-${order.order_id}`}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Select
                                  value={order.status}
                                  onValueChange={(value) => handleStatusChange(order.order_id, value)}
                                >
                                  <SelectTrigger className="w-28 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="wip">WIP</SelectItem>
                                    <SelectItem value="placed">Placed</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteOrder(order.order_id)}
                                  title="Delete order (Admin only)"
                                  data-testid={`admin-delete-order-${order.order_id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        <OrderDetailsModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          onSave={() => {
            fetchOrders();
            setSelectedOrder(null);
          }}
          measurementConfig={measurementConfig}
        />

        {/* Shipping Tracking Modal */}
        <Dialog open={showShippingModal} onOpenChange={setShowShippingModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Shipping Details
              </DialogTitle>
              <DialogDescription>
                {shippingOrder && `Order: ${shippingOrder.order_id} - ${shippingOrder.customer_name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courier_name">Courier Name *</Label>
                  <Input
                    id="courier_name"
                    value={shippingForm.courier_name}
                    onChange={(e) => setShippingForm({...shippingForm, courier_name: e.target.value})}
                    placeholder="e.g., FedEx, DHL, BlueDart"
                    data-testid="shipping-courier-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awb_number">AWB/Tracking Number *</Label>
                  <Input
                    id="awb_number"
                    value={shippingForm.awb_number}
                    onChange={(e) => setShippingForm({...shippingForm, awb_number: e.target.value})}
                    placeholder="e.g., 1234567890"
                    data-testid="shipping-awb-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="shipped_date">Shipped Date</Label>
                  <Input
                    id="shipped_date"
                    type="date"
                    value={shippingForm.shipped_date}
                    onChange={(e) => setShippingForm({...shippingForm, shipped_date: e.target.value})}
                    data-testid="shipping-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_delivery">Expected Delivery</Label>
                  <Input
                    id="expected_delivery"
                    type="date"
                    value={shippingForm.expected_delivery}
                    onChange={(e) => setShippingForm({...shippingForm, expected_delivery: e.target.value})}
                    data-testid="shipping-expected-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tracking_url">Tracking URL</Label>
                <Input
                  id="tracking_url"
                  value={shippingForm.tracking_url}
                  onChange={(e) => setShippingForm({...shippingForm, tracking_url: e.target.value})}
                  placeholder="https://tracking.courier.com/..."
                  data-testid="shipping-url-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="shipping_notes">Notes</Label>
                <Textarea
                  id="shipping_notes"
                  value={shippingForm.notes}
                  onChange={(e) => setShippingForm({...shippingForm, notes: e.target.value})}
                  placeholder="Any additional shipping notes..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowShippingModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveShipping} 
                  disabled={savingShipping}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  data-testid="save-shipping-btn"
                >
                  {savingShipping ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Shipping Details
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminOrdersPage;
