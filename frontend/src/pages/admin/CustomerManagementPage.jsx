import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Users, 
  Search, 
  Plus,
  Eye,
  Edit,
  Trash2,
  Save,
  X,
  ShoppingCart,
  Phone,
  Mail,
  MapPin,
  Loader2,
  DollarSign,
  Package,
  Truck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const CustomerManagementPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/admin/customers`, {
        params: searchTerm ? { search: searchTerm } : {},
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm]);

  const fetchCustomerDetails = async (customerId) => {
    try {
      setLoadingDetails(true);
      const response = await axios.get(`${API_URL}/admin/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomerDetails(response.data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast.error('Failed to load customer details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleViewDetails = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerDetails(customer.customer_id);
    setShowDetailModal(true);
  };

  const handleEdit = (customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      notes: customer.notes || ''
    });
    setShowEditModal(true);
  };

  const handleCreate = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      notes: ''
    });
    setShowCreateModal(true);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.phone) {
      toast.error('Name and phone are required');
      return;
    }

    setSaving(true);
    try {
      if (showEditModal && selectedCustomer) {
        await axios.put(
          `${API_URL}/admin/customers/${selectedCustomer.customer_id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Customer updated successfully');
        setShowEditModal(false);
      } else {
        await axios.post(
          `${API_URL}/admin/customers`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success('Customer created successfully');
        setShowCreateModal(false);
      }
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error(error.response?.data?.detail || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Are you sure you want to delete ${customer.name}? This cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/admin/customers/${customer.customer_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Customer deleted successfully');
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete customer');
    }
  };

  const getOrderTotal = (order) => {
    return order.items?.reduce((sum, item) => sum + (item.pricing?.total || 0), 0) || 0;
  };

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

  // Customer Form Modal
  const CustomerFormModal = ({ isOpen, onClose, isEdit = false }) => (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEdit ? 'Edit Customer' : 'Create New Customer'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update customer information' : 'Add a new customer to the system'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Customer name"
                data-testid="customer-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
                data-testid="customer-phone-input"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Email address"
              data-testid="customer-email-input"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                placeholder="Pincode"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about the customer"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveCustomer}
            disabled={saving}
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            data-testid="save-customer-btn"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEdit ? 'Update Customer' : 'Create Customer'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  // Customer Detail Modal with Order History
  const CustomerDetailModal = () => (
    <Dialog open={showDetailModal} onOpenChange={() => setShowDetailModal(false)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#c9a962]" />
            Customer Details
          </DialogTitle>
        </DialogHeader>

        {loadingDetails ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
          </div>
        ) : customerDetails ? (
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Customer ID</p>
                <p className="font-mono font-bold">{customerDetails.customer_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold">{customerDetails.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="font-bold text-lg">{customerDetails.total_orders}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Spent</p>
                <p className="font-bold text-lg text-[#c9a962]">₹{customerDetails.total_spent?.toLocaleString()}</p>
              </div>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {customerDetails.phone && (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-600" />
                  <span>{customerDetails.phone}</span>
                </div>
              )}
              {customerDetails.email && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <Mail className="h-5 w-5 text-green-600" />
                  <span>{customerDetails.email}</span>
                </div>
              )}
              {(customerDetails.address || customerDetails.city) && (
                <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                  <MapPin className="h-5 w-5 text-purple-600" />
                  <span className="text-sm">
                    {[customerDetails.address, customerDetails.city, customerDetails.state, customerDetails.pincode]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            {/* Notes */}
            {customerDetails.notes && (
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-gray-600 mb-1">Notes</p>
                <p className="text-gray-800">{customerDetails.notes}</p>
              </div>
            )}

            {/* Order History */}
            <div>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order History ({customerDetails.orders?.length || 0} orders)
              </h3>
              
              {customerDetails.orders?.length > 0 ? (
                <div className="space-y-3">
                  {customerDetails.orders.map((order) => (
                    <div key={order.order_id} className="border rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between p-4 bg-gray-50">
                        <div className="flex items-center gap-4">
                          <span className="font-mono font-medium">{order.order_id}</span>
                          {getStatusBadge(order.status)}
                          {order.shipping_details?.awb_number && (
                            <Badge className="bg-green-100 text-green-700 flex items-center gap-1">
                              <Truck className="h-3 w-3" />
                              Shipped
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-500">
                            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', {
                              day: '2-digit', month: 'short', year: 'numeric'
                            }) : '-'}
                          </span>
                          <span className="font-bold text-[#c9a962]">₹{getOrderTotal(order)}</span>
                        </div>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {order.items?.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {item.product_name}
                            </Badge>
                          ))}
                        </div>
                        
                        {/* Shipping Details */}
                        {order.shipping_details?.awb_number && (
                          <div className="mt-2 p-3 bg-green-50 rounded-lg text-sm">
                            <div className="flex items-center gap-2 mb-2">
                              <Truck className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-green-800">Shipping Details</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-700">
                              <div>
                                <span className="text-xs text-gray-500">Courier</span>
                                <p className="font-medium">{order.shipping_details.courier_name}</p>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">AWB</span>
                                <p className="font-mono font-medium">{order.shipping_details.awb_number}</p>
                              </div>
                              {order.shipping_details.shipped_date && (
                                <div>
                                  <span className="text-xs text-gray-500">Shipped On</span>
                                  <p>{new Date(order.shipping_details.shipped_date).toLocaleDateString('en-IN')}</p>
                                </div>
                              )}
                              {order.shipping_details.expected_delivery && (
                                <div>
                                  <span className="text-xs text-gray-500">Expected</span>
                                  <p>{new Date(order.shipping_details.expected_delivery).toLocaleDateString('en-IN')}</p>
                                </div>
                              )}
                            </div>
                            {order.shipping_details.tracking_url && (
                              <a 
                                href={order.shipping_details.tracking_url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs mt-2 inline-block"
                              >
                                Track Package →
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No orders yet</p>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Customer Management</h1>
              <p className="text-[#666]">Manage customers and view order history</p>
            </div>
          </div>
          <Button 
            onClick={handleCreate}
            className="bg-[#c9a962] hover:bg-[#b89952] text-black"
            data-testid="create-customer-btn"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, email, or customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="customer-search-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customers ({customers.length})</CardTitle>
            <CardDescription>Click on a customer to view their complete order history</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium">Customer ID</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Orders</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                      <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {customers.map((customer) => (
                      <tr 
                        key={customer.customer_id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleViewDetails(customer)}
                        data-testid={`customer-row-${customer.customer_id}`}
                      >
                        <td className="px-4 py-3 font-mono text-sm">{customer.customer_id}</td>
                        <td className="px-4 py-3 font-medium">{customer.name}</td>
                        <td className="px-4 py-3">{customer.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{customer.email || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="secondary">{customer.order_count || 0}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {customer.created_at 
                            ? new Date(customer.created_at).toLocaleDateString('en-IN')
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(customer)}
                              title="View details"
                              data-testid={`view-customer-${customer.customer_id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(customer)}
                              title="Edit customer"
                              data-testid={`edit-customer-${customer.customer_id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(customer)}
                              title="Delete customer"
                              data-testid={`delete-customer-${customer.customer_id}`}
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

        {/* Modals */}
        <CustomerFormModal 
          isOpen={showCreateModal} 
          onClose={() => setShowCreateModal(false)} 
          isEdit={false}
        />
        <CustomerFormModal 
          isOpen={showEditModal} 
          onClose={() => setShowEditModal(false)} 
          isEdit={true}
        />
        <CustomerDetailModal />
      </div>
    </AdminLayout>
  );
};

export default CustomerManagementPage;
