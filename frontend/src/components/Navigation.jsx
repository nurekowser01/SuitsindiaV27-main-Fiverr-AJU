import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronDown, User } from 'lucide-react';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from './ui/sheet';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Garments', path: '/garments' },
    { name: 'Fabrics', path: '/fabrics' },
    { name: 'Technology', path: '/technology' },
    { name: 'How It Works', path: '/how-it-works' },
    { name: 'Get Started', path: '/get-started' },
    { name: 'Trunk Show', path: '/trunk-show' },
    { name: 'Contact Us', path: '/contact-us' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#1a1a1a]/95 backdrop-blur-md shadow-lg py-2'
          : 'bg-transparent py-4'
      }`}
    >
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={LOGO_URL} 
              alt="Suits India" 
              className="h-12 lg:h-14 w-auto object-contain brightness-0 invert"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors ${
                  isActive(link.path)
                    ? 'text-[#c9a962]'
                    : 'text-white/80 hover:text-[#c9a962]'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Buttons - Desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            <Link to="/login">
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                <User className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
            <a
              href="https://calendly.com/aju-omjw"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                className="bg-[#c9a962] hover:bg-[#b89952] text-black font-medium px-6"
              >
                Book Appointment
              </Button>
            </a>
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" className="text-white">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-[#1a1a1a] border-[#333] w-[300px]">
              <div className="flex flex-col space-y-6 mt-8">
                <Link to="/" className="flex items-center mb-4" onClick={() => setMobileOpen(false)}>
                  <div className="bg-white rounded-lg p-2 shadow-md">
                    <img 
                      src={LOGO_URL} 
                      alt="Suits India" 
                      className="h-12 w-auto object-contain"
                    />
                  </div>
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`text-base font-medium tracking-wide transition-colors ${
                      isActive(link.path)
                        ? 'text-[#c9a962]'
                        : 'text-white/80 hover:text-[#c9a962]'
                    }`}
                  >
                    {link.name}
                  </Link>
                ))}
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="mt-4"
                >
                  <Button
                    variant="outline"
                    className="w-full border-white/30 text-white hover:bg-white/10"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                </Link>
                <a
                  href="https://calendly.com/aju-omjw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    className="w-full bg-[#c9a962] hover:bg-[#b89952] text-black font-medium"
                  >
                    Book Appointment
                  </Button>
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
