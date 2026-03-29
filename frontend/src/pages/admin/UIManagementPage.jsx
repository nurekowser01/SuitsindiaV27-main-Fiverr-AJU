import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Image, Plus, Trash2, Check, Upload, Home, Info, Shirt, Palette, Cpu, HelpCircle, Rocket, MapPin, Phone, ChevronDown, ChevronUp, LayoutGrid, Layers } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Page configurations with hero and other images
const pageConfigs = [
  { 
    id: 'home', 
    name: 'Home', 
    icon: Home, 
    heroType: 'carousel',
    heroDescription: 'Homepage hero carousel with 3 rotating slides',
    otherImages: [
      { id: 'productLine', name: 'Product Line Images', description: 'Bespoke products carousel', isArray: true },
      { id: 'styleApp', name: 'StyleApp Image', description: 'StyleApp device mockup', isArray: false },
    ]
  },
  { 
    id: 'about', 
    name: 'About', 
    icon: Info, 
    heroType: 'single',
    heroDescription: 'About page hero background image',
    otherImages: [
      { id: 'craftsmanship', name: 'Craftsmanship Image', description: 'Craftsmanship section image', isArray: false },
    ]
  },
  { 
    id: 'garments', 
    name: 'Garments', 
    icon: Shirt, 
    heroType: 'single',
    heroDescription: 'Garments page hero background image',
    otherImages: [
      { id: 'jacketGhost', name: 'Jacket Ghost Image', description: 'Jacket construction display', isArray: false },
      { id: 'jacketOverlay', name: 'Jacket Overlay Image', description: 'Jacket features overlay', isArray: false },
      { id: 'shirtGhost', name: 'Shirt Ghost Image', description: 'Shirt construction display', isArray: false },
      { id: 'shirtOverlay', name: 'Shirt Overlay Image', description: 'Shirt features overlay', isArray: false },
      { id: 'trouserGhost', name: 'Trouser Ghost Image', description: 'Trouser construction display', isArray: false },
      { id: 'trouserOverlay', name: 'Trouser Overlay Image', description: 'Trouser features overlay', isArray: false },
    ]
  },
  { 
    id: 'fabrics', 
    name: 'Fabrics', 
    icon: Palette, 
    heroType: 'carousel',
    heroDescription: 'Fabrics page carousel with 2 slides',
    otherImages: [
      { id: 'mapImage', name: 'Map Image', description: 'Fabric sourcing map', isArray: false },
      { id: 'swatchImage', name: 'Swatch Image', description: 'Fabric swatch display', isArray: false },
      { id: 'vicunaImage', name: 'Vicuña Image', description: 'Vicuña fabric image', isArray: false },
      { id: 'millLogos', name: 'Mill Partner Logos', description: 'Fabric mill logos carousel', isArray: true },
    ]
  },
  { 
    id: 'technology', 
    name: 'Technology', 
    icon: Cpu, 
    heroType: 'single',
    heroDescription: 'Technology page hero background image',
    otherImages: [
      { id: 'patternImage', name: 'Pattern Designing Image', description: 'Pattern design section', isArray: false },
      { id: 'productionImage', name: 'Production Planning Image', description: 'Production section', isArray: false },
      { id: 'orderPanelImage', name: 'Order Panel Image', description: 'Order panel section', isArray: false },
    ]
  },
  { 
    id: 'how-it-works', 
    name: 'How It Works', 
    icon: HelpCircle, 
    heroType: 'single',
    heroDescription: 'How It Works page hero background image',
    otherImages: [
      { id: 'onboardingImage', name: 'Onboarding Image', description: 'Onboarding step image', isArray: false },
      { id: 'salesImage', name: 'Sales Image', description: 'Sales step image', isArray: false },
      { id: 'fulfillmentImage', name: 'Fulfillment Image', description: 'Fulfillment step image', isArray: false },
      { id: 'ongoingImage', name: 'Ongoing Image', description: 'Ongoing step image', isArray: false },
    ]
  },
  { 
    id: 'get-started', 
    name: 'Get Started', 
    icon: Rocket, 
    heroType: 'single',
    heroDescription: 'Get Started page hero background image',
    otherImages: []
  },
  { 
    id: 'trunk-show', 
    name: 'Trunk Show', 
    icon: MapPin, 
    heroType: 'single',
    heroDescription: 'Trunk Show page hero background image',
    otherImages: [
      { id: 'cityImages', name: 'City Images', description: 'City showcase images', isArray: true },
    ]
  },
  { 
    id: 'contact-us', 
    name: 'Contact Us', 
    icon: Phone, 
    heroType: 'single',
    heroDescription: 'Contact Us page hero background image',
    otherImages: []
  },
];

