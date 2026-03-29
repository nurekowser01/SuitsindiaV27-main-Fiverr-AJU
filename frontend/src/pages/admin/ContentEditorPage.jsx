import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Save, Edit3, Home, Info, Shirt, Palette, Cpu, HelpCircle, Rocket, MapPin, Phone, X, Users, Ruler, Settings, Clock, Eye, EyeOff, FileText, PanelLeft, PanelLeftClose, ExternalLink } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';
const PREVIEW_URL = process.env.REACT_APP_BACKEND_URL?.replace('/api', '') || '';
const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

// Inline editable text component
const EditableText = ({ value, onChange, className = '', multiline = false, placeholder = 'Click to edit...' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value || '');

  const handleSave = () => {
    onChange(tempValue);
    setIsEditing(false);
    toast.success('Text updated!');
  };

  const handleCancel = () => {
    setTempValue(value || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="relative">
        {multiline ? (
          <Textarea
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full border-2 border-[#c9a962] bg-white text-[#1a1a1a] p-2 rounded"
            rows={4}
            autoFocus
          />
        ) : (
          <Input
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            className="w-full border-2 border-[#c9a962] bg-white text-[#1a1a1a]"
            autoFocus
          />
        )}
        <div className="flex gap-2 mt-2">
          <Button size="sm" onClick={handleSave} className="bg-[#c9a962] hover:bg-[#b89952] text-black">Save</Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className={`cursor-pointer hover:bg-[#c9a962]/20 hover:outline hover:outline-2 hover:outline-[#c9a962] rounded px-2 py-1 transition-all group relative ${className}`}
    >
      {value || <span className="text-gray-400 italic">{placeholder}</span>}
      <Edit3 className="absolute top-1 right-1 h-4 w-4 text-[#c9a962] opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

const iconMap = {
  users: Users,
  shirt: Shirt,
  ruler: Ruler,
  settings: Settings,
  clock: Clock,
};

const defaultContent = {
  home: {
    heroSlides: [
      { title: 'STYLE APP', subtitle: 'DESIGN AND ORDER CUSTOM', highlight: 'MADE-TO-MEASURE SUITS AT EASE' },
      { title: 'CUSTOM', subtitle: 'Private Label Wholesale', highlight: '' },
      { title: 'LUXURIOUS', subtitle: 'FABRICS TO CHOOSE FROM', highlight: '' },
    ],
    productLineTitle: 'Product Line',
    productLineSubtitle: 'Our construction and manufacturing is of the highest quality available today. We are committed to providing our customers with world class tailoring and exceptional service.',
    whyChooseUsTitle: 'Why Suits India ?',
    whyChooseUs: [
      { title: 'Customer Service', description: "Our team has years of award-winning tailoring experience and knowledge behind them.", icon: 'users' },
      { title: 'Fabrics', description: 'Our luxurious suiting fabrics come from the finest and most established mills in England and Italy.', icon: 'shirt' },
      { title: 'A Great Fit', description: "We're committed to providing customers with a seamless fit and a garment they can truly call their own.", icon: 'ruler' },
      { title: '100+ Customisations', description: 'With multiple customisation options that run across each feature of our garments.', icon: 'settings' },
      { title: 'Quick Turnarounds', description: 'We manufacture and ship most custom clothing within a three week time period.', icon: 'clock' },
    ],
    styleAppTitle: 'Explore StyleApp',
    styleAppFeatures: [
      'Choose from hundreds of luxurious fabrics from the finest mills in the world.',
      'Design and configure your garment with an endless array of customisation options.',
      'Manage your clients and keep their measurements in one place.',
      'Create Personal Racks.',
    ],
    ctaButtonText: 'Book Appointment',
  },
  about: {
    heroTitle: 'We believe every garment should tell a story, therefore we offer complete customization to create a look that tells yours.',
    storyTitle: 'Our Story',
    storyContent: `Suits India is India's premier bespoke brand for menswear. Founded with the vision of creating a highly personalized experience for the sartorially-inclined, it is part of the new generation of tailoring houses born in the current menswear age.`,
    craftsmanshipTitle: 'Craftsmanship',
    craftsmanshipContent: 'We focus on every detail of construction to create garments of the highest quality craftsmanship.',
    uspTitle: 'Our USP',
    usp: [
      { title: 'Bespoke Wear', description: 'We offer completely personalised patterns and garments for each customer.' },
      { title: 'Virtual Made-To-Measure Store', description: 'Machine Learning helps identify problems in measurements.' },
      { title: 'Choices & Customisations', description: '10,000+ fabric choices along with an array of designs.' },
      { title: 'One-To-One Service', description: 'Every customer gets a personal stylist.' },
      { title: 'Product Superiority', description: 'Superior construction and stringent quality checks.' },
      { title: 'Quick Turn Around Time', description: 'We offer delivery within 2 to 3 weeks.' },
    ],
  },
  garments: {
    heroTitle: 'Individually made using your unique measurements, personalized to reflect your style.',
    introTitle: 'Our Garments',
    introContent: "Our garments are defined by pairing classic, streamlined silhouettes with elevated details and Italian construction techniques.",
    jacketsIntro: 'Our jackets are created in the Neapolitan style, offering lightweight construction, refined finishing and comfort.',
    shirtsIntro: 'Crafted out of the finest fabrics with precise detailing, our shirts carry timeless appeal.',
    trousersIntro: 'Versatile and enduring, our comfortable tailor-made trousers can be worn round the year.',
  },
  fabrics: {
    introTitle: 'Our Fabrics',
    introContent: 'Our fabrics are sourced from some of the finest weaving mills in Europe renowned for their high performance and quality.',
    vicunaTitle: 'VICUÑA',
    vicunaContent: 'The most exceptional of our range of fabrics is vicuna. Found only in the high Andes, the vicuna is a rare species that produces an even rarer fibre.',
  },
  technology: {
    heroTitle: 'Collaborate with your clients to achieve the Bespoke Look they want',
    introTitle: 'Technology',
    introContent: 'Our fabrics are sourced from some of the finest weaving mills in Europe renowned for their high performance and quality.',
    features: [
      { title: 'Pattern Designing', description: 'Bespoke patterns are created using proprietary software.' },
      { title: 'Production Planning and Tracking', description: 'Our AI Production Planning uses deep learning algorithms.' },
      { title: 'Order Panel', description: "Post order, your admin panel is your one point source for tracking all orders." },
    ],
  },
  'how-it-works': {
    heroTitle: 'The Bespoke Experience',
    introTitle: 'How it Works',
    introContent: "If you aren't already a custom clothier, do you have aspirations of owning your own home-based business?",
    processTitle: "Here's a quick glimpse of our process",
    steps: [
      { title: 'Onboarding', description: "After understanding you and your business, we'll send you our style portfolios." },
      { title: 'Sales', description: "You'll have everything you need to confidently meet with clients." },
      { title: 'Fulfillment', description: "After a typical three-week turnaround period, you'll receive your client's order." },
      { title: 'Ongoing', description: 'Continuous support for your business growth.' },
    ],
  },
  'get-started': {
    heroTitle: 'Become A PARTNER',
    introTitle: 'Get Started',
    introContent: "If you're ready to partner with a private label clothing manufacturer.",
    formTitle: 'Request more Information',
    submitButton: 'Submit Query',
  },
  'trunk-show': {
    heroTitle: "We'll be in your CITY soon",
    introTitle: 'Trunkshow',
    introContent: "We travel throughout the year and regularly visit the world's major cities.",
    scheduleTitle: 'Our traveling schedule:',
    processTitle: 'Process',
  },
  'contact-us': {
    heroTitle: 'Need HELP?',
    introTitle: "We're here to Help",
    introContent: "Because we believe that tailoring is a people's business, you'll get unparalled service and support for your private label custom clothing business from us at Suits India",
    phone: '+91 9446373329',
    email: 'aju@suitsindia.in',
    companyName: 'Suits India Private Ltd.',
    address1: '15/773, Karanjikudy',
    address2: 'Thottungal Lane, Perumbavoor',
    city: 'Kochi, Kerala, India',
    hours: 'Mon – Fri from 10am– 5pm',
    supportText: 'Our friendly support team is available to assist you.',
    // US Sales Partner fields
    usPhone: '',
    usCompanyName: '',
    usAddress1: '',
    usAddress2: '',
    usCity: '',
    usWhatsapp: '',
  },
  footer: {
    description: 'Private label custom Menswear manufacturer. Our construction and manufacturing is of the highest quality available today.',
    quickLinksTitle: 'Quick Links',
    contactTitle: 'Contact',
    copyright: '© 2025 Suits India. All rights reserved.',
  },
};

const ContentEditorPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [content, setContent] = useState(defaultContent);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/all-content`);
      if (response.data && Object.keys(response.data).length > 0) {
        setContent({ ...defaultContent, ...response.data });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API_URL}/settings/all-content`, content, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('All content saved successfully!');
      // Refresh preview after save
      setPreviewKey(prev => prev + 1);
    } catch (error) {
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const updateContent = (page, field, value) => {
    setContent(prev => ({
      ...prev,
      [page]: { ...prev[page], [field]: value }
    }));
  };

  const updateArrayItem = (page, arrayField, index, field, value) => {
    setContent(prev => {
      const newArray = [...(prev[page]?.[arrayField] || [])];
      newArray[index] = { ...newArray[index], [field]: value };
      return { ...prev, [page]: { ...prev[page], [arrayField]: newArray } };
    });
  };

  const updateArrayString = (page, arrayField, index, value) => {
    setContent(prev => {
      const newArray = [...(prev[page]?.[arrayField] || [])];
      newArray[index] = value;
      return { ...prev, [page]: { ...prev[page], [arrayField]: newArray } };
    });
  };

  const pages = [
    { id: 'home', name: 'Home', icon: Home, path: '/' },
    { id: 'about', name: 'About', icon: Info, path: '/about' },
    { id: 'garments', name: 'Garments', icon: Shirt, path: '/garments' },
    { id: 'fabrics', name: 'Fabrics', icon: Palette, path: '/fabrics' },
    { id: 'technology', name: 'Technology', icon: Cpu, path: '/technology' },
    { id: 'how-it-works', name: 'How It Works', icon: HelpCircle, path: '/how-it-works' },
    { id: 'get-started', name: 'Get Started', icon: Rocket, path: '/get-started' },
    { id: 'trunk-show', name: 'Trunk Show', icon: MapPin, path: '/trunk-show' },
    { id: 'contact-us', name: 'Contact Us', icon: Phone, path: '/contact-us' },
  ];

  const currentPage = pages.find(p => p.id === activeTab);
  const previewUrl = PREVIEW_URL + (currentPage?.path || '/');

  if (loading) {
    return <AdminLayout><div className="flex items-center justify-center h-64">Loading...</div></AdminLayout>;
  }

  // Form-based editor for each page
  const renderFormEditor = (pageId) => {
    const pageContent = content[pageId] || {};
    
    switch (pageId) {
      case 'home':
        return (
          <div className="space-y-6">
            {/* Hero Slides */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Hero Slides</CardTitle>
                <CardDescription>Edit the rotating hero section content</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {(pageContent.heroSlides || []).map((slide, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <Badge>Slide {index + 1}</Badge>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs">Title</Label>
                        <Input value={slide.title || ''} onChange={(e) => updateArrayItem('home', 'heroSlides', index, 'title', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Subtitle</Label>
                        <Input value={slide.subtitle || ''} onChange={(e) => updateArrayItem('home', 'heroSlides', index, 'subtitle', e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-xs">Highlight</Label>
                        <Input value={slide.highlight || ''} onChange={(e) => updateArrayItem('home', 'heroSlides', index, 'highlight', e.target.value)} />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Product Line */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Line Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.productLineTitle || ''} onChange={(e) => updateContent('home', 'productLineTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Subtitle</Label>
                  <Textarea value={pageContent.productLineSubtitle || ''} onChange={(e) => updateContent('home', 'productLineSubtitle', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            {/* Why Choose Us */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Why Choose Us</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Section Title</Label>
                  <Input value={pageContent.whyChooseUsTitle || ''} onChange={(e) => updateContent('home', 'whyChooseUsTitle', e.target.value)} />
                </div>
                {(pageContent.whyChooseUs || []).map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{index + 1}</Badge>
                      <Input placeholder="Title" value={item.title || ''} onChange={(e) => updateArrayItem('home', 'whyChooseUs', index, 'title', e.target.value)} className="flex-1" />
                    </div>
                    <Textarea placeholder="Description" value={item.description || ''} onChange={(e) => updateArrayItem('home', 'whyChooseUs', index, 'description', e.target.value)} rows={2} />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* StyleApp */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">StyleApp Section</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.styleAppTitle || ''} onChange={(e) => updateContent('home', 'styleAppTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Features</Label>
                  {(pageContent.styleAppFeatures || []).map((feature, index) => (
                    <Input key={index} value={feature} onChange={(e) => updateArrayString('home', 'styleAppFeatures', index, e.target.value)} className="mb-2" />
                  ))}
                </div>
                <div>
                  <Label>CTA Button Text</Label>
                  <Input value={pageContent.ctaButtonText || ''} onChange={(e) => updateContent('home', 'ctaButtonText', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Textarea value={pageContent.heroTitle || ''} onChange={(e) => updateContent('about', 'heroTitle', e.target.value)} rows={3} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Our Story</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.storyTitle || ''} onChange={(e) => updateContent('about', 'storyTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.storyContent || ''} onChange={(e) => updateContent('about', 'storyContent', e.target.value)} rows={5} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Craftsmanship</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.craftsmanshipTitle || ''} onChange={(e) => updateContent('about', 'craftsmanshipTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.craftsmanshipContent || ''} onChange={(e) => updateContent('about', 'craftsmanshipContent', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Our USP</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Section Title</Label>
                  <Input value={pageContent.uspTitle || ''} onChange={(e) => updateContent('about', 'uspTitle', e.target.value)} />
                </div>
                {(pageContent.usp || []).map((item, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <Input placeholder="Title" value={item.title || ''} onChange={(e) => updateArrayItem('about', 'usp', index, 'title', e.target.value)} />
                    <Textarea placeholder="Description" value={item.description || ''} onChange={(e) => updateArrayItem('about', 'usp', index, 'description', e.target.value)} rows={2} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'contact-us':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Input value={pageContent.heroTitle || ''} onChange={(e) => updateContent('contact-us', 'heroTitle', e.target.value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('contact-us', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('contact-us', 'introContent', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">India Office - Contact Information</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input value={pageContent.phone || ''} onChange={(e) => updateContent('contact-us', 'phone', e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={pageContent.email || ''} onChange={(e) => updateContent('contact-us', 'email', e.target.value)} />
                </div>
                <div>
                  <Label>Company Name</Label>
                  <Input value={pageContent.companyName || ''} onChange={(e) => updateContent('contact-us', 'companyName', e.target.value)} />
                </div>
                <div>
                  <Label>Address Line 1</Label>
                  <Input value={pageContent.address1 || ''} onChange={(e) => updateContent('contact-us', 'address1', e.target.value)} />
                </div>
                <div>
                  <Label>Address Line 2</Label>
                  <Input value={pageContent.address2 || ''} onChange={(e) => updateContent('contact-us', 'address2', e.target.value)} />
                </div>
                <div>
                  <Label>City</Label>
                  <Input value={pageContent.city || ''} onChange={(e) => updateContent('contact-us', 'city', e.target.value)} />
                </div>
                <div>
                  <Label>Hours</Label>
                  <Input value={pageContent.hours || ''} onChange={(e) => updateContent('contact-us', 'hours', e.target.value)} />
                </div>
                <div>
                  <Label>Support Text</Label>
                  <Input value={pageContent.supportText || ''} onChange={(e) => updateContent('contact-us', 'supportText', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-blue-600">🇺🇸</span> US Sales Partner - Contact Information
                </CardTitle>
                <p className="text-sm text-gray-500">Leave fields empty to hide US Sales Partner section on the website</p>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>US Phone</Label>
                  <Input 
                    placeholder="+1 (555) 123-4567"
                    value={pageContent.usPhone || ''} 
                    onChange={(e) => updateContent('contact-us', 'usPhone', e.target.value)} 
                  />
                </div>
                <div>
                  <Label>US WhatsApp (with country code)</Label>
                  <Input 
                    placeholder="+15551234567"
                    value={pageContent.usWhatsapp || ''} 
                    onChange={(e) => updateContent('contact-us', 'usWhatsapp', e.target.value)} 
                  />
                </div>
                <div>
                  <Label>US Company/Partner Name</Label>
                  <Input 
                    placeholder="e.g., Suits USA LLC"
                    value={pageContent.usCompanyName || ''} 
                    onChange={(e) => updateContent('contact-us', 'usCompanyName', e.target.value)} 
                  />
                </div>
                <div>
                  <Label>US Address Line 1</Label>
                  <Input 
                    placeholder="e.g., 123 Fashion Ave"
                    value={pageContent.usAddress1 || ''} 
                    onChange={(e) => updateContent('contact-us', 'usAddress1', e.target.value)} 
                  />
                </div>
                <div>
                  <Label>US Address Line 2</Label>
                  <Input 
                    placeholder="e.g., Suite 500"
                    value={pageContent.usAddress2 || ''} 
                    onChange={(e) => updateContent('contact-us', 'usAddress2', e.target.value)} 
                  />
                </div>
                <div>
                  <Label>US City/State</Label>
                  <Input 
                    placeholder="e.g., New York, NY 10001, USA"
                    value={pageContent.usCity || ''} 
                    onChange={(e) => updateContent('contact-us', 'usCity', e.target.value)} 
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'garments':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Textarea value={pageContent.heroTitle || ''} onChange={(e) => updateContent('garments', 'heroTitle', e.target.value)} rows={2} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('garments', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('garments', 'introContent', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Garment Descriptions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Jackets Intro</Label>
                  <Textarea value={pageContent.jacketsIntro || ''} onChange={(e) => updateContent('garments', 'jacketsIntro', e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Shirts Intro</Label>
                  <Textarea value={pageContent.shirtsIntro || ''} onChange={(e) => updateContent('garments', 'shirtsIntro', e.target.value)} rows={2} />
                </div>
                <div>
                  <Label>Trousers Intro</Label>
                  <Textarea value={pageContent.trousersIntro || ''} onChange={(e) => updateContent('garments', 'trousersIntro', e.target.value)} rows={2} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'fabrics':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('fabrics', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('fabrics', 'introContent', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Vicuña Section</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.vicunaTitle || ''} onChange={(e) => updateContent('fabrics', 'vicunaTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.vicunaContent || ''} onChange={(e) => updateContent('fabrics', 'vicunaContent', e.target.value)} rows={4} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'technology':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Textarea value={pageContent.heroTitle || ''} onChange={(e) => updateContent('technology', 'heroTitle', e.target.value)} rows={2} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('technology', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('technology', 'introContent', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Features</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(pageContent.features || []).map((feature, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <Input placeholder="Title" value={feature.title || ''} onChange={(e) => updateArrayItem('technology', 'features', index, 'title', e.target.value)} />
                    <Textarea placeholder="Description" value={feature.description || ''} onChange={(e) => updateArrayItem('technology', 'features', index, 'description', e.target.value)} rows={2} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'how-it-works':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Input value={pageContent.heroTitle || ''} onChange={(e) => updateContent('how-it-works', 'heroTitle', e.target.value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('how-it-works', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('how-it-works', 'introContent', e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Process Title</Label>
                  <Input value={pageContent.processTitle || ''} onChange={(e) => updateContent('how-it-works', 'processTitle', e.target.value)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Steps</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {(pageContent.steps || []).map((step, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#c9a962] text-black">Step {index + 1}</Badge>
                    </div>
                    <Input placeholder="Title" value={step.title || ''} onChange={(e) => updateArrayItem('how-it-works', 'steps', index, 'title', e.target.value)} />
                    <Textarea placeholder="Description" value={step.description || ''} onChange={(e) => updateArrayItem('how-it-works', 'steps', index, 'description', e.target.value)} rows={2} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 'get-started':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Input value={pageContent.heroTitle || ''} onChange={(e) => updateContent('get-started', 'heroTitle', e.target.value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('get-started', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('get-started', 'introContent', e.target.value)} rows={3} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Form</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Form Title</Label>
                  <Input value={pageContent.formTitle || ''} onChange={(e) => updateContent('get-started', 'formTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Submit Button Text</Label>
                  <Input value={pageContent.submitButton || ''} onChange={(e) => updateContent('get-started', 'submitButton', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'trunk-show':
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Hero Section</CardTitle></CardHeader>
              <CardContent>
                <Label>Hero Title</Label>
                <Input value={pageContent.heroTitle || ''} onChange={(e) => updateContent('trunk-show', 'heroTitle', e.target.value)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg">Introduction</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Title</Label>
                  <Input value={pageContent.introTitle || ''} onChange={(e) => updateContent('trunk-show', 'introTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Content</Label>
                  <Textarea value={pageContent.introContent || ''} onChange={(e) => updateContent('trunk-show', 'introContent', e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Schedule Title</Label>
                  <Input value={pageContent.scheduleTitle || ''} onChange={(e) => updateContent('trunk-show', 'scheduleTitle', e.target.value)} />
                </div>
                <div>
                  <Label>Process Title</Label>
                  <Input value={pageContent.processTitle || ''} onChange={(e) => updateContent('trunk-show', 'processTitle', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return <div className="p-4 text-center text-gray-500">Select a page to edit</div>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-[#c9a962]" />
            <div>
              <h1 className="text-3xl font-bold text-[#1a1a1a]">Content Editor</h1>
              <p className="text-[#666]">Edit all text content across your website</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Live Preview Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-4 py-2">
              {showLivePreview ? <Eye className="h-4 w-4 text-[#c9a962]" /> : <EyeOff className="h-4 w-4 text-gray-400" />}
              <Label htmlFor="live-preview" className="text-sm cursor-pointer">Live Preview</Label>
              <Switch
                id="live-preview"
                checked={showLivePreview}
                onCheckedChange={setShowLivePreview}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} size="lg" className="bg-[#c9a962] hover:bg-[#b89952] text-black">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 lg:grid-cols-9 gap-1 h-auto mb-6">
            {pages.map((page) => (
              <TabsTrigger key={page.id} value={page.id} className="flex flex-col items-center gap-1 py-2 px-2 text-xs">
                <page.icon className="h-4 w-4" />
                <span className="hidden sm:inline truncate">{page.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {pages.map((page) => (
            <TabsContent key={page.id} value={page.id}>
              <div className={`grid gap-6 ${showLivePreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {/* Editor Panel */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <page.icon className="h-5 w-5 text-[#c9a962]" />
                      <h2 className="text-xl font-semibold text-[#1a1a1a]">{page.name} Page</h2>
                    </div>
                    <a 
                      href={previewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-[#c9a962] hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open in new tab
                    </a>
                  </div>
                  
                  <div className="max-h-[calc(100vh-300px)] overflow-y-auto pr-2">
                    {renderFormEditor(page.id)}
                  </div>
                </div>

                {/* Live Preview Panel */}
                {showLivePreview && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-[#c9a962]" />
                        <h2 className="text-xl font-semibold text-[#1a1a1a]">Live Preview</h2>
                        <Badge variant="outline" className="text-xs">Auto-refresh after save</Badge>
                      </div>
                    </div>
                    
                    <Card className="overflow-hidden">
                      <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-400" />
                          <div className="w-3 h-3 rounded-full bg-yellow-400" />
                          <div className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                        <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-500 truncate">
                          {previewUrl}
                        </div>
                      </div>
                      <div className="relative" style={{ height: 'calc(100vh - 380px)', minHeight: '500px' }}>
                        <iframe
                          key={`${activeTab}-${previewKey}`}
                          src={previewUrl}
                          className="w-full h-full border-0"
                          title={`Preview - ${page.name}`}
                        />
                      </div>
                    </Card>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        <strong>💡 Tip:</strong> Make your edits in the form fields, then click "Save All Changes" to see updates in the preview. 
                        Changes are saved to the database and will appear on the live website.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default ContentEditorPage;
