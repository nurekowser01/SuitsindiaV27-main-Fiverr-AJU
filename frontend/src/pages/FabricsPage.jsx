import React, { useState, useEffect, useCallback } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { fabricMills, fabricPartners } from '../data/mock';

const FabricsPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('fabrics');

  // Use API content or defaults
  const introTitle = content.introTitle || 'Our Fabrics';
  const introContent = content.introContent || 'Our fabrics are sourced from some of the finest weaving mills in Europe renowned for their high performance and quality. Each season, we select a new offering of hand-picked fabrics for your choosing. Here is a list of a few of our fabric partnerships.';
  const vicunaTitle = content.vicunaTitle || 'VICUÑA';
  const vicunaContent = content.vicunaContent || 'The most exceptional of our range of fabrics is vicuna. Found only in the high Andes, the vicuna is a rare species that produces an even rarer fibre. A vicuna can only be sheared every two years, making production extremely limited in supply. When spun, its golden-brown fleece is extremely soft and fine with unmatched beauty and luster. A precious fabric, vicuna was sacred to the Incas and worn ceremoniously by Emperors. Today, the exclusiveness of this fabric remains, as does the prestige it carries.';

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const heroSlides = [
    {
      title: 'BIELLA',
      subtitle: 'THE WOOL CITY',
      image: 'https://tailorstailor.in/wp-content/uploads/2022/02/dna.jpg',
    },
    {
      title: 'VICUÑA',
      subtitle: 'A PRECIOUS FABRIC',
      image: 'https://tailorstailor.in/wp-content/uploads/2022/02/vicuna.jpg',
    },
  ];

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, heroSlides.length]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, heroSlides.length]);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Carousel */}
      <section className="relative h-[70vh] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-500 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${slide.image})` }}
            >
              <div className="absolute inset-0 bg-black/60" />
            </div>
            <div className="relative z-10 h-full flex items-center justify-center text-center text-white">
              <div>
                <h2 className="text-4xl md:text-6xl font-serif font-semibold mb-2">
                  {slide.title}
                </h2>
                <p className="text-lg md:text-xl tracking-[0.3em] text-[#c9a962]">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white/60 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white/60 hover:text-white transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-3">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-[#c9a962] w-8'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </section>

      {/* Our Fabrics Intro */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {introTitle}
            </h4>
            <p className="text-[#666] leading-relaxed">
              {introContent}
            </p>
          </div>

          {/* Map and Swatch Images */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <img
              src="https://tailorstailor.in/wp-content/uploads/2022/02/map.jpg"
              alt="Fabric Map"
              className="w-full rounded-lg shadow-lg"
            />
            <img
              src="https://tailorstailor.in/wp-content/uploads/2022/02/swatch.jpg"
              alt="Fabric Swatch"
              className="w-full rounded-lg shadow-lg"
            />
            <img
              src="https://tailorstailor.in/wp-content/uploads/2022/02/vicuna-1.jpg"
              alt="Vicuna"
              className="w-full rounded-lg shadow-lg"
            />
          </div>
        </div>
      </section>

      {/* Vicuna Section */}
      <section className="py-20 bg-[#1a1a1a] text-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {vicunaTitle}
            </h4>
            <p className="text-white/80 leading-relaxed">
              {vicunaContent}
            </p>
          </div>
        </div>
      </section>

      {/* Mill Partners Carousel */}
      <section className="py-16 bg-white overflow-hidden">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex overflow-x-auto gap-8 pb-4 scrollbar-hide">
            {[...fabricMills, ...fabricMills].map((mill, index) => (
              <div
                key={index}
                className="flex-shrink-0 w-40 h-24 flex items-center justify-center"
              >
                <img
                  src={mill.image}
                  alt={mill.name}
                  className="max-w-full max-h-full object-contain grayscale hover:grayscale-0 transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fabric Partners Details */}
      <section className="py-20 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {fabricPartners.map((partner, index) => (
              <div
                key={index}
                className="bg-white p-8 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-1">
                  {partner.name}
                </h3>
                <p className="text-[#c9a962] text-sm mb-4">{partner.type}</p>
                <p className="text-[#666] text-sm leading-relaxed">
                  {partner.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#1a1a1a]">
        <div className="container mx-auto px-4 lg:px-8 text-center">
          <a
            href="https://calendly.com/aju-omjw"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              className="bg-[#c9a962] hover:bg-[#b89952] text-black font-medium px-10"
            >
              Book appointment
            </Button>
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default FabricsPage;
