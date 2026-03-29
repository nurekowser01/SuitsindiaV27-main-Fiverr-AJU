import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import { 
  ArrowLeft, 
  Home,
  ShoppingCart,
  ChevronRight,
  Loader2,
  Shirt,
  Briefcase
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

// Icon mapping for categories
const categoryIcons = {
  'suit': '🎩',
  'shirt': '👔',
  'denim': '👖',
  'shoe': '👞',
  'default': '📦'
};

const CustomizePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const customer = location.state?.customer;
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    if (!customer) {
      toast.error('Please select a customer first');
      navigate('/reseller/dashboard');
      return;
    }
    fetchCategories();
  }, [customer, navigate]);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('reseller_token');
      const response = await axios.get(`${API_URL}/products/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data.filter(cat => cat.is_active));
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load product categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleProductSelect = (product) => {
    navigate('/reseller/customize/configure', {
      state: {
        customer,
        category: selectedCategory,
        product
      }
    });
  };

  const handleBack = () => {
    if (selectedCategory) {
      setSelectedCategory(null);
    } else {
      navigate('/reseller/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1829]">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
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
          <div>
            <h1 className="text-lg font-semibold text-gray-800">
              {selectedCategory ? selectedCategory.name : 'Select Product'}
            </h1>
            <p className="text-sm text-gray-500">
              Customer: {customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/dashboard')}
            className="h-10 w-10"
          >
            <Home className="h-5 w-5 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
          >
            <ShoppingCart className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        {!selectedCategory ? (
          /* Category Selection */
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl text-white mb-6 text-center">
              Select a Product Category
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="bg-[#1a2744] hover:bg-[#243354] rounded-xl p-6 flex items-center justify-between transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#c9a962]/20 flex items-center justify-center text-2xl">
                      {categoryIcons[category.icon] || categoryIcons.default}
                    </div>
                    <div className="text-left">
                      <h3 className="text-white font-semibold text-lg">
                        {category.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {category.products?.length || 0} products
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-[#c9a962]" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Product Selection within Category */
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-[#c9a962]/20 flex items-center justify-center text-xl">
                {categoryIcons[selectedCategory.icon] || categoryIcons.default}
              </div>
              <div>
                <h2 className="text-xl text-white">
                  {selectedCategory.name}
                </h2>
                <p className="text-white/60 text-sm">
                  Select a product to customize
                </p>
              </div>
            </div>

            {selectedCategory.products && selectedCategory.products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedCategory.products.filter(p => p.is_active).map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="bg-[#1a2744] hover:bg-[#243354] rounded-xl p-6 flex flex-col items-center justify-center gap-4 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] min-h-[160px]"
                  >
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name}
                        className="w-16 h-16 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#c9a962]/20 flex items-center justify-center">
                        <Shirt className="h-8 w-8 text-[#c9a962]" />
                      </div>
                    )}
                    <div className="text-center">
                      <h3 className="text-white font-semibold">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-white/60 text-sm mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 mx-auto text-white/30 mb-4" />
                <p className="text-white/60">
                  No products available in this category
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation Breadcrumb */}
      <footer className="bg-[#0a0f1a] px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#c9a962]">Customize</span>
            {selectedCategory && (
              <>
                <ChevronRight className="h-4 w-4 text-white/40" />
                <span className="text-white">{selectedCategory.name}</span>
              </>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default CustomizePage;
