import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Home,
  ShoppingCart,
  Camera,
  Upload,
  Loader2,
  Copy,
  Trash2,
  Edit,
  Link,
  FileText,
  X,
  Ruler,
  Palette,
  Package,
  DollarSign,
  CreditCard,
  Building
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

// Order Details Modal Component
const OrderDetailsModal = ({ isOpen, onClose, order, item, itemIndex, showPricing = true, measurementConfig, onRelink }) => {
  const [pricingView, setPricingView] = React.useState('customer'); // 'customer' or 'admin'
  
  if (!order || !item) return null;

  const rawConfiguration = item.configuration || {};
  const styling = item.styling || {};
  const pricing = item.pricing || {};
  const linkedMeasurements = item.linked_measurements?.measurements || {};
  const stylingComments = styling.comments || '';
  const stylingImages = styling.images || [];

  // Normalize configuration: can be an array of config sets or a single object
  const configSets = Array.isArray(rawConfiguration) ? rawConfiguration : [rawConfiguration];

  // Create a lookup function for measurement field names
  const getMeasurementName = (fieldId) => {
    if (!measurementConfig?.fields) {
      return fieldId.replace(/-/g, ' ').replace(/field /i, '');
    }
    const field = measurementConfig.fields.find(f => f.id === fieldId);
    return field?.name || fieldId.replace(/-/g, ' ').replace(/field /i, '');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-[#c9a962]" />
            Order Details - {order.order_id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Customer</p>
              <p className="font-semibold">{order.customer_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Product</p>
              <p className="font-semibold">{item.product_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium">{item.category_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Date</p>
              <p className="font-medium">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric'
                }) : '-'}
              </p>
            </div>
            {order.created_by && order.created_by !== order.reseller_email && (
              <div>
                <p className="text-sm text-gray-500">Created By (Staff)</p>
                <p className="font-medium text-blue-600">{order.created_by}</p>
              </div>
            )}
          </div>

          {/* Configuration Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#1a2744] text-white px-4 py-2 flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="font-medium">Configuration (Fabric/Lining/Button)</span>
            </div>
            <div className="p-4">
              {configSets.length > 0 && Object.keys(configSets[0] || {}).length > 0 ? (
                <div className="space-y-4">
                  {configSets.map((configSet, setIdx) => (
                    <div key={setIdx}>
                      {configSets.length > 1 && (
                        <p className="text-sm font-semibold text-gray-700 mb-2">Set #{setIdx + 1}</p>
                      )}
                      <div className="grid grid-cols-3 gap-4">
                        {Object.entries(configSet || {}).filter(([key]) => 
                          key !== 'id' && key !== 'size_category'
                        ).map(([key, value]) => {
                          if (!value || typeof value !== 'object') return null;
                          return (
                            <div key={key} className="text-center p-3 bg-gray-50 rounded-lg" data-testid={`config-${key}-${setIdx}`}>
                              <p className="text-sm text-gray-500 capitalize mb-2">{key}</p>
                              {value?.image ? (
                                <img 
                                  src={value.image} 
                                  alt={key}
                                  className="w-20 h-20 object-cover rounded mx-auto mb-2"
                                />
                              ) : (
                                <div className="w-20 h-20 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No image</span>
                                </div>
                              )}
                              {/* Fabric Name */}
                              {value?.name && (
                                <p className="text-xs font-medium text-gray-700 mb-1">{value.name}</p>
                              )}
                              {/* Price Code */}
                              {value?.code && (
                                <p className="font-mono text-sm font-bold">{value.code}</p>
                              )}
                              {/* SKU */}
                              {value?.sku && (
                                <p className="font-mono text-xs text-blue-600">SKU: {value.sku}</p>
                              )}
                              {/* Base Price */}
                              {value?.base_price > 0 && (
                                <p className="text-xs text-green-600">${value.base_price}/m</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Size Category */}
                      {configSet?.size_category && (
                        <div className="mt-2 inline-block bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded">
                          Size Category: {configSet.size_category}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No configuration data</p>
              )}
            </div>
          </div>

          {/* Styling Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#1a2744] text-white px-4 py-2 flex items-center gap-2">
              <Palette className="h-4 w-4" />
              <span className="font-medium">Styling Options</span>
            </div>
            <div className="p-4">
              {styling.construction && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-500">Construction</p>
                  <p className="font-semibold">{styling.construction.name}</p>
                  {showPricing && styling.construction.base_price > 0 && (
                    <p className="text-sm text-gray-600">+₹{styling.construction.base_price}</p>
                  )}
                </div>
              )}
              
              {styling.options && Object.keys(styling.options).length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {Object.entries(styling.options).map(([key, option]) => (
                    <div key={key} className="p-3 bg-gray-50 rounded-lg text-center">
                      <p className="text-xs text-gray-500 capitalize mb-2">{key.replace(/-/g, ' ')}</p>
                      {/* Show option image if available */}
                      {option?.image ? (
                        <img 
                          src={option.image} 
                          alt={option?.name}
                          className="w-16 h-16 object-contain mx-auto mb-2 rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                          <span className="text-2xl">👔</span>
                        </div>
                      )}
                      <p className="font-medium text-sm">{option?.name || '-'}</p>
                      {showPricing && option?.surcharge > 0 && (
                        <p className="text-xs text-green-600">+₹{option.surcharge}</p>
                      )}
                      {/* Show text input value if exists */}
                      {styling.text_inputs && (() => {
                        const matchingEntries = Object.entries(styling.text_inputs).filter(([k]) => k === key || k.startsWith(key + '__'));
                        return matchingEntries.length > 0 ? matchingEntries.map(([k, v]) => (
                          <p key={k} className="mt-1.5 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 break-words">
                            "{v}"
                          </p>
                        )) : null;
                      })()}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-2">No styling options selected</p>
              )}
              
              {/* Comments Section */}
              {stylingComments && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-1">Comments</p>
                  <p className="text-sm text-gray-800">{stylingComments}</p>
                </div>
              )}
              
              {/* Uploaded Images Section */}
              {stylingImages.length > 0 && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-600 mb-2">Reference Images</p>
                  <div className="flex gap-2 flex-wrap">
                    {stylingImages.map((img, idx) => (
                      <img 
                        key={img.id || idx}
                        src={img.url} 
                        alt={img.name || `Image ${idx + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Measurements Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-[#1a2744] text-white px-4 py-2 flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              <span className="font-medium">Measurements</span>
              {item.linked_measurements?.measurement_mode === 'tryon' && (
                <span className="text-xs bg-[#c9a962] text-black px-2 py-0.5 rounded font-medium ml-1">Try-On</span>
              )}
              {item.measurement_linked ? (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs bg-green-500 px-2 py-0.5 rounded">Linked</span>
                  {onRelink && (
                    <button
                      onClick={() => onRelink(order, itemIndex)}
                      className="text-xs bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      data-testid="modal-relink-measurement"
                    >
                      <Edit className="h-3 w-3" />
                      Relink
                    </button>
                  )}
                </div>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs bg-yellow-500 px-2 py-0.5 rounded">Not Linked</span>
                  {onRelink && (
                    <button
                      onClick={() => onRelink(order, itemIndex)}
                      className="text-xs bg-blue-500 hover:bg-blue-600 px-2 py-0.5 rounded flex items-center gap-1 transition-colors"
                      data-testid="modal-link-measurement"
                    >
                      <Link className="h-3 w-3" />
                      Link
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="p-4">
              {Object.keys(linkedMeasurements).length > 0 ? (
                <>
                  {/* Try-On Selection Summary */}
                  {item.linked_measurements?.measurement_mode === 'tryon' && item.linked_measurements?.tryon_selections && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {Object.entries(item.linked_measurements.tryon_selections).map(([garmentId, sel]) => {
                        if (!sel?.fit_id || !sel?.size) return null;
                        return (
                          <div key={garmentId} className="inline-flex items-center gap-2 bg-[#faf6ed] border border-[#c9a962]/30 rounded-lg px-3 py-1.5">
                            <Ruler className="h-3.5 w-3.5 text-[#c9a962]" />
                            <span className="text-sm font-medium text-[#1a2744] capitalize">{garmentId}</span>
                            <span className="text-xs text-gray-500">|</span>
                            <span className="text-sm text-gray-600 capitalize">{sel.fit_id}</span>
                            <span className="text-xs text-gray-500">|</span>
                            <span className="text-sm font-bold text-[#c9a962]">Size {sel.size}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Measurement Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Measurement</th>
                          {item.linked_measurements?.measurement_mode === 'tryon' ? (
                            <>
                              <th className="text-center px-3 py-2 font-medium">Base Size</th>
                              <th className="text-center px-3 py-2 font-medium">Adjustment</th>
                              <th className="text-center px-3 py-2 font-medium">Final</th>
                              <th className="text-center px-3 py-2 font-medium">Method</th>
                            </>
                          ) : (
                            <>
                              <th className="text-center px-3 py-2 font-medium">Body</th>
                              <th className="text-center px-3 py-2 font-medium">Allowance</th>
                              <th className="text-center px-3 py-2 font-medium">Final</th>
                              <th className="text-center px-3 py-2 font-medium">Status</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(linkedMeasurements).map(([fieldId, data]) => {
                          const isTryon = item.linked_measurements?.measurement_mode === 'tryon';
                          const isManualOverride = data.method === 'tryon_manual';
                          
                          return (
                            <tr key={fieldId} className="border-t">
                              <td className="px-3 py-2 font-medium uppercase">{getMeasurementName(fieldId)}</td>
                              
                              {isTryon ? (
                                <>
                                  <td className="px-3 py-2 text-center text-gray-600">
                                    {isManualOverride ? (
                                      <span className="text-gray-400">--</span>
                                    ) : (
                                      <span>{data.body_measurement}"</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {isManualOverride ? (
                                      <span className="text-gray-400">--</span>
                                    ) : data.allowance !== 0 ? (
                                      <span className={data.allowance > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                        {data.allowance > 0 ? '+' : ''}{data.allowance}"
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">0</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">
                                    {data.final_measurement}"
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {isManualOverride ? (
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">Manual</span>
                                    ) : (
                                      <span className="text-xs bg-[#faf6ed] text-[#8a7340] px-2 py-0.5 rounded font-medium">Try-On</span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td className="px-3 py-2 text-center">{data.body_measurement}"</td>
                                  <td className="px-3 py-2 text-center">
                                    {data.allowance !== 0 ? (
                                      <span className={data.allowance > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {data.allowance > 0 ? '+' : ''}{data.allowance}"
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center font-bold">
                                    {data.allowance !== 0 && data.allowance !== undefined ? (
                                      <span>{data.final_measurement}"</span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    {data.needed ? (
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Needed</span>
                                    ) : (
                                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Not Needed</span>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No measurements linked yet. Click "Link Measurement" to add.
                </p>
              )}
            </div>
          </div>

          {/* Pricing Section - with Admin/Customer toggle */}
          {showPricing && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-[#1a2744] text-white px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-medium">Pricing</span>
                </div>
                {/* Admin/Customer toggle */}
                <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5" data-testid="pricing-view-toggle">
                  <button
                    onClick={() => setPricingView('customer')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      pricingView === 'customer' 
                        ? 'bg-[#c9a962] text-black' 
                        : 'text-white/70 hover:text-white'
                    }`}
                    data-testid="pricing-view-customer"
                  >
                    Customer Price
                  </button>
                  <button
                    onClick={() => setPricingView('admin')}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      pricingView === 'admin' 
                        ? 'bg-blue-500 text-white' 
                        : 'text-white/70 hover:text-white'
                    }`}
                    data-testid="pricing-view-admin"
                  >
                    Admin Cost
                  </button>
                </div>
              </div>
              <div className="p-4">
                {pricingView === 'customer' ? (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">CMT</p>
                      <p className="text-2xl font-bold">{pricing.cmt_customer_price || pricing.cmt || 0}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Fabric</p>
                      <p className="text-2xl font-bold">{pricing.fabric_customer_price || pricing.fabric || 0}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Styling</p>
                      <p className="text-2xl font-bold">{pricing.styling_customer_price || pricing.styling || 0}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Shipping</p>
                      <p className="text-2xl font-bold">{pricing.shipping_customer_price || pricing.shipping || 0}</p>
                    </div>
                    <div className="col-span-2 p-3 bg-[#c9a962]/20 rounded-lg">
                      <p className="text-sm text-gray-500">Total Customer Price</p>
                      <p className="text-2xl font-bold text-[#c9a962]">{pricing.total_customer_price || pricing.total || 0}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">CMT (Cost)</p>
                      <p className="text-2xl font-bold text-blue-700">{pricing.cmt_reseller_cost || pricing.cmt || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Fabric (Cost)</p>
                      <p className="text-2xl font-bold text-blue-700">{pricing.fabric_reseller_cost || pricing.fabric || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Styling (Cost)</p>
                      <p className="text-2xl font-bold text-blue-700">{pricing.styling_reseller_cost || pricing.styling || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Shipping (Cost)</p>
                      <p className="text-2xl font-bold text-blue-700">{pricing.shipping_reseller_cost || pricing.shipping || 0}</p>
                    </div>
                    <div className="col-span-2 p-3 bg-blue-100 rounded-lg">
                      <p className="text-sm text-blue-600">Total Reseller Cost</p>
                      <p className="text-2xl font-bold text-blue-800">{pricing.total_reseller_cost || pricing.total || 0}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Shipping Details Section - Visible to resellers when order is shipped */}
          {order.shipping_details?.awb_number && (
            <div className="border rounded-lg overflow-hidden border-green-200">
              <div className="bg-green-600 text-white px-4 py-2 flex items-center gap-2">
                <Package className="h-4 w-4" />
                <span className="font-medium">Shipping Information</span>
              </div>
              <div className="p-4 bg-green-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500">Courier</p>
                    <p className="font-semibold">{order.shipping_details.courier_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">AWB/Tracking Number</p>
                    <p className="font-mono font-bold text-green-700">{order.shipping_details.awb_number}</p>
                  </div>
                  {order.shipping_details.shipped_date && (
                    <div>
                      <p className="text-xs text-gray-500">Shipped On</p>
                      <p className="font-medium">
                        {new Date(order.shipping_details.shipped_date).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                  {order.shipping_details.expected_delivery && (
                    <div>
                      <p className="text-xs text-gray-500">Expected Delivery</p>
                      <p className="font-medium text-blue-600">
                        {new Date(order.shipping_details.expected_delivery).toLocaleDateString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>
                {order.shipping_details.tracking_url && (
                  <a 
                    href={order.shipping_details.tracking_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Link className="h-4 w-4" />
                    Track Package
                  </a>
                )}
                {order.shipping_details.notes && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                    <p className="text-xs text-gray-500 mb-1">Shipping Notes</p>
                    <p className="text-sm">{order.shipping_details.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const WIPOrdersPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer } = location.state || {};
  const { user, isStaff, getParentResellerEmail } = useAuth();
  const resellerId = (isStaff() ? getParentResellerEmail() : user?.email) || 'default';
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('wip');
  const [orders, setOrders] = useState([]);
  const [resellerSettings, setResellerSettings] = useState(null);
  const [measurementConfig, setMeasurementConfig] = useState(null);
  const [orderSettings, setOrderSettings] = useState(null);
  const [userPaymentMethods, setUserPaymentMethods] = useState({ bank_transfer: true, stripe: true });
  
  // Details modal state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Payment modal state
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch user info to get payment methods
  const fetchUserInfo = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.payment_methods) {
        setUserPaymentMethods(response.data.payment_methods);
        // Set default payment method based on what's allowed
        if (response.data.payment_methods.stripe && !response.data.payment_methods.bank_transfer) {
          setPaymentMethod('stripe');
        } else if (response.data.payment_methods.bank_transfer && !response.data.payment_methods.stripe) {
          setPaymentMethod('bank_transfer');
        }
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  useEffect(() => {
    // Fetch reseller settings, measurement config, order settings, and user info once on mount
    fetchResellerSettings();
    fetchMeasurementConfig();
    fetchOrderSettings();
    fetchUserInfo();
    
    // Check for Stripe payment return
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const sessionId = urlParams.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      // Verify the payment
      verifyStripePayment(sessionId);
    } else if (paymentStatus === 'cancelled') {
      toast.warning('Payment was cancelled');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    // Fetch orders regardless of customer selection
    fetchOrders();
  }, [customer, activeTab]);

  const fetchMeasurementConfig = async () => {
    try {
      const response = await api.get('/measurements/config');
      setMeasurementConfig(response.data);
    } catch (error) {
      console.error('Error fetching measurement config:', error);
    }
  };

  const fetchOrderSettings = async () => {
    try {
      const response = await api.get('/orders/settings/order-config');
      setOrderSettings(response.data);
    } catch (error) {
      console.error('Error fetching order settings:', error);
      // Use defaults if fetch fails
      setOrderSettings({
        edit_time_limit_minutes: 60,
        allow_reseller_delete_placed: false
      });
    }
  };

  // Check if a placed order can still be edited (within time limit)
  const canEditPlacedOrder = (order) => {
    if (order.status === 'wip') return true;
    if (order.status !== 'placed') return false;
    
    const editTimeLimitMinutes = orderSettings?.edit_time_limit_minutes || 60;
    const orderDate = new Date(order.placed_at || order.updated_at || order.created_at);
    const now = new Date();
    const diffMinutes = (now - orderDate) / (1000 * 60);
    
    return diffMinutes <= editTimeLimitMinutes;
  };

  // Get remaining edit time for placed orders
  const getRemainingEditTime = (order) => {
    if (order.status !== 'placed') return null;
    
    const editTimeLimitMinutes = orderSettings?.edit_time_limit_minutes || 60;
    const orderDate = new Date(order.placed_at || order.updated_at || order.created_at);
    const now = new Date();
    const diffMinutes = (now - orderDate) / (1000 * 60);
    const remainingMinutes = Math.max(0, editTimeLimitMinutes - diffMinutes);
    
    if (remainingMinutes <= 0) return null;
    
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = Math.round(remainingMinutes % 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left to edit`;
    }
    return `${minutes}m left to edit`;
  };

  const verifyStripePayment = async (sessionId) => {
    try {
      const response = await api.post('/settings/checkout/verify-payment', {
        session_id: sessionId
      });
      
      if (response.data.status === 'paid') {
        toast.success('Payment successful! Order has been placed.');
        setActiveTab('placed');
      } else {
        toast.warning(`Payment status: ${response.data.status}`);
      }
      
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      
      // Refresh orders
      if (customer?.customer_id) {
        fetchOrders();
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Could not verify payment status');
    }
  };

  const fetchResellerSettings = async () => {
    try {
      const response = await api.get(`/reseller-settings/${resellerId}`);
      setResellerSettings(response.data);
    } catch (error) {
      console.error('Error fetching reseller settings:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = { status: activeTab };
      
      // If customer is selected, filter by customer_id
      if (customer?.customer_id) {
        params.customer_id = customer.customer_id;
      }
      
      const response = await api.get('/orders', { params });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleShowDetails = (order, item, itemIndex = 0) => {
    setSelectedOrder(order);
    setSelectedItem(item);
    setSelectedItemIndex(itemIndex);
    setShowDetails(true);
  };

  const handlePlaceOrder = (orderId) => {
    // Open payment modal instead of directly placing
    setSelectedOrderForPayment(orderId);
    setPaymentMethod('bank_transfer');
    setPaymentModalOpen(true);
  };

  const confirmPlaceOrder = async () => {
    if (!selectedOrderForPayment) return;
    
    setProcessingPayment(true);
    try {
      if (paymentMethod === 'stripe') {
        // Get order for pricing info
        const order = orders.find(o => o.order_id === selectedOrderForPayment);
        
        // Calculate ADMIN payment amount (reseller cost, NOT customer price)
        // First try order-level admin_payment.amount_due, then fall back to items
        let adminPaymentAmount = order?.admin_payment?.amount_due || 0;
        
        if (adminPaymentAmount === 0) {
          // Fall back to calculating from items
          adminPaymentAmount = order?.items?.reduce((sum, item) => {
            return sum + (item.pricing?.total_reseller_cost || 0);
          }, 0) || 0;
        }
        
        if (adminPaymentAmount === 0) {
          toast.error('Unable to determine payment amount. Please check order pricing.');
          setProcessingPayment(false);
          return;
        }
        
        // Create Stripe checkout session for ADMIN payment (using ADMIN's Stripe keys)
        const response = await api.post('/payment/checkout/create-session', {
          order_id: selectedOrderForPayment,
          amount: adminPaymentAmount,
          payment_type: 'admin',  // This is reseller paying admin
          success_url: window.location.origin + '/reseller/orders?payment=success',
          cancel_url: window.location.origin + '/reseller/orders?payment=cancelled'
        });
        
        // Redirect to Stripe checkout
        if (response.data.url) {
          window.location.href = response.data.url;
        } else {
          throw new Error('No checkout URL returned');
        }
      } else {
        // Bank transfer - just update status
        await api.patch(`/orders/${selectedOrderForPayment}/status`, { 
          status: 'placed',
          payment_method: 'bank_transfer',
          payment_status: 'pending'
        });
        toast.success('Order placed! Payment pending via bank transfer.');
        setPaymentModalOpen(false);
        fetchOrders();
      }
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to process order';
      toast.error(errorMsg);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCopyOrder = async (order, item) => {
    // Navigate to styling page with pre-filled data for returning customer
    toast.success('Loading order for re-order...');
    
    // Get customer info from order if not in state
    const customerInfo = customer || {
      customer_id: order.customer_id,
      name: order.customer_name
    };
    
    // Get the product info from the order item
    const productInfo = {
      id: item.product_id,
      name: item.product_name
    };
    
    const categoryInfo = item.category_id ? {
      id: item.category_id,
      name: item.category_name
    } : null;
    
    // Navigate to styling page with all pre-filled data
    navigate('/reseller/styling', {
      state: {
        customer: customerInfo,
        category: categoryInfo,
        product: productInfo,
        configuration: item.configuration,
        prefillStyling: item.styling,
        prefillMeasurements: item.linked_measurements,
        sourceOrderId: order.order_id,
        returnMode: true
      }
    });
  };

  const handleDeleteOrder = async (order) => {
    // Only WIP orders can be deleted by reseller
    if (order.status !== 'wip') {
      toast.error('Only WIP orders can be deleted. Contact admin to delete placed orders.');
      return;
    }
    
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await api.delete(`/orders/${order.order_id}`);
        toast.success('Order deleted');
        fetchOrders();
      } catch (error) {
        const errorMsg = error.response?.data?.detail || 'Failed to delete order';
        toast.error(errorMsg);
      }
    }
  };

  const handleEditOrder = (order) => {
    // Check if order can be edited
    if (!canEditPlacedOrder(order)) {
      toast.error('This order can no longer be edited. The edit time window has expired.');
      return;
    }
    
    // Navigate to configure page with order data for editing
    const item = order.items?.[0];
    if (!item) {
      toast.error('Order has no items');
      return;
    }

    // Get customer info from order if not in state
    const customerInfo = customer || {
      customer_id: order.customer_id,
      name: order.customer_name
    };

    // Get category and product info
    const categoryInfo = {
      id: item.category_id,
      name: item.category_name
    };
    const productInfo = {
      id: item.product_id,
      name: item.product_name,
      measurement_type: item.measurement_type
    };

    navigate('/reseller/customize/configure', {
      state: {
        customer: customerInfo,
        category: categoryInfo,
        product: productInfo,
        existingConfiguration: item.configuration,
        editMode: true,
        editOrderId: order.order_id,
        prefillStyling: item.styling,
        prefillMeasurements: item.linked_measurements
      }
    });
  };

  const handleLinkMeasurement = (order, itemIndex) => {
    // Get customer info from order if not in state
    const customerInfo = customer || {
      customer_id: order.customer_id,
      name: order.customer_name
    };
    
    navigate('/reseller/link-measurement', {
      state: {
        customer: customerInfo,
        order,
        itemIndex
      }
    });
  };

  // Guard
  // Allow page to work without customer - show all orders
  const showAllOrders = !customer;
  
  const tabs = [
    { id: 'wip', label: 'WIP' },
    { id: 'placed', label: 'Placed Order' },
    { id: 'shipped', label: 'Shipped' },
    { id: 'staff', label: 'Staff Order' },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a2744] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={LOGO_URL} alt="Logo" className="h-10 w-auto" />
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
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-orange-500 px-3 py-2 rounded text-white text-sm">
            {customer ? `${customer.name} - ${customer.phone || ''}` : 'All Orders'}
          </div>
          <Button variant="ghost" size="icon" className="text-white">
            <ShoppingCart className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "outline"}
                className={activeTab === tab.id 
                  ? "bg-[#1a2744] text-white" 
                  : "bg-white"
                }
                onClick={() => setActiveTab(tab.id)}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Orders Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#1a2744]" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No {activeTab === 'wip' ? 'WIP' : activeTab} orders found</p>
                <Button 
                  className="mt-4 bg-[#1a2744]"
                  onClick={() => navigate('/reseller/customize', { state: { customer } })}
                >
                  Create New Order
                </Button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Order ID</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Details</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Product Name</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Place</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Copy</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    order.items?.map((item, itemIndex) => (
                      <tr key={`${order.order_id}-${itemIndex}`} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-[#1a2744]">{order.order_id}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-xs bg-[#1a2744] text-white hover:bg-[#2a3754]"
                            onClick={() => handleShowDetails(order, item, itemIndex)}
                            data-testid={`details-${order.order_id}`}
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Details
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.product_name}</span>
                            {/* Only show Link/Relink buttons in WIP tab */}
                            {activeTab === 'wip' && (
                              item.measurement_linked ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    Linked
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-6 px-2"
                                    onClick={() => handleLinkMeasurement(order, itemIndex)}
                                    data-testid={`relink-measurement-${order.order_id}`}
                                    title="Edit or relink measurement"
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Relink
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="default"
                                  size="sm"
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleLinkMeasurement(order, itemIndex)}
                                  data-testid={`link-measurement-${order.order_id}`}
                                >
                                  <Link className="h-3 w-3 mr-1" />
                                  Link Measurement
                                </Button>
                              )
                            )}
                            {/* Show only "Linked" badge for non-WIP orders */}
                            {activeTab !== 'wip' && item.measurement_linked && (
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                Linked
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {activeTab === 'wip' && !isStaff() && (
                            <Button
                              size="sm"
                              className={`text-xs ${
                                item.measurement_linked 
                                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              }`}
                              onClick={() => item.measurement_linked && handlePlaceOrder(order.order_id)}
                              disabled={!item.measurement_linked}
                              title={!item.measurement_linked ? 'Link measurement first' : 'Place order'}
                              data-testid={`place-order-${order.order_id}`}
                            >
                              Place
                            </Button>
                          )}
                          {activeTab === 'wip' && isStaff() && (
                            <span className="text-xs text-gray-400" title="Only reseller can place orders">
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleCopyOrder(order, item)}
                            title="Re-order with same styling"
                            data-testid={`copy-order-${order.order_id}`}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1">
                              {/* Edit Button - Always visible for WIP, conditionally for Placed */}
                              {(activeTab === 'wip' || canEditPlacedOrder(order)) && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={() => handleEditOrder(order)}
                                  title={activeTab === 'placed' ? `Edit order (${getRemainingEditTime(order)})` : "Edit order"}
                                  data-testid={`edit-order-${order.order_id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              
                              {/* Delete Button - Only for WIP orders */}
                              {activeTab === 'wip' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-red-500"
                                  onClick={() => handleDeleteOrder(order)}
                                  title="Delete order"
                                  data-testid={`delete-order-${order.order_id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Show remaining edit time for placed orders */}
                            {activeTab === 'placed' && canEditPlacedOrder(order) && (
                              <span className="text-xs text-amber-600">
                                {getRemainingEditTime(order)}
                              </span>
                            )}
                            
                            {/* Show "Edit expired" for placed orders past time limit */}
                            {activeTab === 'placed' && !canEditPlacedOrder(order) && (
                              <span className="text-xs text-gray-400">
                                Edit expired
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        order={selectedOrder}
        item={selectedItem}
        itemIndex={selectedItemIndex}
        showPricing={resellerSettings?.show_pricing ?? true}
        measurementConfig={measurementConfig}
        onRelink={(order, itemIdx) => {
          setShowDetails(false);
          handleLinkMeasurement(order, itemIdx);
        }}
      />

      {/* Payment Method Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Pay Admin
            </DialogTitle>
            <DialogDescription>
              Pay your cost to admin to place this order
            </DialogDescription>
          </DialogHeader>
          
          {/* Show payment amount breakdown */}
          {selectedOrderForPayment && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 my-2">
              <p className="text-sm text-amber-800 font-medium mb-2">Amount to Pay (Your Cost):</p>
              <p className="text-2xl font-bold text-amber-900">
                ₹{(() => {
                  const order = orders.find(o => o.order_id === selectedOrderForPayment);
                  // First try to use the order-level admin_payment.amount_due
                  if (order?.admin_payment?.amount_due > 0) {
                    return order.admin_payment.amount_due.toLocaleString();
                  }
                  // Fall back to calculating from items' pricing
                  const itemTotal = order?.items?.reduce((sum, item) => 
                    sum + (item.pricing?.total_reseller_cost || 0), 0) || 0;
                  return itemTotal.toLocaleString();
                })()}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                This is admin cost + admin margin (excludes your profit margin)
              </p>
            </div>
          )}
          
          <div className="py-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
              {userPaymentMethods.bank_transfer && (
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                  <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Building className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Bank Transfer</p>
                        <p className="text-sm text-gray-500">Pay via NEFT/RTGS/IMPS</p>
                      </div>
                    </div>
                  </Label>
                </div>
              )}
              
              {userPaymentMethods.stripe && (
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="stripe" id="stripe" />
                  <Label htmlFor="stripe" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-purple-600" />
                      <div>
                        <p className="font-medium">Online Payment</p>
                        <p className="text-sm text-gray-500">Pay securely with card via Stripe</p>
                      </div>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </div>
          
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmPlaceOrder}
              disabled={processingPayment}
              className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            >
              {processingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Pay Admin & Place Order'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WIPOrdersPage;
