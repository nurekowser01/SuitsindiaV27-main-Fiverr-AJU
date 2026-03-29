import React from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useContent } from '../context/ContentContext';
import { aboutContent as defaultAboutContent } from '../data/mock';

const AboutPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('about');

  // Merge API content with defaults
  const heroTitle = content.heroTitle || 'We believe every garment should tell a story, therefore we offer complete customization to create a look that tells yours.';
  const storyTitle = content.storyTitle || defaultAboutContent.story.title;
  const storyContent = content.storyContent || defaultAboutContent.story.content;
  const craftsmanshipTitle = content.craftsmanshipTitle || defaultAboutContent.craftsmanship.title;
  const craftsmanshipContent = content.craftsmanshipContent || defaultAboutContent.craftsmanship.content;
  const uspTitle = content.uspTitle || 'Our USP';
  const usp = content.usp || defaultAboutContent.usp;

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/about.jpg)',
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

      {/* Our Story Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {storyTitle}
            </h4>
            <div className="prose prose-lg max-w-none">
              {storyContent.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-[#666] leading-relaxed mb-6">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Craftsmanship Section */}
      <section className="py-20 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
                {craftsmanshipTitle}
              </h4>
              <p className="text-[#666] leading-relaxed">
                {craftsmanshipContent}
              </p>
            </div>
            <div className="relative">
              <img
                src={defaultAboutContent.craftsmanship.image}
                alt="Craftsmanship"
                className="w-full rounded-lg shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* USP Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-12">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {uspTitle}
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {usp.map((item, index) => (
              <div
                key={index}
                className="p-6 border border-[#e5e5e5] rounded-lg hover:border-[#c9a962] transition-colors"
              >
                <h3 className="text-lg font-semibold text-[#1a1a1a] mb-3">
                  {item.title}
                </h3>
                <p className="text-[#666] text-sm leading-relaxed">
                  {item.description}
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

export default AboutPage;
