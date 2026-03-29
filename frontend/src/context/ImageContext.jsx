import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Default image settings
const defaultImageSettings = {
  home: {
    hero: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/hero.jpg', title: 'STYLE APP', subtitle: 'DESIGN AND ORDER CUSTOM', highlight: 'MADE-TO-MEASURE SUITS AT EASE' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/hero2.jpg', title: 'CUSTOM', subtitle: 'Private Label Wholesale', highlight: '' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/ongoing.jpg', title: 'LUXURIOUS', subtitle: 'FABRICS TO CHOOSE FROM', highlight: '' },
    ],
    displayMode: 'carousel',
    activeHeroIndex: 0,
    carouselImages: [0, 1, 2],
  },
  about: {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/about.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
  garments: {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/garments.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
  fabrics: {
    hero: [
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/dna.jpg', title: 'BIELLA', subtitle: 'THE WOOL CITY' },
      { url: 'https://tailorstailor.in/wp-content/uploads/2022/02/vicuna.jpg', title: 'VICUÑA', subtitle: 'A PRECIOUS FABRIC' },
    ],
    displayMode: 'carousel',
    activeHeroIndex: 0,
    carouselImages: [0, 1],
  },
  technology: {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/technology.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
  'how-it-works': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/how-it-works.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
  'get-started': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/get-started.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
  'trunk-show': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/trunkshow.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
  'contact-us': {
    hero: [{ url: 'https://tailorstailor.in/wp-content/uploads/2022/02/sign-up.jpg' }],
    displayMode: 'individual',
    activeHeroIndex: 0,
  },
};

const ImageContext = createContext();

export const ImageProvider = ({ children }) => {
  const [imageSettings, setImageSettings] = useState(defaultImageSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchImageSettings();
  }, []);

  const fetchImageSettings = async () => {
    try {
      // Fetch from public endpoint (no auth required)
      const response = await axios.get(`${API_URL}/settings/all-images/public`);
      if (response.data && Object.keys(response.data).length > 0) {
        // Merge fetched settings with defaults
        const merged = { ...defaultImageSettings };
        Object.keys(response.data).forEach(pageId => {
          if (pageId !== 'updated_at' && pageId !== '_id') {
            merged[pageId] = { ...defaultImageSettings[pageId], ...response.data[pageId] };
          }
        });
        setImageSettings(merged);
      }
    } catch (err) {
      console.error('Error fetching image settings:', err);
      // Keep using defaults on error
    } finally {
      setLoading(false);
    }
  };

  // Get image settings for a specific page
  const getPageImageSettings = (pageName) => {
    return imageSettings[pageName] || {};
  };

  // Get hero images for a page based on display mode
  const getHeroImages = (pageName) => {
    const pageSettings = imageSettings[pageName] || {};
    const displayMode = pageSettings.displayMode || 'carousel';
    const heroImages = pageSettings.hero || [];
    const activeIndex = pageSettings.activeHeroIndex || 0;
    const carouselIndices = pageSettings.carouselImages || [];

    if (displayMode === 'individual') {
      // Return only the active image
      if (heroImages.length > activeIndex) {
        return {
          displayMode: 'individual',
          images: [heroImages[activeIndex]]
        };
      }
      return { displayMode: 'individual', images: heroImages.slice(0, 1) };
    } else {
      // Carousel mode
      if (carouselIndices.length >= 2) {
        const carouselImages = carouselIndices
          .filter(i => i < heroImages.length)
          .map(i => heroImages[i]);
        return { displayMode: 'carousel', images: carouselImages };
      }
      // Fallback to all images if carousel indices not set properly
      return { displayMode: 'carousel', images: heroImages };
    }
  };

  return (
    <ImageContext.Provider value={{ 
      imageSettings, 
      loading, 
      getPageImageSettings, 
      getHeroImages,
      refreshImageSettings: fetchImageSettings 
    }}>
      {children}
    </ImageContext.Provider>
  );
};

export const useImages = () => {
  const context = useContext(ImageContext);
  if (!context) {
    throw new Error('useImages must be used within an ImageProvider');
  }
  return context;
};

export default ImageContext;
