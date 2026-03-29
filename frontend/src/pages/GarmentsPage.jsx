import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useContent } from '../context/ContentContext';
import {
  jacketFeatures,
  jacketDetails,
  shirtFeatures,
  shirtDetails,
  trouserFeatures,
  trouserDetails,
} from '../data/mock';

const GarmentSection = ({ title, ghostImage, overlayImage, features, details }) => {
  return (
    <div className="py-16">
      <h3 className="text-2xl font-serif text-[#1a1a1a] mb-8 text-center">{title}</h3>
      
      {/* Interactive Image Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="relative group">
          <img
            src={ghostImage}
            alt={title}
            className="w-full max-w-sm mx-auto"
          />
        </div>
        <div className="relative group">
          <img
            src={overlayImage}
            alt={`${title} overlay`}
            className="w-full max-w-sm mx-auto"
          />
        </div>
      </div>

      {/* Features List */}
      <div className="bg-[#f5f5f0] rounded-lg p-6 mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((feature) => (
            <div key={feature.number} className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-full bg-[#c9a962] text-white flex items-center justify-center text-sm font-medium">
                {feature.number}
              </span>
              <span className="text-sm text-[#666]">{feature.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-8">
        {details.map((detail, index) => (
          <div key={index} className="border-b border-[#e5e5e5] pb-8 last:border-b-0">
            <h4 className="text-xl font-semibold text-[#1a1a1a] mb-3">
              {detail.title}
            </h4>
            <p className="text-[#666] leading-relaxed">{detail.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const GarmentsPage = () => {
  const [activeTab, setActiveTab] = useState('jackets');
  const { getPageContent } = useContent();
  const content = getPageContent('garments');

  // Use API content or defaults
  const heroTitle = content.heroTitle || 'Individually made using your unique measurements, personalized to reflect your style.';
  const introTitle = content.introTitle || 'Our Garments';
  const introContent = content.introContent || "Our garments are defined by pairing classic, streamlined silhouettes with elevated details and Italian construction techniques. Each garment is cut to the client's individual measurements and personalised to reflect their style.";
  const jacketsIntro = content.jacketsIntro || 'Our jackets are created in the Neapolitan style, offering lightweight construction, refined finishing and comfort. Each piece is individually made to your measurements and personalised to reflect your style.';
  const shirtsIntro = content.shirtsIntro || 'Crafted out of the finest fabrics with precise detailing, our shirts carry timeless appeal.';
  const trousersIntro = content.trousersIntro || 'Versatile and enduring, our comfortable tailor-made trousers can be worn round the year.';

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/garments.jpg)',
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
      <section className="py-16 bg-[#f5f5f0]">
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

      {/* Garments Tabs */}
      <section className="py-16">
        <div className="container mx-auto px-4 lg:px-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full max-w-md mx-auto grid grid-cols-3 mb-12">
              <TabsTrigger value="jackets" className="text-sm">
                Our Jackets
              </TabsTrigger>
              <TabsTrigger value="shirts" className="text-sm">
                Our Shirts
              </TabsTrigger>
              <TabsTrigger value="trousers" className="text-sm">
                Our Trousers
              </TabsTrigger>
            </TabsList>

            <TabsContent value="jackets">
              <div className="max-w-4xl mx-auto">
                <p className="text-center text-[#666] leading-relaxed mb-8">
                  {jacketsIntro}
                </p>
                <GarmentSection
                  title=""
                  ghostImage="https://tailorstailor.in/wp-content/uploads/2022/02/ghost-suit2.jpg"
                  overlayImage="https://tailorstailor.in/wp-content/uploads/2022/02/jacketoverlay-new.jpg"
                  features={jacketFeatures}
                  details={jacketDetails}
                />
              </div>
            </TabsContent>

            <TabsContent value="shirts">
              <div className="max-w-4xl mx-auto">
                <p className="text-center text-[#666] leading-relaxed mb-8">
                  {shirtsIntro}
                </p>
                <GarmentSection
                  title=""
                  ghostImage="https://tailorstailor.in/wp-content/uploads/2022/02/ghost-shirt.jpg"
                  overlayImage="https://tailorstailor.in/wp-content/uploads/2022/02/shirt-overlay.jpg"
                  features={shirtFeatures}
                  details={shirtDetails}
                />
              </div>
            </TabsContent>

            <TabsContent value="trousers">
              <div className="max-w-4xl mx-auto">
                <p className="text-center text-[#666] leading-relaxed mb-8">
                  {trousersIntro}
                </p>
                <GarmentSection
                  title=""
                  ghostImage="https://tailorstailor.in/wp-content/uploads/2022/02/ghost-trouser.jpg"
                  overlayImage="https://tailorstailor.in/wp-content/uploads/2022/02/trouser-construction.jpg"
                  features={trouserFeatures}
                  details={trouserDetails}
                />
              </div>
            </TabsContent>
          </Tabs>
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

export default GarmentsPage;
