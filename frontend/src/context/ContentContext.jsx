import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Default content fallback (used when API hasn't loaded yet)
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
      { title: 'Customer Service', description: "Our team has years of award-winning tailoring experience and knowledge behind them." },
      { title: 'Fabrics', description: 'Our luxurious suiting fabrics come from the finest and most established mills in England and Italy.' },
      { title: 'A Great Fit', description: "We're committed to providing customers with a seamless fit and a garment they can truly call their own." },
      { title: '100+ Customisations', description: 'With multiple customisation options that run across each feature of our garments.' },
      { title: 'Quick Turnarounds', description: 'We manufacture and ship most custom clothing within a three week time period.' },
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
    vicunaContent: 'The most exceptional of our range of fabrics is vicuna.',
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
  },
  footer: {
    description: 'Private label custom Menswear manufacturer. Our construction and manufacturing is of the highest quality available today.',
    quickLinksTitle: 'Quick Links',
    contactTitle: 'Contact',
    copyright: '© 2025 Suits India. All rights reserved.',
  },
};

const ContentContext = createContext();

export const ContentProvider = ({ children }) => {
  const [content, setContent] = useState(defaultContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API_URL}/settings/all-content`);
      if (response.data && Object.keys(response.data).length > 0) {
        // Merge fetched content with defaults (fetched takes priority)
        setContent(prev => {
          const merged = { ...prev };
          Object.keys(response.data).forEach(key => {
            if (key !== 'updated_at' && key !== '_id') {
              merged[key] = { ...prev[key], ...response.data[key] };
            }
          });
          return merged;
        });
      }
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err);
      // Keep using default content on error
    } finally {
      setLoading(false);
    }
  };

  // Refresh content from API
  const refreshContent = () => {
    fetchContent();
  };

  // Get content for a specific page
  const getPageContent = (pageName) => {
    return content[pageName] || {};
  };

  return (
    <ContentContext.Provider value={{ content, loading, error, refreshContent, getPageContent }}>
      {children}
    </ContentContext.Provider>
  );
};

export const useContent = () => {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
};

export default ContentContext;
