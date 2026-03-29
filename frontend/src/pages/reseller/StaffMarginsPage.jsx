import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, 
  Save,
  DollarSign,
  Loader2,
  Info,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

const StaffMarginsPage = () => {
  const navigate = useNavigate();
  const { user, token, isStaff } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffData, setStaffData] = useState(null);
  const [customerMargins, setCustomerMargins] = useState({
    cmt_margin: 0,
    fabric_margin: 0,
    styling_margin: 0,
    shipping_margin: 0
  });
  
  // Secret code state
  const [secretCode, setSecretCode] = useState('');
  const [showSecretCode, setShowSecretCode] = useState(false);
  const [savingSecretCode, setSavingSecretCode] = useState(false);

  useEffect(() => {
    if (!isStaff()) {
      navigate('/reseller/dashboard');
      return;
    }
    fetchStaffData();
  }, [isStaff, navigate]);

  const fetchStaffData = async () => {
    try {
      setLoading(true);
      // Get current user's staff data
      const response = await api.get(`/staff/${user.email}`);
      setStaffData(response.data);
      
      // Load customer margins if set
      if (response.data.customer_margins) {
        setCustomerMargins(response.data.customer_margins);
      }
      
      // Load secret code if set
      if (response.data.cost_view_secret_code) {
        setSecretCode(response.data.cost_view_secret_code);
      }
    } catch (error) {
      console.error('Error fetching staff data:', error);
      toast.error('Failed to load your data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.patch(`/staff/${user.email}/customer-margins`, customerMargins);
      toast.success('Customer margins saved!');
    } catch (error) {
      console.error('Error saving margins:', error);
      toast.error('Failed to save margins');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecretCode = async () => {
    try {
      setSavingSecretCode(true);
      await api.patch(`/staff/${user.email}/secret-code`, { code: secretCode });
      toast.success('Secret code saved!');
    } catch (error) {
      console.error('Error saving secret code:', error);
      toast.error('Failed to save secret code');
    } finally {
      setSavingSecretCode(false);
    }
  };

  const updateMargin = (field, value) => {
    setCustomerMargins(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Calculate example pricing
  const exampleCMT = 185; // Base CMT price
  const exampleFabric = 500; // Base fabric price
  
  // Staff's cost margins (set by reseller)
  const staffCostMargins = staffData?.margins || {
    cmt_margin: 0,
    fabric_margin: 0,
    styling_margin: 0,
    shipping_margin: 0
  };

  // Calculate staff's cost
  const staffCMTCost = exampleCMT * (1 + staffCostMargins.cmt_margin / 100);
  const staffFabricCost = exampleFabric * (1 + staffCostMargins.fabric_margin / 100);

  // Calculate customer price
  const customerCMTPrice = staffCMTCost * (1 + customerMargins.cmt_margin / 100);
  const customerFabricPrice = staffFabricCost * (1 + customerMargins.fabric_margin / 100);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/dashboard')}
            className="h-10 w-10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-800">My Pricing</h1>
            <p className="text-sm text-gray-500">Set your customer margins</p>
          </div>
        </div>
        
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-[#c9a962] hover:bg-[#b89952] text-black"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Margins'}
        </Button>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How Pricing Works</p>
                <p>Your cost price is set by your reseller. Add your profit margin below to calculate the price your customers will see.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Cost Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Cost (Set by Reseller)</CardTitle>
            <CardDescription>These are the prices you pay to your reseller</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">CMT Margin</p>
                <p className="text-lg font-bold text-gray-800">{staffCostMargins.cmt_margin}%</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">Fabric Margin</p>
                <p className="text-lg font-bold text-gray-800">{staffCostMargins.fabric_margin}%</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">Styling Margin</p>
                <p className="text-lg font-bold text-gray-800">{staffCostMargins.styling_margin}%</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-lg">
                <p className="text-xs text-gray-500">Shipping Margin</p>
                <p className="text-lg font-bold text-gray-800">{staffCostMargins.shipping_margin}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#c9a962]" />
              Your Customer Margins
            </CardTitle>
            <CardDescription>
              Set your profit margins. Customer price = Your Cost + Your Margin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>CMT Margin (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={customerMargins.cmt_margin}
                  onChange={(e) => updateMargin('cmt_margin', e.target.value)}
                  data-testid="staff-customer-cmt-margin"
                />
                <p className="text-xs text-gray-500">Applied to tailoring cost</p>
              </div>

              <div className="space-y-2">
                <Label>Fabric Margin (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={customerMargins.fabric_margin}
                  onChange={(e) => updateMargin('fabric_margin', e.target.value)}
                  data-testid="staff-customer-fabric-margin"
                />
                <p className="text-xs text-gray-500">Applied to fabric cost</p>
              </div>

              <div className="space-y-2">
                <Label>Styling Margin (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={customerMargins.styling_margin}
                  onChange={(e) => updateMargin('styling_margin', e.target.value)}
                  data-testid="staff-customer-styling-margin"
                />
                <p className="text-xs text-gray-500">Applied to styling options</p>
              </div>

              <div className="space-y-2">
                <Label>Shipping Margin (%)</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={customerMargins.shipping_margin}
                  onChange={(e) => updateMargin('shipping_margin', e.target.value)}
                  data-testid="staff-customer-shipping-margin"
                />
                <p className="text-xs text-gray-500">Applied to shipping cost</p>
              </div>
            </div>

            {/* Pricing Preview */}
            <div className="bg-[#1a2744] rounded-lg p-6 text-white mt-6">
              <h4 className="font-medium mb-4">Example Pricing Breakdown</h4>
              <div className="space-y-4 text-sm">
                {/* CMT Example */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-white/60">Base CMT</p>
                    <p className="font-bold">₹{exampleCMT}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Your Cost (+{staffCostMargins.cmt_margin}%)</p>
                    <p className="font-bold">₹{Math.round(staffCMTCost)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Customer Price (+{customerMargins.cmt_margin}%)</p>
                    <p className="font-bold text-[#c9a962]">₹{Math.round(customerCMTPrice)}</p>
                  </div>
                </div>

                {/* Fabric Example */}
                <div className="grid grid-cols-3 gap-4 border-t border-white/20 pt-4">
                  <div>
                    <p className="text-white/60">Base Fabric</p>
                    <p className="font-bold">₹{exampleFabric}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Your Cost (+{staffCostMargins.fabric_margin}%)</p>
                    <p className="font-bold">₹{Math.round(staffFabricCost)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Customer Price (+{customerMargins.fabric_margin}%)</p>
                    <p className="font-bold text-[#c9a962]">₹{Math.round(customerFabricPrice)}</p>
                  </div>
                </div>

                {/* Total Example */}
                <div className="border-t border-white/20 pt-4">
                  <div className="flex justify-between">
                    <span className="text-white/60">Your Profit on this example:</span>
                    <span className="font-bold text-green-400">
                      ₹{Math.round((customerCMTPrice - staffCMTCost) + (customerFabricPrice - staffFabricCost))}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secret Code Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#c9a962]" />
              Cost View Secret Code
            </CardTitle>
            <CardDescription>
              Set a secret code to view your cost prices during customer sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Secret Code</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showSecretCode ? "text" : "password"}
                      value={secretCode}
                      onChange={(e) => setSecretCode(e.target.value)}
                      placeholder="Enter your secret code"
                      className="pr-10"
                      data-testid="staff-secret-code-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecretCode(!showSecretCode)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecretCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    onClick={handleSaveSecretCode}
                    disabled={savingSecretCode}
                    className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                    data-testid="save-secret-code-btn"
                  >
                    {savingSecretCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Enter this code on the Styling page to view your cost prices while showing customer prices
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default StaffMarginsPage;