// Default images
const defaultImages = {
  home: {
    hero: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/hero.jpg', title: 'STYLE APP', subtitle: 'DESIGN AND ORDER CUSTOM', highlight: 'MADE-TO-MEASURE SUITS AT EASE' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/hero2.jpg', title: 'CUSTOM', subtitle: 'Private Label Wholesale', highlight: '' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/ongoing.jpg', title: 'LUXURIOUS', subtitle: 'FABRICS TO CHOOSE FROM', highlight: '' },
    ],
    displayMode: 'carousel',
    activeHeroIndex: 0,
    carouselImages: [0, 1, 2],
    productLine: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/bespoke-shirts.jpg', name: 'BESPOKE SHIRTS' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/bespoke-trousers.jpg', name: 'BESPOKE TROUSERS' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/bespoke-waistcoat.jpg', name: 'BESPOKE WAISTCOATS' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/bespoke-overcoat.jpg', name: 'BESPOKE OVERCOATS' },
    ],
    styleApp: 'https://tailorstailor.in/wp-content/uploads/2022/02/style-app.png',
  },
  about: {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/about.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
    craftsmanship: 'https://tailorstailor.in/wp-content/uploads/2022/02/about2-1.jpg',
  },
  garments: {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/garments.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
    jacketGhost: 'https://tailorstailor.in/wp-content/uploads/2022/02/ghost-suit2.jpg',
    jacketOverlay: 'https://tailorstailor.in/wp-content/uploads/2022/02/jacketoverlay-new.jpg',
    shirtGhost: 'https://tailorstailor.in/wp-content/uploads/2022/02/ghost-shirt.jpg',
    shirtOverlay: 'https://tailorstailor.in/wp-content/uploads/2022/02/shirt-overlay.jpg',
    trouserGhost: 'https://tailorstailor.in/wp-content/uploads/2022/02/ghost-trouser.jpg',
    trouserOverlay: 'https://tailorstailor.in/wp-content/uploads/2022/02/trouser-construction.jpg',
  },
  fabrics: {
    hero: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/dna.jpg', title: 'BIELLA', subtitle: 'THE WOOL CITY' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/vicuna.jpg', title: 'VICUÑA', subtitle: 'A PRECIOUS FABRIC' },
    ],
    displayMode: 'carousel',
    activeHeroIndex: 0,
    carouselImages: [0, 1],
    mapImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/map.jpg',
    swatchImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/swatch.jpg',
    vicunaImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/vicuna-1.jpg',
    millLogos: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/holland-sherry.jpg', name: 'Holland & Sherry' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/loro-piana.jpg', name: 'Loro Piana' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/reda.jpg', name: 'Reda' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/scabal.jpg', name: 'Scabal' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/vbc.jpg', name: 'VBC' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/drago.jpg', name: 'Drago' },
    ],
  },
  technology: {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/technology.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
    patternImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/onboarding.jpg',
    productionImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/sales.jpg',
    orderPanelImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/admin.jpg',
  },
  'how-it-works': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/how-it-works.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
    onboardingImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/onboarding.jpg',
    salesImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/sales-1.jpg',
    fulfillmentImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/fulfillment.jpg',
    ongoingImage: 'https://tailorstailor.in/wp-content/uploads/2022/02/ongoing.jpg',
  },
  'get-started': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/get-started.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
  },
  'trunk-show': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/trunkshow.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
    cityImages: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/360_F_222479814_eQgAqEKGvrwGLGTHZfjew7KcSCXbOu6s.jpg', name: 'New York' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/fdd0b447040d747b5d7d8f2229e46411.jpg', name: 'Los Angeles' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/8ff20d0c780bc376c650d459bb82765b.jpg', name: 'Boston' },
    ],
  },
  'contact-us': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/sign-up.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
    carouselImages: [],
  },
};

const UIManagementPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [images, setImages] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newImageName, setNewImageName] = useState('');

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/all-images`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data && Object.keys(response.data).length > 0) {
        // Merge with defaults to ensure all fields exist
        const mergedImages = {};
        Object.keys(defaultImages).forEach(pageId => {
          mergedImages[pageId] = { ...defaultImages[pageId], ...response.data[pageId] };
        });
        setImages(mergedImages);
      } else {
        setImages(defaultImages);
      }
    } catch (error) {
      console.error('Error fetching images:', error);
      setImages(defaultImages);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Display mode handlers
  const handleSetDisplayMode = (pageId, mode) => {
    setImages(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], displayMode: mode }
    }));
    toast.success(`Display mode set to ${mode}`);
  };

  const handleSelectImage = (pageId, index) => {
    const currentMode = images[pageId]?.displayMode || 'individual';
    
    if (currentMode === 'individual') {
      setImages(prev => ({
        ...prev,
        [pageId]: { ...prev[pageId], activeHeroIndex: index }
      }));
      toast.success('Image selected as active!');
    } else {
      // Carousel mode - toggle selection
      const currentCarousel = images[pageId]?.carouselImages || [];
      let newCarousel;
      if (currentCarousel.includes(index)) {
        newCarousel = currentCarousel.filter(i => i !== index);
        toast.info('Image removed from carousel');
      } else {
        newCarousel = [...currentCarousel, index];
        toast.success('Image added to carousel');
      }
      setImages(prev => ({
        ...prev,
        [pageId]: { ...prev[pageId], carouselImages: newCarousel }
      }));
    }
  };

  const isImageSelected = (pageId, index) => {
    const currentMode = images[pageId]?.displayMode || 'individual';
    if (currentMode === 'individual') {
      return index === (images[pageId]?.activeHeroIndex || 0);
    } else {
      return (images[pageId]?.carouselImages || []).includes(index);
    }
  };

  const handleUpdateSingleImage = (pageId, imageId, url) => {
    setImages(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], [imageId]: url }
    }));
  };

  const handleUpdateHeroImage = (pageId, index, field, value) => {
    setImages(prev => {
      const newHero = [...(prev[pageId]?.hero || [])];
      newHero[index] = { ...newHero[index], [field]: value };
      return { ...prev, [pageId]: { ...prev[pageId], hero: newHero } };
    });
  };

  const handleAddHeroImage = (pageId) => {
    if (!newImageUrl) {
      toast.error('Please enter an image URL');
      return;
    }
    setImages(prev => {
      const newHero = [...(prev[pageId]?.hero || []), { url: newImageUrl, title: '', subtitle: '' }];
      return { ...prev, [pageId]: { ...prev[pageId], hero: newHero } };
    });
    setNewImageUrl('');
    toast.success('Image added to gallery!');
  };

  const handleRemoveHeroImage = (pageId, index) => {
    const currentHero = images[pageId]?.hero || [];
    if (currentHero.length <= 1) {
      toast.error('Cannot remove the last image');
      return;
    }
    
    // Also update carousel images and active index if needed
    const currentCarousel = images[pageId]?.carouselImages || [];
    const newCarousel = currentCarousel.filter(i => i !== index).map(i => i > index ? i - 1 : i);
    const currentActive = images[pageId]?.activeHeroIndex || 0;
    const newActive = currentActive >= currentHero.length - 1 ? 0 : (currentActive > index ? currentActive - 1 : currentActive);
    
    setImages(prev => ({
      ...prev,
      [pageId]: { 
        ...prev[pageId], 
        hero: currentHero.filter((_, i) => i !== index),
        carouselImages: newCarousel,
        activeHeroIndex: newActive
      }
    }));
    toast.success('Image removed');
  };

  const handleUpdateArrayImage = (pageId, arrayId, index, field, value) => {
    setImages(prev => {
      const newArray = [...(prev[pageId]?.[arrayId] || [])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [pageId]: { ...prev[pageId], [arrayId]: newArray } };
    });
  };

  const handleAddArrayImage = (pageId, arrayId) => {
    if (!newImageUrl) {
      toast.error('Please enter an image URL');
      return;
    }
    setImages(prev => {
      const newArray = [...(prev[pageId]?.[arrayId] || []), { url: newImageUrl, name: newImageName || 'New Image' }];
      return { ...prev, [pageId]: { ...prev[pageId], [arrayId]: newArray } };
    });
    setNewImageUrl('');
    setNewImageName('');
    toast.success('Image added!');
  };

  const handleRemoveArrayImage = (pageId, arrayId, index) => {
    setImages(prev => ({
      ...prev,
      [pageId]: { ...prev[pageId], [arrayId]: (prev[pageId]?.[arrayId] || []).filter((_, i) => i !== index) }
    }));
    toast.success('Image removed');
  };

  const handleSave = async () => {
    // Validation for carousel mode
    for (const pageId of Object.keys(images)) {
      const pageData = images[pageId];
      if (pageData.displayMode === 'carousel' && (pageData.carouselImages || []).length < 2) {
        toast.error(`${pageId} page: Carousel mode requires at least 2 images selected`);
        return;
      }
    }
    
    setSaving(true);
    try {
      await axios.put(`${API_URL}/settings/all-images`, images, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('All images saved successfully!');
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error('Failed to save images');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64">Loading...</div></AdminLayout>;
  }

  const renderHeroSection = (pageConfig) => {
    const pageId = pageConfig.id;
    const heroImages = images[pageId]?.hero || [];
    const displayMode = images[pageId]?.displayMode || 'individual';
    const activeIndex = images[pageId]?.activeHeroIndex || 0;
    const carouselImages = images[pageId]?.carouselImages || [];

    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-[#c9a962]" />
            Hero Image Gallery ({heroImages.length})
          </CardTitle>
          <CardDescription>{pageConfig.heroDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Display Mode Selector */}
          <div className="space-y-4 pb-4 border-b">
            <Label className="text-base font-semibold">Display Mode</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handleSetDisplayMode(pageId, 'individual')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  displayMode === 'individual' 
                    ? 'border-[#c9a962] bg-[#c9a962]/10 ring-2 ring-[#c9a962] ring-offset-2' 
                    : 'border-gray-200 hover:border-[#c9a962]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <LayoutGrid className="h-8 w-8 text-[#c9a962]" />
                  <div>
                    <p className="font-semibold text-[#1a1a1a]">Individual Image</p>
                    <p className="text-xs text-[#666]">Single static hero image</p>
                  </div>
                  {displayMode === 'individual' && <Badge className="mt-2 bg-[#c9a962] text-black">Active</Badge>}
                </div>
              </button>
              
              <button
                onClick={() => handleSetDisplayMode(pageId, 'carousel')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  displayMode === 'carousel' 
                    ? 'border-[#c9a962] bg-[#c9a962]/10 ring-2 ring-[#c9a962] ring-offset-2' 
                    : 'border-gray-200 hover:border-[#c9a962]'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Layers className="h-8 w-8 text-[#c9a962]" />
                  <div>
                    <p className="font-semibold text-[#1a1a1a]">Carousel</p>
                    <p className="text-xs text-[#666]">Rotating image slideshow</p>
                  </div>
                  {displayMode === 'carousel' && <Badge className="mt-2 bg-[#c9a962] text-black">Active</Badge>}
                </div>
              </button>
            </div>
            
            {displayMode === 'carousel' && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm text-blue-900">
                  <strong>Carousel Mode:</strong> Click on multiple images below to add them to the carousel. 
                  Selected images will rotate automatically. Minimum 2 images required.
                </p>
              </div>
            )}
          </div>

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Image Gallery</Label>
            {displayMode === 'individual' ? (
              <Badge variant="outline" className="border-[#c9a962] text-[#c9a962]">Active: Image {activeIndex + 1}</Badge>
            ) : (
              <Badge variant="outline" className="border-[#c9a962] text-[#c9a962]">Carousel: {carouselImages.length} images selected</Badge>
            )}
          </div>

          {/* Hero Images Gallery */}
          {heroImages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {heroImages.map((img, index) => {
                const isSelected = isImageSelected(pageId, index);
                return (
                  <div 
                    key={index} 
                    className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      isSelected
                        ? 'border-[#c9a962] ring-2 ring-[#c9a962] ring-offset-2' 
                        : 'border-gray-200 hover:border-[#c9a962]'
                    }`}
                    onClick={() => handleSelectImage(pageId, index)}
                  >
                    <img
                      src={img.url}
                      alt={img.title || `Hero image ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                    
                    {/* Active/Selected Badge */}
                    {isSelected && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-[#c9a962] text-black flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          {displayMode === 'individual' ? 'Active' : 'In Carousel'}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Image Number */}
                    <div className="absolute bottom-2 left-2">
                      <Badge variant="secondary">
                        Image {index + 1}
                      </Badge>
                    </div>
                    
                    {/* Delete Button */}
                    {heroImages.length > 1 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveHeroImage(pageId, index);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {/* Hover Overlay */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white font-semibold text-center px-2">
                          {displayMode === 'individual' ? 'Click to set as active' : 'Click to add to carousel'}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 mx-auto text-[#666] mb-4" />
              <p className="text-[#666] mb-2">No hero images added yet</p>
              <p className="text-sm text-[#666]">Add an image URL below to get started</p>
            </div>
          )}

          {/* Edit Selected Image Details */}
          {heroImages.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <Label className="text-base font-semibold">Edit Image Details</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {heroImages.map((img, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Image {index + 1}</Badge>
                      {isImageSelected(pageId, index) && (
                        <Badge className="bg-[#c9a962] text-black text-xs">
                          {displayMode === 'individual' ? 'Active' : 'In Carousel'}
                        </Badge>
                      )}
                    </div>
                    <Input
                      placeholder="Image URL"
                      value={img.url}
                      onChange={(e) => handleUpdateHeroImage(pageId, index, 'url', e.target.value)}
                      className="text-xs"
                    />
                    <Input 
                      placeholder="Title" 
                      value={img.title || ''} 
                      onChange={(e) => handleUpdateHeroImage(pageId, index, 'title', e.target.value)} 
                      className="text-xs" 
                    />
                    <Input 
                      placeholder="Subtitle" 
                      value={img.subtitle || ''} 
                      onChange={(e) => handleUpdateHeroImage(pageId, index, 'subtitle', e.target.value)} 
                      className="text-xs" 
                    />
                    {pageId === 'home' && (
                      <Input 
                        placeholder="Highlight text" 
                        value={img.highlight || ''} 
                        onChange={(e) => handleUpdateHeroImage(pageId, index, 'highlight', e.target.value)} 
                        className="text-xs" 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Hero Image */}
          <div className="space-y-4 pt-4 border-t">
            <Label className="text-base font-semibold">Add New Hero Image</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="https://images.unsplash.com/photo-... or any image URL"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddHeroImage(pageId)}
              />
              <Button onClick={() => handleAddHeroImage(pageId)} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                <Plus className="h-4 w-4 mr-2" />
                Add Image
              </Button>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                <strong>💡 Pro Tip:</strong> For best results, use images with 1920x1080 resolution or higher. 
                Free stock photos: <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>, 
                <a href="https://pexels.com" target="_blank" rel="noopener noreferrer" className="underline ml-1">Pexels</a>
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">How to use:</h4>
            <ol className="text-sm text-[#666] space-y-1 ml-4 list-decimal">
              <li>Choose display mode: Individual Image or Carousel</li>
              <li>Add multiple hero images using the form above</li>
              {displayMode === 'individual' ? (
                <>
                  <li>Click on any image to select it as active (gold border appears)</li>
                  <li>Click "Save All Changes" to apply the selected image to your page</li>
                </>
              ) : (
                <>
                  <li>Click on multiple images to add them to the carousel (min. 2 required)</li>
                  <li>Selected images will have "In Carousel" badge and gold border</li>
                  <li>Click "Save All Changes" to activate the carousel on your page</li>
                  <li>Images will automatically rotate every 5 seconds</li>
                </>
              )}
              <li>Hover over images to delete them (cannot delete if only one remains)</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOtherImagesSection = (pageConfig) => {
    const pageId = pageConfig.id;
    if (!pageConfig.otherImages || pageConfig.otherImages.length === 0) return null;

    const sectionKey = `${pageId}-other`;
    const isExpanded = expandedSections[sectionKey] !== false;

    return (
      <Card>
        <CardHeader 
          className="cursor-pointer hover:bg-gray-50"
          onClick={() => toggleSection(sectionKey)}
        >
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#c9a962]" />
              Other Page Images
            </span>
            {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </CardTitle>
          <CardDescription>Manage all other images on this page</CardDescription>
        </CardHeader>
        {isExpanded && (
          <CardContent className="space-y-6">
            {pageConfig.otherImages.map((imgConfig) => (
              <div key={imgConfig.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-[#1a1a1a]">{imgConfig.name}</h4>
                    <p className="text-sm text-[#666]">{imgConfig.description}</p>
                  </div>
                  {imgConfig.isArray && <Badge variant="outline">Multiple Images</Badge>}
                </div>

                {imgConfig.isArray ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(images[pageId]?.[imgConfig.id] || []).map((img, index) => (
                        <div key={index} className="relative group">
                          <img src={img.url} alt={img.name || `Image ${index + 1}`} className="w-full h-24 object-cover rounded border" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                            onClick={() => handleRemoveArrayImage(pageId, imgConfig.id, index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Input
                            placeholder="Name"
                            value={img.name || ''}
                            onChange={(e) => handleUpdateArrayImage(pageId, imgConfig.id, index, 'name', e.target.value)}
                            className="mt-1 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Image URL" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} className="flex-1" />
                      <Input placeholder="Name" value={newImageName} onChange={(e) => setNewImageName(e.target.value)} className="w-32" />
                      <Button size="sm" onClick={() => handleAddArrayImage(pageId, imgConfig.id)} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-4 items-start">
                    <img 
                      src={images[pageId]?.[imgConfig.id] || ''} 
                      alt={imgConfig.name} 
                      className="w-32 h-24 object-cover rounded border"
                      onError={(e) => e.target.src = 'https://via.placeholder.com/128x96?text=No+Image'}
                    />
                    <Input
                      placeholder="Enter image URL..."
                      value={images[pageId]?.[imgConfig.id] || ''}
                      onChange={(e) => handleUpdateSingleImage(pageId, imgConfig.id, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Image className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">UI Management</h1>
              <p className="text-[#666]">Manage all images across your website</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} size="lg" className="bg-[#c9a962] hover:bg-[#b89952] text-black">
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-9 gap-1 h-auto mb-6">
            {pageConfigs.map((page) => (
              <TabsTrigger key={page.id} value={page.id} className="flex flex-col items-center gap-1 py-2 px-2 text-xs">
                <page.icon className="h-4 w-4" />
                <span className="hidden sm:inline truncate">{page.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {pageConfigs.map((pageConfig) => (
            <TabsContent key={pageConfig.id} value={pageConfig.id} className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <pageConfig.icon className="h-6 w-6 text-[#c9a962]" />
                <h2 className="text-2xl font-semibold text-[#1a1a1a]">{pageConfig.name} Page Images</h2>
              </div>

              {renderHeroSection(pageConfig)}
              {renderOtherImagesSection(pageConfig)}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default UIManagementPage;
