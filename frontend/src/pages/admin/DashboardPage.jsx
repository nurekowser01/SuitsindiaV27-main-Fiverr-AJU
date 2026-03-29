import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { 
  Users, 
  FileText, 
  Image, 
  Settings, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  Clock,
  UserCheck,
  Package
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const DashboardPage = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_pages: 4,
    hero_images: 0,
    total_orders: 0,
    total_revenue: 0,
    total_customers: 0,
    orders_by_status: {},
    orders_last_30_days: 0,
    recent_orders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_URL}/admin/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchStats();
    }
  }, [token]);

  const statCards = [
    {
      title: 'Total Orders',
      value: stats.total_orders || 0,
      icon: ShoppingCart,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Revenue',
      value: `₹${(stats.total_revenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Total Customers',
      value: stats.total_customers || 0,
      icon: UserCheck,
      color: 'bg-purple-500',
    },
    {
      title: 'Orders (30 days)',
      value: stats.orders_last_30_days || 0,
      icon: TrendingUp,
      color: 'bg-amber-500',
    },
    {
      title: 'Total Users',
      value: stats.total_users || 0,
      icon: Users,
      color: 'bg-indigo-500',
    },
    {
      title: 'Hero Images',
      value: stats.hero_images || 0,
      icon: Image,
      color: 'bg-pink-500',
    },
  ];

  // Format date for recent orders
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      'wip': 'bg-yellow-100 text-yellow-800',
      'processing': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'pending': 'bg-gray-100 text-gray-800'
    };
    return colors[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#1a1a1a]">Dashboard</h1>
          <p className="text-[#666] mt-1">Welcome to your admin dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {statCards.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#666] mb-1">{stat.title}</p>
                    <p className="text-xl font-bold text-[#1a1a1a]">
                      {loading ? '...' : stat.value}
                    </p>
                  </div>
                  <div
                    className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center`}
                  >
                    <stat.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Orders by Status */}
        {stats.orders_by_status && Object.keys(stats.orders_by_status).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Orders by Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {Object.entries(stats.orders_by_status).map(([status, count]) => (
                  <div key={status} className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                      {status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                    <span className="font-bold text-lg">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        {stats.recent_orders && stats.recent_orders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Order ID</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Customer</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Items</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent_orders.map((order, idx) => (
                      <tr key={order.id || idx} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{order.order_id}</td>
                        <td className="py-3 px-4">{order.customer_name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {order.items?.length || 0} item(s)
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">{formatDate(order.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-right">
                <a href="/admin/orders" className="text-[#c9a962] hover:underline text-sm font-medium">
                  View All Orders →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <a
                href="/admin/orders"
                className="p-4 border rounded-lg hover:border-[#c9a962] transition-colors text-center"
              >
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-[#c9a962]" />
                <p className="font-medium">Manage Orders</p>
              </a>
              <a
                href="/admin/ui"
                className="p-4 border rounded-lg hover:border-[#c9a962] transition-colors text-center"
              >
                <Image className="w-8 h-8 mx-auto mb-2 text-[#c9a962]" />
                <p className="font-medium">Manage Hero Images</p>
              </a>
              <a
                href="/admin/content"
                className="p-4 border rounded-lg hover:border-[#c9a962] transition-colors text-center"
              >
                <FileText className="w-8 h-8 mx-auto mb-2 text-[#c9a962]" />
                <p className="font-medium">Edit Content</p>
              </a>
              <a
                href="/admin/users"
                className="p-4 border rounded-lg hover:border-[#c9a962] transition-colors text-center"
              >
                <Users className="w-8 h-8 mx-auto mb-2 text-[#c9a962]" />
                <p className="font-medium">Manage Users</p>
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
