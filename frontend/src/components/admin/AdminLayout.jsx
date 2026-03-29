import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import {
  LayoutDashboard,
  Image,
  FileText,
  Users,
  Settings,
  LogOut,
  Menu,
  Edit3,
  Package,
  Palette,
  Ruler,
  ShoppingCart,
  CreditCard,
  Target,
  Briefcase,
  UserSquare,
  MessageCircle,
  DollarSign,
  Mail,
  Database,
  RefreshCw,
  Globe,
  Key,
} from 'lucide-react';
import ChatWidget from '../chat/ChatWidget';
import { useState, useEffect } from 'react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const AdminLayout = ({ children }) => {
  const { user, logout, loading, hasPermission, isAdmin, loggingOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Don't redirect if user is logging out - let handleLogout handle navigation
    if (!loading && !loggingOut && !isAdmin()) {
      navigate('/admin/login');
    }
  }, [user, loading, navigate, isAdmin, loggingOut]);

  const handleLogout = () => {
    logout();
    // Use window.location for a hard redirect that bypasses React Router
    window.location.href = '/login';
  };

  // Navigation items with permission IDs
  const allNavItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard', pageId: 'dashboard' },
    { icon: ShoppingCart, label: 'Orders', path: '/admin/orders', pageId: 'orders' },
    { icon: MessageCircle, label: 'Chats', path: '/admin/chats', pageId: 'chats' },
    { icon: UserSquare, label: 'Customers', path: '/admin/customers', pageId: 'customers' },
    { icon: Image, label: 'UI Manager', path: '/admin/ui', pageId: 'ui-manager' },
    { icon: Edit3, label: 'Content Editor', path: '/admin/content', pageId: 'content-editor' },
    { icon: Package, label: 'Products', path: '/admin/products', pageId: 'products' },
    { icon: DollarSign, label: 'Pricing', path: '/admin/pricing', pageId: 'pricing' },
    { icon: Palette, label: 'Style Options', path: '/admin/styling', pageId: 'styling' },
    { icon: Ruler, label: 'Measurements', path: '/admin/measurements', pageId: 'measurements' },
    { icon: FileText, label: 'Static Pages', path: '/admin/pages', pageId: 'pages' },
    { icon: Users, label: 'Users', path: '/admin/users', pageId: 'users' },
    { icon: Briefcase, label: 'Sales Partners', path: '/admin/sales-partners', pageId: 'sales-partners' },
    { icon: CreditCard, label: 'Stripe', path: '/admin/stripe', pageId: 'stripe' },
    { icon: Mail, label: 'Email', path: '/admin/email', pageId: 'email' },
    { icon: Target, label: 'Marketing', path: '/admin/marketing', pageId: 'marketing' },
    { icon: Globe, label: 'SEO Management', path: '/admin/seo', pageId: 'seo' },
    { icon: Key, label: 'API Keys & Sync', path: '/admin/api-keys', pageId: 'api-keys' },
    { icon: Ruler, label: 'Size Repository', path: '/admin/size-repository', pageId: 'size-repository' },
    { icon: Settings, label: 'Settings', path: '/admin/settings', pageId: 'settings' },
    { icon: Database, label: 'Backup', path: '/admin/backup', pageId: 'backup', superAdminOnly: true },
    { icon: RefreshCw, label: 'Database Sync', path: '/admin/database-sync', pageId: 'database-sync', superAdminOnly: true },
  ];

  // Filter nav items based on permissions
  const navItems = allNavItems.filter(item => {
    // Super admin only items - check if user is the primary admin
    if (item.superAdminOnly) {
      const superAdminEmails = ['admin@suitsindia.com', 'admin@tailorstailor.com'];
      return user?.is_admin && superAdminEmails.includes(user?.email);
    }
    // Admin users see everything else
    if (user?.is_admin) return true;
    // Check permission for the page
    return hasPermission(item.pageId, 'view');
  });

  const isActive = (path) => location.pathname === path;

  const NavLinks = () => (
    <>
      {navItems.map((item) => (
        <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}>
          <Button
            variant={isActive(item.path) ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            data-testid={`nav-${item.pageId}`}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </Button>
        </Link>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin()) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      {/* Top Navigation */}
      <div className="border-b bg-white shadow-sm">
        <div className="flex h-16 items-center px-4 lg:px-6">
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-white">
                <div className="flex flex-col space-y-2 mt-8">
                  <NavLinks />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="cursor-pointer hover:opacity-80 transition-opacity flex items-center space-x-3"
            >
              <img 
                src={LOGO_URL} 
                alt="Suits India" 
                className="h-9 w-auto object-contain"
              />
              <span className="text-[#666] text-sm font-medium">Admin Panel</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-2">
              <span className="text-sm text-[#666]">Welcome,</span>
              <span className="text-sm font-medium text-[#1a1a1a]">
                {user?.full_name || user?.email}
              </span>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout} 
              data-testid="logout-btn"
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 border-r bg-white min-h-[calc(100vh-64px)] max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="flex flex-col space-y-2 p-4 pb-8">
            <NavLinks />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
      
      {/* Chat Widget for Admin */}
      <ChatWidget userRole="admin" />
    </div>
  );
};

export default AdminLayout;
