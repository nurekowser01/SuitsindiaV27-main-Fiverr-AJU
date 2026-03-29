import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Shirt, Ruler, Settings, Clock } from 'lucide-react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import HeroCarousel from '../components/HeroCarousel';
import ProductCarousel from '../components/ProductCarousel';
import { Button } from '../components/ui/button';
import { useContent } from '../context/ContentContext';
import { useImages } from '../context/ImageContext';
import {
  heroSlides as defaultHeroSlides,
  productLine,
} from '../data/mock';

const iconMap = {
  users: Users,
  shirt: Shirt,
  ruler: Ruler,
  settings: Settings,
  clock: Clock,
};

// Default values for when API hasn't loaded
const defaultWhyChooseUs = [
  { id: 1, title: 'Customer Service', description: "Our team has years of award-winning tailoring experience and knowledge behind them.", icon: 'users' },
  { id: 2, title: 'Fabrics', description: 'Our luxurious suiting fabrics come from the finest and most established mills in England and Italy.', icon: 'shirt' },
  { id: 3, title: 'A Great Fit', description: "We're committed to providing customers with a seamless fit and a garment they can truly call their own.", icon: 'ruler' },
  { id: 4, title: '100+ Customisations', description: 'With multiple customisation options that run across each feature of our garments.', icon: 'settings' },
  { id: 5, title: 'Quick Turnarounds', description: 'We manufacture and ship most custom clothing within a three week time period.', icon: 'clock' },
];

const defaultStyleAppFeatures = [
  'Choose from hundreds of luxurious fabrics from the finest mills in the world.',
  'Design and configure your garment with an endless array of customisation options.',
  'Manage your clients and keep their measurements in one place.',
  'Create Personal Racks.',
];

const HomePage = () => {
  const { getPageContent } = useContent();
  const { getHeroImages, getPageImageSettings } = useImages();
  const homeContent = getPageContent('home');
  
  // Get hero images from ImageContext (respects display mode setting)
  const heroData = getHeroImages('home');
  const imageSettings = getPageImageSettings('home');

  // Use API content or fallback to defaults
  const whyChooseUs = homeContent.whyChooseUs || defaultWhyChooseUs;
  const styleAppFeatures = homeContent.styleAppFeatures || defaultStyleAppFeatures;
  const whyChooseUsTitle = homeContent.whyChooseUsTitle || 'Why Suits India ?';
  const styleAppTitle = homeContent.styleAppTitle || 'Explore StyleApp';
  const productLineTitle = homeContent.productLineTitle || 'Product Line';
  const productLineSubtitle = homeContent.productLineSubtitle || 'Our construction and manufacturing is of the highest quality available today. We are committed to providing our customers with world class tailoring and exceptional service.';
  const ctaButtonText = homeContent.ctaButtonText || 'Get Started';

  // Prepare hero slides - merge image data with content data
  const prepareHeroSlides = () => {
    // Get images from ImageContext
    const images = heroData.images || [];
    
    // Get text content from ContentContext - this is the primary source for text
    const textSlides = homeContent.heroSlides || [];
    
    // Merge them together - prioritize content editor text, use images for URLs
    const slides = images.map((img, index) => ({
      id: index + 1,
      image: img.url || defaultHeroSlides[index]?.image || defaultHeroSlides[0]?.image,
      // Text content from Content Editor takes priority over image metadata
      title: textSlides[index]?.title ?? img.title ?? defaultHeroSlides[index]?.title ?? '',
      subtitle: textSlides[index]?.subtitle ?? img.subtitle ?? defaultHeroSlides[index]?.subtitle ?? '',
      highlight: textSlides[index]?.highlight ?? img.highlight ?? defaultHeroSlides[index]?.highlight ?? '',
      cta: textSlides[index]?.cta || 'Book Appointment',
      ctaLink: textSlides[index]?.ctaLink || 'https://calendly.com/aju-omjw',
    }));

    // If no slides from API, use defaults
    if (slides.length === 0) {
      return defaultHeroSlides;
    }

    return slides;
  };

  const finalHeroSlides = prepareHeroSlides();
  const displayMode = heroData.displayMode || imageSettings.displayMode || 'carousel';

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Carousel - passes displayMode to control individual vs carousel */}
      <HeroCarousel slides={finalHeroSlides} displayMode={displayMode} />

      {/* Product Line Carousel */}
      <ProductCarousel
        products={productLine}
        title={productLineTitle}
        subtitle={productLineSubtitle}
      />

      {/* Why Suits India Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-serif text-[#1a1a1a] mb-4">
              {whyChooseUsTitle}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseUs.map((item, index) => {
              const Icon = iconMap[item.icon] || Users;
              return (
                <div
                  key={item.id || index}
                  className="group p-8 rounded-lg hover:bg-[#f5f5f0] transition-all duration-300"
                >
                  <div className="w-14 h-14 rounded-full bg-[#c9a962]/10 flex items-center justify-center mb-6 group-hover:bg-[#c9a962]/20 transition-colors">
                    <Icon className="w-6 h-6 text-[#c9a962]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#1a1a1a] mb-3">
                    {item.title}
                  </h3>
                  <p className="text-[#666] leading-relaxed text-sm">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="text-center mt-12">
            <Link to="/contact-us">
              <Button
                size="lg"
                className="bg-[#1a1a1a] hover:bg-[#333] text-white font-medium px-10"
              >
                {ctaButtonText}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* StyleApp Section */}
      <section className="py-20 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img
                  src="https://tailorstailor.in/wp-content/uploads/2022/02/style-app.png"
                  alt="StyleApp"
                  className="w-full max-w-md mx-auto"
                />
              </div>
            </div>

            {/* Content */}
            <div className="order-1 lg:order-2 text-white">
              <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-3">
                {styleAppTitle}
              </h4>
              <ul className="space-y-4 mb-8">
                {styleAppFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <span className="w-2 h-2 bg-[#c9a962] rounded-full mt-2 mr-3 flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/how-it-works">
                  <Button
                    variant="outline"
                    className="border-[#c9a962] text-[#c9a962] hover:bg-[#c9a962] hover:text-black"
                  >
                    See how it works
                  </Button>
                </Link>
                <a
                  href="https://calendly.com/aju-omjw"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-[#c9a962] hover:bg-[#b89952] text-black">
                    Book appointment
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;
