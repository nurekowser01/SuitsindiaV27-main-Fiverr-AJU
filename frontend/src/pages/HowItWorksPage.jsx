import React from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { useContent } from '../context/ContentContext';
import { howItWorksSteps as defaultSteps } from '../data/mock';

const HowItWorksPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('how-it-works');

  // Use API content or defaults
  const heroTitle = content.heroTitle || 'The Bespoke Experience';
  const introTitle = content.introTitle || 'How it Works';
  const introContent1 = content.introContent1 || "If you aren't already a custom clothier, do you have aspirations of owning your own home-based business? Do you love men's fashion and have a great network but you're inexperienced when it comes to tailoring?";
  const introContent2 = content.introContent2 || "Suits India has the experience, knowledge and customer service. Our prices are competitive and our quality is unmatched.";
  const introContent3 = content.introContent3 || "If you're new to tailoring but have the desire and drive to start a full time or side business, our team will help you. We'll show you how to measure, the various garment styles and options, and teach you how to order.";
  const processTitle = content.processTitle || "Here's a quick glimpse of our process";
  
  // Use API steps or defaults, merging with image URLs from defaults
  const steps = (content.steps || defaultSteps).map((step, index) => ({
    ...step,
    id: index + 1,
    image: defaultSteps[index]?.image || step.image,
    points: step.points || defaultSteps[index]?.points || [],
  }));

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/how-it-works.jpg)',
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
          <div className="max-w-3xl mx-auto">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4 text-center">
              {introTitle}
            </h4>
            <p className="text-[#666] leading-relaxed mb-6">
              {introContent1}
            </p>
            <p className="text-[#666] leading-relaxed mb-6">
              {introContent2}
            </p>
            <p className="text-[#666] leading-relaxed">
              {introContent3}
            </p>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="text-center mb-16">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {processTitle}
            </h4>
          </div>

          <div className="space-y-20">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? '' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
                    {step.title}
                  </h4>
                  <p className="text-[#666] leading-relaxed mb-6">
                    {step.description}
                  </p>
                  {step.points && step.points.length > 0 && (
                    <ul className="space-y-3">
                      {step.points.map((point, pointIndex) => (
                        <li key={pointIndex} className="flex items-start">
                          <span className="w-2 h-2 bg-[#c9a962] rounded-full mt-2 mr-3 flex-shrink-0" />
                          <span className="text-[#666] text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <img
                    src={step.image}
                    alt={step.title}
                    className="w-full rounded-lg shadow-xl"
                  />
                </div>
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

export default HowItWorksPage;
