import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Home,
  ShoppingCart,
  Check,
  ChevronRight,
  Ruler,
  Save
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

// Default measurement fields based on product type
const getMeasurementFields = (productId) => {
  const commonFields = [
    { id: 'height', name: 'Height', unit: 'inches', required: true },
    { id: 'weight', name: 'Weight', unit: 'kg', required: true },
  ];

  const productMeasurements = {
    'suits': [
      ...commonFields,
      { id: 'chest', name: 'Chest', unit: 'inches', required: true },
      { id: 'waist', name: 'Waist', unit: 'inches', required: true },
      { id: 'shoulder', name: 'Shoulder', unit: 'inches', required: true },
      { id: 'sleeve', name: 'Sleeve Length', unit: 'inches', required: true },
      { id: 'jacket_length', name: 'Jacket Length', unit: 'inches', required: true },
      { id: 'trouser_waist', name: 'Trouser Waist', unit: 'inches', required: true },
      { id: 'trouser_length', name: 'Trouser Length', unit: 'inches', required: true },
      { id: 'inseam', name: 'Inseam', unit: 'inches', required: true },
    ],
    'jackets': [
      ...commonFields,
      { id: 'chest', name: 'Chest', unit: 'inches', required: true },
      { id: 'waist', name: 'Waist', unit: 'inches', required: true },
      { id: 'shoulder', name: 'Shoulder', unit: 'inches', required: true },
      { id: 'sleeve', name: 'Sleeve Length', unit: 'inches', required: true },
      { id: 'jacket_length', name: 'Jacket Length', unit: 'inches', required: true },
    ],
    'pants': [
      ...commonFields,
      { id: 'trouser_waist', name: 'Trouser Waist', unit: 'inches', required: true },
      { id: 'hip', name: 'Hip', unit: 'inches', required: true },
      { id: 'trouser_length', name: 'Trouser Length', unit: 'inches', required: true },
      { id: 'inseam', name: 'Inseam', unit: 'inches', required: true },
      { id: 'thigh', name: 'Thigh', unit: 'inches', required: false },
    ],
    'casual-shirts': [
      ...commonFields,
      { id: 'chest', name: 'Chest', unit: 'inches', required: true },
      { id: 'shoulder', name: 'Shoulder', unit: 'inches', required: true },
      { id: 'sleeve', name: 'Sleeve Length', unit: 'inches', required: true },
      { id: 'shirt_length', name: 'Shirt Length', unit: 'inches', required: true },
      { id: 'neck', name: 'Neck', unit: 'inches', required: true },
    ],
    'formal-shirts': [
      ...commonFields,
      { id: 'chest', name: 'Chest', unit: 'inches', required: true },
      { id: 'shoulder', name: 'Shoulder', unit: 'inches', required: true },
      { id: 'sleeve', name: 'Sleeve Length', unit: 'inches', required: true },
      { id: 'shirt_length', name: 'Shirt Length', unit: 'inches', required: true },
      { id: 'neck', name: 'Neck', unit: 'inches', required: true },
      { id: 'cuff', name: 'Cuff', unit: 'inches', required: false },
    ],
  };

  return productMeasurements[productId] || [
    ...commonFields,
    { id: 'chest', name: 'Chest', unit: 'inches', required: true },
    { id: 'waist', name: 'Waist', unit: 'inches', required: true },
    { id: 'shoulder', name: 'Shoulder', unit: 'inches', required: true },
  ];
};

const MeasurementPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer, category, product, configuration } = location.state || {};
  
  const [measurements, setMeasurements] = useState({});
  const [notes, setNotes] = useState('');

  // Redirect if no data
  if (!customer || !product) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <div className="text-center text-white">
          <p className="mb-4">No product selected</p>
          <Button onClick={() => navigate('/reseller/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const measurementFields = getMeasurementFields(product.id);

  const handleMeasurementChange = (fieldId, value) => {
    setMeasurements(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const isFieldComplete = (fieldId) => {
    return measurements[fieldId] && measurements[fieldId].trim() !== '';
  };

  const allRequiredFieldsComplete = () => {
    return measurementFields
      .filter(f => f.required)
      .every(f => isFieldComplete(f.id));
  };

  const handleProceed = () => {
    if (!allRequiredFieldsComplete()) {
      toast.error('Please fill all required measurements');
      return;
    }

    // Navigate to styling page
    navigate('/reseller/styling', {
      state: {
        customer,
        category,
        product,
        configuration,
        measurements,
        notes
      }
    });
  };

  const handleSaveDraft = () => {
    toast.success('Measurements saved as draft');
    // In future, save to backend
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1829]">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/reseller/customize/configure', { 
              state: { customer, category, product } 
            })}
            className="h-10 w-10"
            data-testid="back-button"
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
              Measurements - {product.name}
            </h1>
            <p className="text-sm text-gray-500">
              Customer: {customer?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            className="hidden md:flex"
            data-testid="save-draft-button"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
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
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {/* Product Info Card */}
          <div className="bg-[#1a2744] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-[#c9a962]/20 flex items-center justify-center">
                <Ruler className="h-6 w-6 text-[#c9a962]" />
              </div>
              <div>
                <h2 className="text-white text-xl font-semibold">{product.name} Measurements</h2>
                <p className="text-white/60 text-sm">Enter customer measurements below</p>
              </div>
            </div>
          </div>

          {/* Measurement Fields Grid */}
          <div className="bg-[#1a2744] rounded-xl p-6 mb-6" data-testid="measurement-form">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {measurementFields.map((field) => (
                <div 
                  key={field.id}
                  className={`space-y-2 p-3 rounded-lg transition-all ${
                    isFieldComplete(field.id) 
                      ? 'bg-green-500/10 ring-1 ring-green-500/30' 
                      : 'bg-[#0f1829]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Label className="text-white/80 text-sm">
                      {field.name}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    {isFieldComplete(field.id) && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.5"
                      placeholder={`Enter ${field.name.toLowerCase()}`}
                      value={measurements[field.id] || ''}
                      onChange={(e) => handleMeasurementChange(field.id, e.target.value)}
                      className="bg-[#0f1829] border-white/20 text-white placeholder:text-white/40 pr-16"
                      data-testid={`measurement-${field.id}`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">
                      {field.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div className="bg-[#1a2744] rounded-xl p-6">
            <Label className="text-white/80 text-sm mb-2 block">
              Additional Notes (Optional)
            </Label>
            <textarea
              placeholder="Any special instructions or notes about measurements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-24 bg-[#0f1829] border border-white/20 rounded-lg text-white placeholder:text-white/40 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#c9a962]"
              data-testid="measurement-notes"
            />
          </div>
        </div>
      </main>

      {/* Bottom Action Bar */}
      <footer className="bg-[#0a0f1a] p-4 border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/60">Configure</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
            <span className="text-[#c9a962]">Measurement</span>
            <ChevronRight className="h-4 w-4 text-white/40" />
            <span className="text-white/40">Styling</span>
          </div>

          {/* Progress Indicator */}
          <div className="hidden md:flex items-center gap-2 text-sm text-white/60">
            <span>{measurementFields.filter(f => isFieldComplete(f.id)).length}</span>
            <span>/</span>
            <span>{measurementFields.length}</span>
            <span>completed</span>
          </div>

          {/* Proceed Button */}
          <Button
            onClick={handleProceed}
            disabled={!allRequiredFieldsComplete()}
            className={`h-12 px-8 text-lg ${
              allRequiredFieldsComplete()
                ? 'bg-[#c9a962] hover:bg-[#b89952] text-black'
                : 'bg-gray-600 cursor-not-allowed'
            }`}
            data-testid="proceed-button"
          >
            Next: Styling
            <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default MeasurementPage;
