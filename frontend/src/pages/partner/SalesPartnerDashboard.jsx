import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Home,
  Users,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  LogOut,
  Search,
  UserPlus,
  Eye,
  Calendar,
  Building2,
  MessageCircle
} from 'lucide-react';
import ChatWidget from '../../components/chat/ChatWidget';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const SalesPartnerDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total_referrals: 0,
    total_orders: 0,
    total_commission: 0,
    pending_commission: 0
  });
  const [referredResellers, setReferredResellers] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Sales Partner token is stored in 'partner_token'
      const token = localStorage.getItem('partner_token');
      
      // Fetch sales partner stats
      const [statsRes, resellersRes, ordersRes] = await Promise.all([
        axios.get(`${API_URL}/sales-partner/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: {} })),
        axios.get(`${API_URL}/sales-partner/referrals`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/sales-partner/orders`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: [] }))
      ]);
      
      setStats(statsRes.data || {
        total_referrals: referredResellers.length,
        total_orders: 0,
        total_commission: 0,
        pending_commission: 0
      });
      setReferredResellers(resellersRes.data || []);
      setRecentOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    // Use window.location for a hard redirect that bypasses React Router
    window.location.href = '/login';
  };

  const formatCurrency = (amount) => {
    return `₹${(amount || 0).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredResellers = referredResellers.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-2 rounded-lg">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sales Partner Portal</h1>
              <p className="text-sm text-slate-400">Welcome, {user?.full_name || 'Partner'}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="text-slate-300 border-slate-600 hover:text-white hover:bg-slate-700"
              onClick={() => navigate('/')}
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Website
            </Button>
            <Button
              variant="outline"
              className="text-red-400 border-red-500/50 hover:text-red-300 hover:bg-red-500/20"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Referrals</p>
                  <p className="text-3xl font-bold text-white">
                    {loading ? '...' : stats.total_referrals || referredResellers.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Orders</p>
                  <p className="text-3xl font-bold text-white">
                    {loading ? '...' : stats.total_orders || recentOrders.length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Commission</p>
                  <p className="text-3xl font-bold text-white">
                    {loading ? '...' : formatCurrency(stats.total_commission)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Pending Payout</p>
                  <p className="text-3xl font-bold text-white">
                    {loading ? '...' : formatCurrency(stats.pending_commission)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission Breakdown Card */}
        {stats.commission_breakdown && (
          <Card className="bg-slate-800/50 border-slate-700 mb-8">
            <CardHeader className="border-b border-slate-700 pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-amber-400" />
                Commission Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-sm text-blue-300">Monthly Retainer</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {formatCurrency(stats.commission_breakdown.monthly_retainer)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Fixed monthly payment</p>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <p className="text-sm text-purple-300">Onboarding Bonus</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {formatCurrency(stats.commission_breakdown.onboarding_total)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    {stats.total_referrals} reseller × {formatCurrency(stats.commission_breakdown.onboarding_per_reseller)}
                  </p>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <p className="text-sm text-emerald-300">Product Commission</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {formatCurrency(stats.commission_breakdown.product_commission_total)}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">From {stats.total_products_sold || 0} products sold</p>
                </div>
              </div>
              
              {/* Product-wise breakdown */}
              {stats.commission_breakdown.product_breakdown && Object.keys(stats.commission_breakdown.product_breakdown).length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <p className="text-sm text-slate-300 mb-3">Product-wise Breakdown:</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Object.entries(stats.commission_breakdown.product_breakdown).map(([productKey, data]) => (
                      <div key={productKey} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700">
                        <p className="text-xs text-slate-400 capitalize">{productKey.replace(/-/g, ' ')}</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(data.total)}</p>
                        <p className="text-xs text-emerald-400">
                          {data.quantity} × {formatCurrency(data.per_unit)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Referred Resellers */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-emerald-400" />
                  My Referred Resellers
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white"
                  onClick={() => toast.info('Referral link copied! Share with potential resellers.')}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Refer New
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search resellers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              {/* Reseller List */}
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {filteredResellers.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No referred resellers yet</p>
                    <p className="text-sm mt-1">Share your referral link to get started</p>
                  </div>
                ) : (
                  filteredResellers.map((reseller, idx) => (
                    <div 
                      key={reseller.id || idx}
                      className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold">
                          {reseller.full_name?.charAt(0) || reseller.email?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-white">{reseller.full_name || 'Unknown'}</p>
                          <p className="text-sm text-slate-400">{reseller.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-emerald-400">{reseller.order_count || 0} orders</p>
                        <p className="text-xs text-slate-500">Joined {formatDate(reseller.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders from Referrals */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="border-b border-slate-700">
              <CardTitle className="text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-blue-400" />
                Recent Orders from Referrals
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No orders yet</p>
                    <p className="text-sm mt-1">Orders from your referred resellers will appear here</p>
                  </div>
                ) : (
                  recentOrders.slice(0, 10).map((order, idx) => (
                    <div 
                      key={order.id || idx}
                      className="flex items-center justify-between p-3 bg-slate-900/30 rounded-lg border border-slate-700"
                    >
                      <div>
                        <p className="font-mono text-sm text-white">{order.order_id}</p>
                        <p className="text-sm text-slate-400">{order.reseller_name || 'Unknown Reseller'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-emerald-400 font-medium">
                          +{formatCurrency(order.commission || 0)}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(order.created_at)}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Commission History */}
        <Card className="bg-slate-800/50 border-slate-700 mt-8">
          <CardHeader className="border-b border-slate-700">
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-amber-400" />
              Commission History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="text-center py-8 text-slate-400">
              <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Commission tracking coming soon</p>
              <p className="text-sm mt-1">Your earnings history will be displayed here</p>
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Chat Widget */}
      <ChatWidget userRole="sales_partner" />
    </div>
  );
};

export default SalesPartnerDashboard;
