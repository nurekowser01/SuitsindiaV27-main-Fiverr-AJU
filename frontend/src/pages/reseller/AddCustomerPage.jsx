import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Building,
  Hash,
  FileText,
  Save,
  X
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const AddCustomerPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/customers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Customer added successfully! ID: ${response.data.customer_id}`);
      navigate('/reseller/dashboard', { state: { newCustomer: response.data } });
    } catch (error) {
      console.error('Error creating customer:', error);
      toast.error('Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/reseller/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/dashboard')}
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
          <h1 className="text-xl font-semibold text-gray-800">Add New Customer</h1>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Form Header */}
          <div className="bg-gradient-to-r from-[#c9a962] to-[#a88b4a] p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <User className="h-8 w-8 text-white" />
              </div>
              <div className="text-white">
                <h2 className="text-xl font-semibold">Customer Details</h2>
                <p className="text-white/80 text-sm">Fill in the information below</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-6 space-y-6">
            {/* Name - Required */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
                <User className="h-4 w-4 text-[#c9a962]" />
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter customer's full name"
                className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] h-12 text-lg"
                required
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4 text-[#c9a962]" />
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="customer@example.com"
                className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] h-12 text-lg"
              />
            </div>

            {/* Phone - Required */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4 text-[#c9a962]" />
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] h-12 text-lg"
                required
              />
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4 text-[#c9a962]" />
                Address
              </Label>
              <Textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Street address, building, apartment..."
                className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] min-h-[80px]"
                rows={2}
              />
            </div>

            {/* City, State, Pincode - Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="flex items-center gap-2 text-gray-700">
                  <Building className="h-4 w-4 text-[#c9a962]" />
                  City
                </Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state" className="text-gray-700">State</Label>
                <Input
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="State"
                  className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode" className="flex items-center gap-2 text-gray-700">
                  <Hash className="h-4 w-4 text-[#c9a962]" />
                  Pincode
                </Label>
                <Input
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="Pincode"
                  className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] h-12"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="flex items-center gap-2 text-gray-700">
                <FileText className="h-4 w-4 text-[#c9a962]" />
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes about this customer..."
                className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] min-h-[100px]"
                rows={3}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="px-6 pb-6 flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-12 border-gray-300 text-gray-700"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-gradient-to-r from-[#c9a962] to-[#a88b4a] hover:from-[#b89952] hover:to-[#987b3a] text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default AddCustomerPage;
