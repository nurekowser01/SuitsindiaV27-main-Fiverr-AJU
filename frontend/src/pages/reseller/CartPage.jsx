import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  ShoppingCart,
  Trash2,
  CreditCard,
  Package,
  User,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const CartPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isStaff, getParentResellerEmail } = useAuth();
  const resellerId = (isStaff() ? getParentResellerEmail() : user?.email) || 'default';
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [resellerStripeEnabled, setResellerStripeEnabled] = useState(false);
  const customer = location.state?.customer;

  useEffect(() => {
    loadCart();
    checkResellerStripe();
  }, []);

  const loadCart = () => {
    try {
      const cart = JSON.parse(localStorage.getItem('reseller_cart') || '[]');
      setCartItems(cart);
    } catch (error) {
      console.error('Error loading cart:', error);
      setCartItems([]);
    } finally {
      setLoading(false);
    }
  };

  const checkResellerStripe = async () => {
    try {
      const response = await api.get(`/reseller-settings/${resellerId}`);
      setResellerStripeEnabled(response.data.stripe_enabled && response.data.stripe_publishable_key);
    } catch (error) {
      console.error('Error checking stripe settings:', error);
    }
  };

  const removeFromCart = (itemId) => {
    const updatedCart = cartItems.filter(item => item.id !== itemId);
    localStorage.setItem('reseller_cart', JSON.stringify(updatedCart));
    setCartItems(updatedCart);
    toast.success('Item removed from cart');
  };

  const clearCart = () => {
    localStorage.removeItem('reseller_cart');
    setCartItems([]);
    toast.success('Cart cleared');
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      return sum + (item.pricing?.total_customer_price || item.pricing?.total || 0);
    }, 0);
  };

  const handleCustomerPayment = async () => {
    if (!resellerStripeEnabled) {
      toast.error('Please configure your Stripe keys in Settings → Payments');
      return;
    }

    setProcessingPayment(true);
    try {
      // First create orders from cart items
      const orderPromises = cartItems.map(async (item) => {
        const orderData = {
          customer_id: item.customer?.customer_id,
          customer_name: item.customer?.name,
          total_customer_price: item.pricing?.total_customer_price || item.pricing?.total,
          total_admin_cost: item.pricing?.total_reseller_cost || 0,
          items: [{
            product_id: item.product?.id,
            product_name: item.product?.name,
            category_id: item.category?.id,
            category_name: item.category?.name,
            configuration: item.configuration,
            styling: item.styling,
            pricing: item.pricing,
            linked_measurements: item.prefillMeasurements
          }]
        };
        return api.post('/orders', orderData);
      });

      const orders = await Promise.all(orderPromises);
      const orderIds = orders.map(o => o.data.order_id);
      const totalAmount = calculateTotal();

      // Create Stripe checkout for CUSTOMER payment (using RESELLER's Stripe keys)
      const response = await api.post('/payment/customer/create-checkout-session', {
        order_ids: orderIds,
        amount: totalAmount,
        reseller_id: 'default',  // In production, get from auth context
        success_url: window.location.origin + '/reseller/cart?payment=success',
        cancel_url: window.location.origin + '/reseller/cart?payment=cancelled'
      });

      if (response.data.url) {
        // Clear cart before redirecting
        localStorage.removeItem('reseller_cart');
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to process payment';
      toast.error(errorMsg);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleSaveToWIP = async () => {
    setProcessingPayment(true);
    try {
      // Save all cart items as WIP orders
      for (const item of cartItems) {
        const orderData = {
          customer_id: item.customer?.customer_id,
          customer_name: item.customer?.name,
          total_customer_price: item.pricing?.total_customer_price || item.pricing?.total,
          total_admin_cost: item.pricing?.total_reseller_cost || 0,
          items: [{
            product_id: item.product?.id,
            product_name: item.product?.name,
            category_id: item.category?.id,
            category_name: item.category?.name,
            configuration: item.configuration,
            styling: item.styling,
            pricing: item.pricing,
            linked_measurements: item.prefillMeasurements
          }]
        };
        await api.post('/orders', orderData);
      }

      // Clear cart
      localStorage.removeItem('reseller_cart');
      setCartItems([]);
      
      toast.success('All items saved to WIP orders!');
      navigate('/reseller/orders');
    } catch (error) {
      console.error('Error saving to WIP:', error);
      toast.error('Failed to save orders');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Handle payment redirect result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const sessionId = params.get('session_id');
    
    if (paymentStatus === 'success' && sessionId) {
      // Verify the customer payment using reseller's Stripe
      verifyCustomerPayment(sessionId);
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled');
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [navigate]);

  const verifyCustomerPayment = async (sessionId) => {
    try {
      const response = await api.post('/payment/customer/verify-payment', {
        session_id: sessionId,
        reseller_id: 'default'
      });
      
      if (response.data.status === 'paid') {
        toast.success('Payment successful! Orders created.');
        // Clear URL params
        window.history.replaceState({}, '', window.location.pathname);
        navigate('/reseller/orders', { replace: true });
      } else {
        toast.warning(`Payment status: ${response.data.status}`);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Could not verify payment status');
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1829]">
      {/* Header */}
      <header className="bg-[#1a2744] border-b border-[#2a3754] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-[#2a3754]"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#c9a962]" />
                Cart
              </h1>
              <p className="text-sm text-gray-400">
                {cartItems.length} item{cartItems.length !== 1 ? 's' : ''} • Total: ₹{calculateTotal().toLocaleString()}
              </p>
            </div>
          </div>
          
          {cartItems.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={clearCart}
              className="text-red-400 border-red-400/50 hover:bg-red-400/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Cart
            </Button>
          )}
        </div>
      </header>

      {/* Cart Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {cartItems.length === 0 ? (
          <Card className="bg-[#1a2744] border-[#2a3754]">
            <CardContent className="py-12 text-center">
              <ShoppingCart className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Your cart is empty</h3>
              <p className="text-gray-400 mb-4">Add items from the styling page</p>
              <Button onClick={() => navigate('/reseller/dashboard')} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                Start Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.id} className="bg-[#1a2744] border-[#2a3754]">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-[#c9a962]" />
                          <span className="font-medium text-white">{item.product?.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {item.category?.name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                          <User className="h-3 w-3" />
                          {item.customer?.name}
                        </div>
                        
                        <div className="text-sm text-gray-400">
                          {item.configuration?.length || 1} set(s) • 
                          {item.styling?.construction?.name || 'Standard'} construction
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-[#c9a962]">
                          ₹{(item.pricing?.total_customer_price || item.pricing?.total || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Customer Price</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Order Summary & Payment */}
            <div className="space-y-4">
              <Card className="bg-[#1a2744] border-[#2a3754]">
                <CardHeader>
                  <CardTitle className="text-white">Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between text-gray-300">
                    <span>Items ({cartItems.length})</span>
                    <span>₹{calculateTotal().toLocaleString()}</span>
                  </div>
                  <div className="border-t border-[#2a3754] pt-4">
                    <div className="flex justify-between text-lg font-bold text-white">
                      <span>Total (Customer Pays)</span>
                      <span className="text-[#c9a962]">₹{calculateTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Options */}
              <Card className="bg-[#1a2744] border-[#2a3754]">
                <CardHeader>
                  <CardTitle className="text-white text-sm">Customer Payment</CardTitle>
                  <CardDescription className="text-gray-400">
                    Accept payment from customer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {resellerStripeEnabled ? (
                    <Button
                      onClick={handleCustomerPayment}
                      disabled={processingPayment}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {processingPayment ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="h-4 w-4 mr-2" />
                      )}
                      Pay with Card (₹{calculateTotal().toLocaleString()})
                    </Button>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-amber-400 font-medium">Stripe not configured</p>
                          <p className="text-amber-300/70">
                            Go to Settings → Payments to add your Stripe keys
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-[#2a3754]" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-[#1a2744] px-2 text-gray-500">or</span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleSaveToWIP}
                    disabled={processingPayment}
                    className="w-full border-[#c9a962] text-[#c9a962] hover:bg-[#c9a962]/10"
                  >
                    {processingPayment ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Save to WIP (Pay Later)
                  </Button>
                  
                  <p className="text-xs text-gray-500 text-center">
                    Customer paid outside POS? Save to WIP and mark as paid later
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default CartPage;
