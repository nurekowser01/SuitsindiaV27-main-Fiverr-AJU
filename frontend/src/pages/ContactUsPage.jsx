import React, { useState } from 'react';
import Navigation from '../components/Navigation';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Phone, Mail, MessageCircle, Send } from 'lucide-react';
import { useContent } from '../context/ContentContext';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const ContactUsPage = () => {
  const { getPageContent } = useContent();
  const content = getPageContent('contact-us');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  // Extract phone number for WhatsApp (remove spaces and dashes)
  const whatsappNumber = (content.phone || '').replace(/[\s-]/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/pages/contact/submit`, formData);
      toast.success('Your query has been submitted successfully!');
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      toast.error('Failed to submit query. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0]">
      <Navigation />

      {/* Hero Section with Background Image */}
      <section 
        className="pt-32 pb-20 text-white relative min-h-[50vh] flex items-center"
        style={{
          backgroundImage: 'url(https://tailorstailor.in/wp-content/uploads/2022/02/sign-up.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif leading-relaxed">
              {content.heroTitle || 'Need HELP?'}
            </h1>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h4 className="text-[#c9a962] text-sm tracking-[0.2em] uppercase mb-4">
              {content.introTitle || "We're here to Help"}
            </h4>
            <p className="text-[#666] leading-relaxed">
              {content.introContent || "Because we believe that tailoring is a people's business, you'll get unparalled service and support for your private label custom clothing business from us at Suits India"}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form & Info Section */}
      <section className="py-16 bg-[#f5f5f0]">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            
            {/* Contact Form */}
            <div className="bg-white p-8 rounded-lg shadow-sm">
              <h3 className="text-2xl font-semibold text-[#1a1a1a] mb-6">Send us a Message</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="How can we help?"
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us about your inquiry..."
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    required
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-[#c9a962] hover:bg-[#b89952] text-black"
                  disabled={submitting}
                >
                  {submitting ? 'Sending...' : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              {/* India Office */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#c9a962]/10 flex items-center justify-center mr-4">
                    <Phone className="w-5 h-5 text-[#c9a962]" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-[#c9a962] uppercase tracking-wide">India Office</span>
                    <a
                      href={`tel:${content.phone || '+91 9446373329'}`}
                      className="block text-xl font-semibold text-[#1a1a1a] hover:text-[#c9a962] transition-colors"
                    >
                      {content.phone || '+91 9446373329'}
                    </a>
                  </div>
                </div>
                <div className="space-y-1 mb-4 pl-16">
                  <p className="text-[#1a1a1a] font-medium">
                    {content.companyName || 'Suits India Private Ltd.'}
                  </p>
                  <p className="text-[#666] text-sm">
                    {content.address1 || '15/773, Karanjikudy'}
                  </p>
                  <p className="text-[#666] text-sm">
                    {content.address2 || 'Thottungal Lane, Perumbavoor'}
                  </p>
                  <p className="text-[#666] text-sm">
                    {content.city || 'Kochi, Kerala, India'}
                  </p>
                </div>
                <div className="pl-16">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${whatsappNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button className="bg-[#25D366] hover:bg-[#20c05c] text-white">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp Us
                    </Button>
                  </a>
                </div>
              </div>

              {/* US Sales Partner */}
              {(content.usPhone || content.usCompanyName) && (
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mr-4">
                      <Phone className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">US Sales Partner</span>
                      <a
                        href={`tel:${content.usPhone || ''}`}
                        className="block text-xl font-semibold text-[#1a1a1a] hover:text-blue-600 transition-colors"
                      >
                        {content.usPhone || ''}
                      </a>
                    </div>
                  </div>
                  <div className="space-y-1 mb-4 pl-16">
                    {content.usCompanyName && (
                      <p className="text-[#1a1a1a] font-medium">{content.usCompanyName}</p>
                    )}
                    {content.usAddress1 && (
                      <p className="text-[#666] text-sm">{content.usAddress1}</p>
                    )}
                    {content.usAddress2 && (
                      <p className="text-[#666] text-sm">{content.usAddress2}</p>
                    )}
                    {content.usCity && (
                      <p className="text-[#666] text-sm">{content.usCity}</p>
                    )}
                  </div>
                  {content.usWhatsapp && (
                    <div className="pl-16">
                      <a
                        href={`https://api.whatsapp.com/send?phone=${content.usWhatsapp.replace(/[\s-]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="bg-[#25D366] hover:bg-[#20c05c] text-white">
                          <MessageCircle className="w-4 h-4 mr-2" />
                          WhatsApp (US)
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Email Section */}
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#c9a962]/10 flex items-center justify-center mr-4">
                    <Mail className="w-5 h-5 text-[#c9a962]" />
                  </div>
                  <a
                    href={`mailto:${content.email || 'admin@suitsindia.in'}`}
                    className="text-lg font-semibold text-[#1a1a1a] hover:text-[#c9a962] transition-colors break-all"
                  >
                    {content.email || 'admin@suitsindia.in'}
                  </a>
                </div>
                <p className="text-[#666] text-sm pl-16">
                  {content.supportText || 'Our friendly support team is available to assist you.'}
                </p>
                <p className="text-[#666] text-sm pl-16">{content.hours || 'Mon – Fri from 10am– 5pm'}</p>
              </div>
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

export default ContactUsPage;
