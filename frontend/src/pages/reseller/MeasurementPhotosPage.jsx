import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Home,
  ShoppingCart,
  Camera,
  Upload,
  Plus,
  X,
  ChevronRight
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const MeasurementPhotosPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { customer } = location.state || {};
  
  const [photos, setPhotos] = useState({
    side: null,
    back: null,
    front: null
  });

  const fileInputRefs = {
    side: useRef(null),
    back: useRef(null),
    front: useRef(null)
  };

  // Redirect if no customer
  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-gray-600">No customer selected</p>
          <Button onClick={() => navigate('/reseller/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const handleFileChange = (position, event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos(prev => ({
          ...prev,
          [position]: {
            file,
            preview: e.target.result
          }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (position) => {
    setPhotos(prev => ({
      ...prev,
      [position]: null
    }));
  };

  const handleProceed = () => {
    navigate('/reseller/measurement/details', {
      state: {
        customer,
        photos
      }
    });
  };

  const handleShareTomorrow = () => {
    toast.info('Photos will be collected later');
    navigate('/reseller/measurement/details', {
      state: {
        customer,
        photos: null,
        skipPhotos: true
      }
    });
  };

  const PhotoUploadBox = ({ position, label }) => (
    <div className="flex flex-col items-center">
      <p className="text-sm text-gray-500 mb-2">{label}</p>
      <div 
        className="w-40 h-64 bg-blue-50 rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center cursor-pointer hover:bg-blue-100 transition-all relative overflow-hidden"
        onClick={() => fileInputRefs[position].current?.click()}
      >
        {photos[position]?.preview ? (
          <>
            <img 
              src={photos[position].preview} 
              alt={label}
              className="w-full h-full object-cover"
            />
            <button
              onClick={(e) => { e.stopPropagation(); removePhoto(position); }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <Plus className="h-10 w-10 text-blue-400" />
        )}
      </div>
      <input
        ref={fileInputRefs[position]}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(position, e)}
        data-testid={`upload-${position}`}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-[#1a2744] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img 
            src={LOGO_URL} 
            alt="Logo" 
            className="h-10 w-auto"
          />
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-orange-400 hover:bg-white/10">
              <Camera className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-orange-400 hover:bg-white/10">
              <Upload className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-orange-400 hover:bg-white/10">
              <Home className="h-5 w-5" />
            </Button>
          </div>
          <Button 
            className="bg-[#1a2744] border border-white/30 text-white text-xs hover:bg-white/10"
            onClick={() => navigate('/admin/login')}
          >
            Go to B2B<br/>Admin Page
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search Customer"
              className="w-48 px-3 py-2 rounded bg-white/10 border border-white/20 text-white placeholder:text-white/50 text-sm"
              readOnly
            />
          </div>
          <div className="bg-orange-500 px-3 py-2 rounded text-white text-sm">
            {customer?.name} - {customer?.phone || '62977'}
          </div>
          <Button className="bg-orange-500 hover:bg-orange-600 text-white text-sm">
            Add Customer
          </Button>
          <Button variant="ghost" size="icon" className="text-white">
            <ShoppingCart className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
            <img src="https://via.placeholder.com/40" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm p-6">
          {/* Title */}
          <div className="flex items-center justify-between mb-6 pb-4 border-b">
            <h1 className="text-lg font-medium text-gray-800">
              Step 1: Upload your Photos
            </h1>
            <Button 
              variant="outline" 
              className="bg-[#1a2744] text-white hover:bg-[#2a3754]"
              onClick={() => navigate('/reseller/measurement/summary', { state: { customer } })}
            >
              MEASUREMENT SUMMARY
            </Button>
          </div>

          {/* Photo Upload Boxes */}
          <div className="flex justify-between items-start mb-8">
            <PhotoUploadBox position="side" label="Side" />
            <PhotoUploadBox position="back" label="Back" />
            <PhotoUploadBox position="front" label="Front" />
            {/* Empty placeholder for spacing */}
            <div className="w-40"></div>
          </div>

          {/* Share Tomorrow Link */}
          <div className="text-right mb-6">
            <button 
              onClick={handleShareTomorrow}
              className="text-sm text-blue-600 underline hover:text-blue-800"
            >
              or you can also Share Tomorrow
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline"
              className="bg-[#1a2744] text-white hover:bg-[#2a3754] px-8"
              onClick={() => navigate('/reseller/dashboard')}
            >
              CANCEL
            </Button>
            <Button 
              className="bg-[#1a2744] text-white hover:bg-[#2a3754] px-8"
              onClick={handleProceed}
              data-testid="proceed-step2"
            >
              Proceed to Step 2
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MeasurementPhotosPage;
