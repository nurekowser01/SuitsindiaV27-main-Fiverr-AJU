import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import { useContent } from '../context/ContentContext';

const GetStartedPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('get-started');

  // Use API content or defaults
  const heroTitle = content.heroTitle || 'Become A PARTNER';
  const introTitle = content.introTitle || 'Get Started';
  const introContent = content.introContent || "If you're ready to partner with a private label clothing manufacturer that can offer the latest technology and deliver world-class clothing for your clients, please contact us. Use the form below to get started.";
  const formTitle = content.formTitle || 'Request more Information';
  const smsConsent = content.smsConsent || 'You are agreeing to receive SMS from Suits India. Message frequency may vary. Standard Message and Data Rates may apply. Reply STOP to opt out. Reply Help for help. Consent is not a condition of purchase.';
  const emailConsent = content.emailConsent || 'You are agreeing to emails from Suits India. Message frequency may vary. Reply STOP to opt out. Reply Help for help. Consent is not a condition of purchase.';
  const submitButton = content.submitButton || 'Submit Query';

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
    agreeSms: false,
    agreeEmail: false,
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name, checked) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    toast.success('Thank you! We will get back to you soon.');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      message: '',
      agreeSms: false,
      agreeEmail: false,
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[60vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/get-started.jpg)',
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

      {/* Form Section */}
      <section className="py-20 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-8 text-center">
              {formTitle}
            </h4>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="bg-white border-[#e5e5e5] focus:border-[#c9a962]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="bg-white border-[#e5e5e5] focus:border-[#c9a962]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="bg-white border-[#e5e5e5] focus:border-[#c9a962]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="bg-white border-[#e5e5e5] focus:border-[#c9a962]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">
                  Tell us a little about yourself
                  <span className="text-[#999] text-sm ml-2">
                    {formData.message.length} / 180
                  </span>
                </Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  maxLength={180}
                  rows={4}
                  className="bg-white border-[#e5e5e5] focus:border-[#c9a962]"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeSms"
                    checked={formData.agreeSms}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange('agreeSms', checked)
                    }
                  />
                  <label htmlFor="agreeSms" className="text-sm text-[#666] leading-relaxed">
                    {smsConsent}
                  </label>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeEmail"
                    checked={formData.agreeEmail}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange('agreeEmail', checked)
                    }
                  />
                  <label htmlFor="agreeEmail" className="text-sm text-[#666] leading-relaxed">
                    {emailConsent}
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-[#c9a962] hover:bg-[#b89952] text-black font-medium py-6"
              >
                {loading ? 'Submitting...' : submitButton}
              </Button>
            </form>
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

export default GetStartedPage;
