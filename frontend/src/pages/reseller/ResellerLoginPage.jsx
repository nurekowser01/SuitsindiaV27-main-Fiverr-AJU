import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { Store, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const ResellerLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, resellerLogin, isReseller, authType, loading: authLoading, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Redirect only if already logged in as RESELLER or STAFF (not sales_partner)
  useEffect(() => {
    if (!authLoading && (authType === 'reseller' || authType === 'staff') && user) {
      // If user is a sales_partner, don't auto-redirect - let them login as reseller
      if (user.role === 'sales_partner') {
        // Clear the sales partner session so they can login as reseller
        logout();
        return;
      }
      // Auto-redirect if they're a reseller or staff
      if ((user.role === 'reseller' || user.role === 'staff' || user.role_id === 'staff') && (isReseller() || authType === 'staff')) {
        const from = location.state?.from?.pathname || '/reseller/dashboard';
        navigate(from, { replace: true });
      }
    }
  }, [authLoading, isReseller, authType, user, navigate, location, logout]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await resellerLogin(email, password, rememberMe);
      if (result.success) {
        toast.success('Welcome to the Order Portal!');
        const from = location.state?.from?.pathname || '/reseller/dashboard';
        navigate(from, { replace: true });
      } else {
        toast.error(result.error || 'Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={() => navigate('/login')}
          className="mb-6 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login Selection
        </button>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#c9a962] to-[#a88b4a] p-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center">
              <Store className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-white">Reseller Portal</h2>
            <p className="text-white/80 text-sm mt-1">Order Management System</p>
          </div>

          {/* Logo */}
          <div className="flex justify-center -mt-8 relative z-10">
            <div className="bg-white rounded-xl p-3 shadow-lg">
              <img 
                src={LOGO_URL} 
                alt="Suits India" 
                className="h-16 w-auto object-contain"
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email ID</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="border-gray-300 focus:border-[#c9a962] focus:ring-[#c9a962] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={setRememberMe}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
                  Remember me for 30 days
                </Label>
              </div>
              <button 
                type="button" 
                onClick={() => navigate('/forgot-password', { state: { from: '/reseller/login' } })}
                className="text-sm text-[#c9a962] hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#c9a962] to-[#a88b4a] hover:from-[#b89952] hover:to-[#987b3a] text-white font-medium py-6"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <div className="px-6 pb-6 text-center">
            <p className="text-gray-500 text-xs">
              Powered by <span className="text-[#c9a962] font-medium">Suits India</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResellerLoginPage;
