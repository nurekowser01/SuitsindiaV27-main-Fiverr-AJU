import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Store } from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const LoginSelectionPage = () => {
  const navigate = useNavigate();

  const loginOptions = [
    {
      id: 'admin',
      title: 'Admin',
      description: 'Access admin dashboard, manage content, users and settings',
      icon: Shield,
      path: '/admin/login',
      color: 'from-purple-600 to-purple-800',
      hoverColor: 'hover:from-purple-700 hover:to-purple-900',
    },
    {
      id: 'sales-partner',
      title: 'Sales Partner',
      description: 'Track referrals, manage commissions and view partner analytics',
      icon: Users,
      path: '/partner/login',
      color: 'from-emerald-600 to-teal-700',
      hoverColor: 'hover:from-emerald-700 hover:to-teal-800',
    },
    {
      id: 'reseller',
      title: 'Reseller',
      description: 'Order portal for creating and managing customer orders',
      icon: Store,
      path: '/reseller/login',
      color: 'from-[#c9a962] to-[#a88b4a]',
      hoverColor: 'hover:from-[#b89952] hover:to-[#987b3a]',
    },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      }}
    >
      {/* Logo */}
      <div className="mb-8">
        <div className="bg-white rounded-xl p-4 shadow-2xl">
          <img 
            src={LOGO_URL} 
            alt="Suits India" 
            className="h-20 md:h-24 w-auto object-contain"
          />
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl md:text-3xl font-serif text-white mb-2 text-center">
        Welcome to Suits India
      </h1>
      <p className="text-white/60 mb-10 text-center">
        Select your portal to continue
      </p>

      {/* Login Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {loginOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => navigate(option.path)}
            className={`group relative overflow-hidden rounded-2xl p-6 md:p-8 bg-gradient-to-br ${option.color} ${option.hoverColor} transition-all duration-300 transform hover:scale-105 hover:shadow-2xl`}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Content */}
            <div className="relative z-10 text-white text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <option.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl md:text-2xl font-semibold mb-2">
                {option.title}
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                {option.description}
              </p>
            </div>

            {/* Arrow indicator */}
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* Back to website link */}
      <button
        onClick={() => navigate('/')}
        className="mt-10 text-white/60 hover:text-white transition-colors text-sm flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Website
      </button>
    </div>
  );
};

export default LoginSelectionPage;
