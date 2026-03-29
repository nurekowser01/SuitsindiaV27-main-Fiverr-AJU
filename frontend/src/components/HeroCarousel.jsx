import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';

const HeroCarousel = ({ slides, displayMode = 'carousel' }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const nextSlide = useCallback(() => {
    if (isAnimating || slides.length <= 1) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, slides.length]);

  const prevSlide = useCallback(() => {
    if (isAnimating || slides.length <= 1) return;
    setIsAnimating(true);
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating, slides.length]);

  useEffect(() => {
    // Only auto-rotate in carousel mode with multiple slides
    if (displayMode === 'carousel' && slides.length > 1) {
      const timer = setInterval(nextSlide, 5000);
      return () => clearInterval(timer);
    }
  }, [nextSlide, displayMode, slides.length]);

  // If individual mode or only one slide, show just the first slide without controls
  const showControls = displayMode === 'carousel' && slides.length > 1;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id || index}
          className={`absolute inset-0 transition-opacity duration-500 ${
            index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
          }`}
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${slide.image || slide.url})`,
            }}
          >
            <div className="absolute inset-0 bg-black/50" />
          </div>

          {/* Content */}
          <div className="relative z-10 h-full flex items-center justify-center text-center text-white px-4">
            <div className="max-w-3xl">
              <h3 className="text-lg md:text-xl tracking-[0.3em] text-[#c9a962] font-light mb-4">
                {slide.title}
              </h3>
              <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-light mb-2 leading-tight">
                {slide.subtitle}
              </h2>
              {slide.highlight && (
                <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif font-semibold mb-8 leading-tight">
                  {slide.highlight}
                </h2>
              )}
              <a
                href={slide.ctaLink || 'https://calendly.com/aju-omjw'}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  className="bg-[#c9a962] hover:bg-[#b89952] text-black font-medium px-10 py-6 text-base tracking-wide"
                >
                  {slide.cta || 'Book Appointment'}
                </Button>
              </a>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows - Only show in carousel mode with multiple slides */}
      {showControls && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            aria-label="Next slide"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      {/* Dots - Only show in carousel mode with multiple slides */}
      {showControls && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isAnimating) {
                  setIsAnimating(true);
                  setCurrentSlide(index);
                  setTimeout(() => setIsAnimating(false), 500);
                }
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentSlide
                  ? 'bg-[#c9a962] w-8'
                  : 'bg-white/40 hover:bg-white/60'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;
