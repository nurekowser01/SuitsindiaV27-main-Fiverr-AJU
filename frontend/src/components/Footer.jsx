import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import { useContent } from '../context/ContentContext';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const Footer = () => {
  const { getPageContent } = useContent();
  const footerContent = getPageContent('footer');
  const contactContent = getPageContent('contact-us');

  // Get contact info from API or use defaults
  const phone = contactContent.phone || '+91 9446373329';
  const email = contactContent.email || 'aju@suitsindia.in';
  const whatsappNumber = phone.replace(/[\s-]/g, '');

  return (
    <footer className="bg-[#1a1a1a] text-white">
      <div className="container mx-auto px-4 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <div className="bg-white rounded-lg p-3 shadow-md inline-block">
                <img 
                  src={LOGO_URL} 
                  alt="Suits India" 
                  className="h-20 w-auto object-contain"
                />
              </div>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed max-w-md mt-4">
              {footerContent.description || 'Private label custom Menswear manufacturer. Our construction and manufacturing is of the highest quality available today. We are committed to providing our customers with world class tailoring and exceptional service.'}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[#c9a962] font-medium mb-4 tracking-wide">
              {footerContent.quickLinksTitle || 'Quick Links'}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-white/60 hover:text-[#c9a962] text-sm transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/garments" className="text-white/60 hover:text-[#c9a962] text-sm transition-colors">
                  Garments
                </Link>
              </li>
              <li>
                <Link to="/fabrics" className="text-white/60 hover:text-[#c9a962] text-sm transition-colors">
                  Fabrics
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-white/60 hover:text-[#c9a962] text-sm transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-[#c9a962] font-medium mb-4 tracking-wide">
              {footerContent.contactTitle || 'Contact'}
            </h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href={`tel:${phone}`} 
                  className="text-white/60 hover:text-[#c9a962] text-sm transition-colors"
                >
                  {phone}
                </a>
              </li>
              <li>
                <a 
                  href={`mailto:${email}`} 
                  className="text-white/60 hover:text-[#c9a962] text-sm transition-colors"
                >
                  {email}
                </a>
              </li>
              <li>
                <a
                  href="https://calendly.com/aju-omjw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/60 hover:text-[#c9a962] text-sm transition-colors"
                >
                  Book Appointment
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social & Copyright */}
        <div className="border-t border-white/10 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-4 mb-4 md:mb-0">
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-[#c9a962] hover:text-[#c9a962] transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-[#c9a962] hover:text-[#c9a962] transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
          </div>
          <p className="text-white/40 text-sm">
            {footerContent.copyright || `© ${new Date().getFullYear()} Suits India. All rights reserved.`}
          </p>
        </div>
      </div>

      {/* WhatsApp Floating Button */}
      <a
        href={`https://api.whatsapp.com/send?phone=${whatsappNumber}&text=Hello`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
      >
        <MessageCircle className="w-7 h-7 text-white fill-white" />
      </a>
    </footer>
  );
};

export default Footer;
