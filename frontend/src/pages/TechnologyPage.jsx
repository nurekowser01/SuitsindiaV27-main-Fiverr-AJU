import React from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useContent } from '../context/ContentContext';
import { technologyFeatures as defaultTechnologyFeatures } from '../data/mock';

const TechnologyPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('technology');

  // Use API content or defaults
  const heroTitle = content.heroTitle || 'Collaborate with your clients to achieve the Bespoke Look they want';
  const introTitle = content.introTitle || 'Our Fabrics';
  const introContent = content.introContent || 'Our fabrics are sourced from some of the finest weaving mills in Europe renowned for their high performance and quality. Each season, we select a new offering of hand-picked fabrics for your choosing. Here is a list of a few of our fabric partnerships.';
  
  // Use API features or default, but ensure images from defaults
  const technologyFeatures = (content.features || defaultTechnologyFeatures).map((feature, index) => ({
    ...feature,
    image: defaultTechnologyFeatures[index]?.image || feature.image,
  }));

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/technology.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif leading-relaxed">
              {heroTitle}
            </h1>
          </div>
        </div>
      </section>

      {/* Fabrics Intro */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {introTitle}
            </h4>
            <p className="text-[#666] leading-relaxed">
              {introContent}
            </p>
          </div>
        </div>
      </section>

      {/* Technology Features */}
      <section className="py-20 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          {technologyFeatures.map((feature, index) => (
            <div
              key={index}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20 last:mb-0 ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
                  {feature.title}
                </h4>
                <p className="text-[#666] leading-relaxed">
                  {feature.description}
                </p>
              </div>
              <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="w-full rounded-lg shadow-xl"
                />
              </div>
            </div>
          ))}
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

export default TechnologyPage;
