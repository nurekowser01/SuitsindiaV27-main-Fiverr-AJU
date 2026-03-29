import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  Home, 
  User, 
  Settings, 
  Search, 
  ShoppingCart, 
  Plus,
  ChevronDown,
  Settings2,
  Ruler,
  Shirt,
  Package,
  LogOut,
  X,
  Loader2,
  MessageCircle
} from 'lucide-react';
import ChatWidget from '../../components/chat/ChatWidget';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

// Cart badge component to show item count
const CartBadge = () => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const updateCount = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('reseller_cart') || '[]');
        setCount(cart.length);
      } catch {
        setCount(0);
      }
    };
    
    updateCount();
    // Listen for storage changes
    window.addEventListener('storage', updateCount);
    // Also poll every second to catch same-tab changes
    const interval = setInterval(updateCount, 1000);
    
    return () => {
      window.removeEventListener('storage', updateCount);
      clearInterval(interval);
    };
  }, []);
  
  if (count === 0) return null;
  
  return (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
      {count > 9 ? '9+' : count}
    </span>
  );
};

const ResellerDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout, isStaff } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const dropdownRef = useRef(null);

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Handle new customer from Add Customer page
  useEffect(() => {
    if (location.state?.newCustomer) {
      setSelectedCustomer(location.state.newCustomer);
      // Clear the state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const response = await axios.get(`${API_URL}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.customer_id.includes(searchQuery) ||
    customer.phone.includes(searchQuery)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
    setShowCustomerDropdown(false);
    toast.success(`Customer selected: ${customer.name}`);
  };

  const handleLogout = () => {
    logout();
    // Use window.location for a hard redirect that bypasses React Router
    window.location.href = '/login';
  };

  const navigationItems = [
    { id: 'customize', label: 'Customize', icon: Settings2, path: '/reseller/customize', color: 'bg-[#1a2744]' },
    { id: 'measurement', label: 'Measurement', icon: Ruler, path: '/reseller/measurement/photos', color: 'bg-[#1a2744]' },
    { id: 'styling', label: 'Styling', icon: Shirt, path: '/reseller/styling-templates', color: 'bg-[#1a2744]' },
    { id: 'orders', label: 'Orders', icon: Package, path: '/reseller/orders', color: 'bg-[#1a2744]' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#1a1a1a]">
      {/* Top Navigation Bar */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        {/* Left Section - Logo & Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="bg-white rounded-lg p-1 shadow-sm border">
            <img 
              src={LOGO_URL} 
              alt="Suits India" 
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              className="bg-[#c9a962] hover:bg-[#b89952] text-white h-10 w-10 rounded-lg"
              onClick={() => navigate('/reseller/dashboard')}
            >
              <Home className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="bg-[#c9a962] hover:bg-[#b89952] text-white h-10 w-10 rounded-lg"
              onClick={() => navigate('/reseller/customers')}
            >
              <User className="h-5 w-5" />
            </Button>
            <Button
              size="icon"
              className="bg-[#c9a962] hover:bg-[#b89952] text-white h-10 w-10 rounded-lg relative"
              onClick={() => navigate('/reseller/cart')}
              data-testid="cart-btn"
            >
              <ShoppingCart className="h-5 w-5" />
              {/* Cart badge */}
              <CartBadge />
            </Button>
            {/* Show settings for resellers, My Pricing for staff */}
            {!isStaff() ? (
              <Button
                size="icon"
                className="bg-[#c9a962] hover:bg-[#b89952] text-white h-10 w-10 rounded-lg"
                onClick={() => navigate('/reseller/settings')}
                data-testid="settings-btn"
              >
                <Settings className="h-5 w-5" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="bg-[#c9a962] hover:bg-[#b89952] text-white h-10 w-10 rounded-lg"
                onClick={() => navigate('/reseller/my-pricing')}
                data-testid="my-pricing-btn"
                title="My Pricing"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
          </div>

          {/* Go to Admin Button */}
          <Button
            variant="outline"
            className="hidden md:flex border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={() => navigate('/admin/dashboard')}
          >
            Go to B2B Admin Page
          </Button>
          
          {/* Go to Website Button */}
          <Button
            variant="outline"
            className="hidden md:flex border-gray-300 text-gray-700 hover:bg-gray-100"
            onClick={() => navigate('/')}
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Website
          </Button>
        </div>

        {/* Center Section - Customer Search */}
        <div className="flex items-center gap-3 flex-1 max-w-xl" ref={dropdownRef}>
          <div className="relative flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search Customer..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="pl-10 pr-10 border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962]"
              />
              <ChevronDown 
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 cursor-pointer"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
              />
            </div>

            {/* Customer Dropdown */}
            {showCustomerDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                {loadingCustomers ? (
                  <div className="px-4 py-6 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#c9a962]" />
                    <p className="text-gray-500 mt-2">Loading customers...</p>
                  </div>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <button
                      key={customer.customer_id}
                      onClick={() => handleCustomerSelect(customer)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{customer.name}</p>
                        <p className="text-sm text-gray-500">
                          {customer.name} - {customer.customer_id}
                          {customer.phone && ` • ${customer.phone}`}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-gray-400 rotate-[-90deg]" />
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center">
                    <p className="text-gray-500 mb-3">
                      {searchQuery ? 'No customers found' : 'No customers yet'}
                    </p>
                    <Button
                      size="sm"
                      className="bg-[#c9a962] hover:bg-[#b89952] text-white"
                      onClick={() => {
                        setShowCustomerDropdown(false);
                        navigate('/reseller/customers/add');
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add First Customer
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Customer Button */}
          {selectedCustomer ? (
            <Button
              className="bg-[#c9a962] hover:bg-[#b89952] text-white whitespace-nowrap"
              onClick={() => setSelectedCustomer(null)}
            >
              {selectedCustomer.name}
              <X className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              className="bg-gray-300 text-gray-500 whitespace-nowrap cursor-not-allowed"
              disabled
            >
              Select Customer
            </Button>
          )}

          {/* Add Customer Button */}
          <Button
            className="bg-[#c9a962] hover:bg-[#b89952] text-white whitespace-nowrap"
            onClick={() => navigate('/reseller/customers/add')}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Customer
          </Button>
        </div>

        {/* Right Section - Cart & Profile */}
        <div className="flex items-center gap-3">
          {/* Cart */}
          <Button
            variant="ghost"
            size="icon"
            className="relative h-10 w-10"
            onClick={() => navigate('/reseller/cart')}
          >
            <ShoppingCart className="h-5 w-5 text-gray-600" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Button>

          {/* User Profile */}
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-[#c9a962] flex items-center justify-center text-white font-semibold">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <Button
              variant="outline"
              className="text-red-500 border-red-500/50 hover:text-red-400 hover:bg-red-500/10"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Background Image */}
      <main 
        className="flex-1 relative"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a2744] via-[#1a2744]/50 to-transparent" />

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-end p-6">
          {/* Welcome Message */}
          {selectedCustomer ? (
            <div className="mb-6 text-white">
              <h2 className="text-2xl font-light">
                Creating order for <span className="font-semibold text-[#c9a962]">{selectedCustomer.name}</span>
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Customer ID: {selectedCustomer.customer_id}
                {selectedCustomer.phone && ` • Phone: ${selectedCustomer.phone}`}
              </p>
            </div>
          ) : (
            <div className="mb-6 text-white">
              <h2 className="text-2xl font-light">
                Welcome to <span className="font-semibold text-[#c9a962]">Order Portal</span>
              </h2>
              <p className="text-white/60 text-sm mt-1">
                Please select or add a customer to start creating an order
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation - Large Touch-Friendly Buttons */}
      <nav className="bg-[#0f1829] p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {navigationItems.map((item) => {
            // Styling and Orders buttons work independently without customer selection
            const requiresCustomer = !['styling', 'orders'].includes(item.id);
            const isDisabled = requiresCustomer && !selectedCustomer;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (requiresCustomer && !selectedCustomer) {
                    toast.warning('Please select a customer first');
                    return;
                  }
                  navigate(item.path, { state: { customer: selectedCustomer } });
                }}
                disabled={isDisabled}
                className={`${item.color} ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#243354]'} rounded-xl p-6 md:p-8 flex flex-col items-center justify-center gap-3 transition-all duration-200 ${!isDisabled ? 'transform hover:scale-105 active:scale-95' : ''}`}
                data-testid={`nav-${item.id}`}
              >
                <item.icon className="h-10 w-10 md:h-12 md:w-12 text-white" />
                <span className="text-white font-medium text-base md:text-lg">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Chat Widget */}
      <ChatWidget userRole="reseller" />
    </div>
  );
};

export default ResellerDashboard;
