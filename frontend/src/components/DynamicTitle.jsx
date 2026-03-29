import { useEffect, useState } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

/**
 * DynamicTitle Component
 * Fetches site branding from marketing settings and updates the document title
 */
const DynamicTitle = () => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await axios.get(`${API_URL}/marketing/settings`);
        const { site_name, site_tagline, seo_description } = response.data;
        
        // Update document title
        if (site_name || site_tagline) {
          const title = site_tagline 
            ? `${site_name || 'Suits India'} | ${site_tagline}`
            : site_name || 'Suits India';
          document.title = title;
        }
        
        // Update meta description
        if (seo_description) {
          let metaDesc = document.querySelector('meta[name="description"]');
          if (metaDesc) {
            metaDesc.setAttribute('content', seo_description);
          }
        }
        
        setLoaded(true);
      } catch (error) {
        console.log('Could not fetch branding settings, using defaults');
        setLoaded(true);
      }
    };

    fetchBranding();
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default DynamicTitle;
