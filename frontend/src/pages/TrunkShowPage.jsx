import React from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useContent } from '../context/ContentContext';
import { trunkShowCities, trunkShowProcess } from '../data/mock';

const TrunkShowPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('trunk-show');

  // Use API content or defaults
  const heroTitle = content.heroTitle || "We'll be in your CITY soon";
  const introTitle = content.introTitle || 'Trunkshow';
  const introContent = content.introContent || "We travel throughout the year and regularly visit the world's major cities. Click below to sign up for our next visit to your city. If you'd like us to visit your company, please email us for information about our corporate packages.";
  const scheduleTitle = content.scheduleTitle || 'Our traveling schedule:';
  const processTitle = content.processTitle || 'Process';

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/trunkshow.jpg)',
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

      {/* Intro Section */}
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

      {/* Cities Grid */}
      <section className="py-20 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {scheduleTitle}
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {trunkShowCities.map((city, index) => (
              <div
                key={index}
                className="bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative h-48">
                  <img
                    src={city.image}
                    alt={city.city}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <h3 className="text-white text-xl font-semibold">
                      {city.city}, {city.country}
                    </h3>
                  </div>
                </div>
                <div className="p-6">
                  <h4 className="text-[#c9a962] font-medium mb-2">
                    {city.venue}
                  </h4>
                  <p className="text-[#666] text-sm mb-4">{city.address}</p>
                  <p className="text-[#1a1a1a] font-medium text-sm mb-2">
                    {city.date}
                  </p>
                  <p className="text-[#666] text-sm">
                    <span className="font-medium">Contact</span>
                    <br />
                    {city.contact}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-8 text-center">
              {processTitle}
            </h4>
            <div className="space-y-6">
              {trunkShowProcess.map((step, index) => (
                <div key={index} className="flex items-start">
                  <span className="w-8 h-8 rounded-full bg-[#c9a962] text-white flex items-center justify-center text-sm font-medium flex-shrink-0 mr-4">
                    {index + 1}
                  </span>
                  <p className="text-[#666] leading-relaxed pt-1">{step}</p>
                </div>
              ))}
            </div>
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

export default TrunkShowPage;
