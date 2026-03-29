import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Determine which portal the user came from
  const fromPath = location.state?.from || '/login';
  const portalType = fromPath.includes('/admin') ? 'admin' : 
                     fromPath.includes('/partner') ? 'partner' : 'reseller';

  const getPortalStyles = () => {
    switch (portalType) {
      case 'admin':
        return {
          bg: 'bg-[#1a1a1a]',
          accent: 'bg-[#c9a962]',
          accentHover: 'hover:bg-[#b89952]',
          iconBg: 'bg-[#c9a962]/10',
          iconColor: 'text-[#c9a962]'
        };
      case 'partner':
        return {
          bg: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
          accent: 'bg-emerald-500',
          accentHover: 'hover:bg-emerald-600',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-500'
        };
      default:
        return {
          bg: 'bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]',
          accent: 'bg-[#c9a962]',
          accentHover: 'hover:bg-[#b89952]',
          iconBg: 'bg-[#c9a962]/10',
          iconColor: 'text-[#c9a962]'
        };
    }
  };

  const styles = getPortalStyles();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      setEmailSent(true);
      toast.success('Password reset link sent! Check your email.');
    } catch (error) {
      console.error('Forgot password error:', error);
      toast.error('Failed to send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${styles.bg} flex items-center justify-center p-4`}>
      <div className="max-w-md w-full">
        <Button
          variant="ghost"
          onClick={() => navigate(fromPath)}
          className="mb-6 text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Button>

        <Card className="border-2 bg-white">
          <CardHeader className="text-center">
            <div className={`mx-auto w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mb-4`}>
              {emailSent ? (
                <CheckCircle className={`h-6 w-6 ${styles.iconColor}`} />
              ) : (
                <Mail className={`h-6 w-6 ${styles.iconColor}`} />
              )}
            </div>
            <CardTitle className="text-2xl">
              {emailSent ? 'Check Your Email' : 'Forgot Password?'}
            </CardTitle>
            <CardDescription>
              {emailSent 
                ? "We've sent you a password reset link"
                : "Enter your email to receive a password reset link"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className={`w-full ${styles.accent} ${styles.accentHover} text-black`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-green-800">
                    We've sent a password reset link to <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-green-600 mt-2">
                    The link will expire in 1 hour
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  Resend Link
                </Button>

                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate(fromPath)}
                >
                  Return to Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
