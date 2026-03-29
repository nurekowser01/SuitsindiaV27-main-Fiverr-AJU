import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';
import { Save, FileText, Bold, Italic, List, ListOrdered, Heading1, Heading2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

// Simple Rich Text Editor Component
const SimpleEditor = ({ content, onChange }) => {
  const [html, setHtml] = useState(content || '');

  const handleChange = (e) => {
    setHtml(e.target.innerHTML);
    onChange(e.target.innerHTML);
  };

  const execCommand = (command, value = null) => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="border rounded-lg bg-white">
      {/* Toolbar */}
      <div className="border-b p-2 flex flex-wrap gap-1">
        <button
          onClick={() => execCommand('bold')}
          className="p-2 rounded hover:bg-gray-200"
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-2 rounded hover:bg-gray-200"
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <div className="border-l mx-1" />
        <button
          onClick={() => execCommand('formatBlock', 'h1')}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand('formatBlock', 'h2')}
          className="p-2 rounded hover:bg-gray-200"
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <div className="border-l mx-1" />
        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 rounded hover:bg-gray-200"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 rounded hover:bg-gray-200"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </button>
      </div>

      {/* Editor Content */}
      <div
        contentEditable
        className="prose max-w-none p-4 min-h-[400px] focus:outline-none"
        dangerouslySetInnerHTML={{ __html: html }}
        onInput={handleChange}
      />
    </div>
  );
};

const MultiPageEditorPage = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [pages, setPages] = useState([
    { slug: 'faq', title: 'FAQ' },
    { slug: 'shipping-return', title: 'Shipping and Return' },
    { slug: 'care-instruction', title: 'Care Instruction' },
    { slug: 'privacy-policy', title: 'Privacy Policy' },
  ]);
  const [pageContents, setPageContents] = useState({});
  const [activeTab, setActiveTab] = useState('faq');

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      // Fetch content for each page
      const contents = {};
      for (const page of pages) {
        try {
          const contentResponse = await axios.get(`${API_URL}/pages/${page.slug}`);
          contents[page.slug] = contentResponse.data.content || getDefaultContent(page.slug);
        } catch (error) {
          contents[page.slug] = getDefaultContent(page.slug);
        }
      }
      setPageContents(contents);
    } catch (error) {
      console.error('Error fetching pages:', error);
      toast.error('Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultContent = (slug) => {
    const defaults = {
      faq: '<h1>Frequently Asked Questions</h1><h2>How long does it take to make a custom suit?</h2><p>Production typically takes 3-4 weeks, plus shipping time.</p>',
      'shipping-return': '<h1>Shipping and Return</h1><h2>Shipping</h2><p>We offer worldwide shipping on all orders.</p>',
      'care-instruction': '<h1>Suit Care Instructions</h1><h2>Dry Cleaning</h2><p>We recommend professional dry cleaning for your custom suit.</p>',
      'privacy-policy': '<h1>Privacy Policy</h1><p>Last Updated: July 2025</p><h2>Information We Collect</h2><p>We collect information you provide directly to us.</p>',
    };
    return defaults[slug] || '<p>No content yet...</p>';
  };

  const handleSave = async (slug) => {
    setSaving(slug);
    try {
      const page = pages.find((p) => p.slug === slug);
      await axios.put(
        `${API_URL}/pages/${slug}`,
        {
          title: page.title,
          content: pageContents[slug] || '',
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${page.title} saved successfully!`);
    } catch (error) {
      console.error('Error saving page:', error);
      toast.error('Failed to save page');
    } finally {
      setSaving(null);
    }
  };

  const handleContentChange = (slug, value) => {
    setPageContents((prev) => ({
      ...prev,
      [slug]: value,
    }));
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pages...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#1a1a1a] mb-2">Static Pages Editor</h1>
            <p className="text-[#666]">Edit content for your static pages using the WYSIWYG editor</p>
          </div>
        </div>

        {/* Tabs for different pages */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 mb-6">
                {pages.map((page) => (
                  <TabsTrigger key={page.slug} value={page.slug} className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {page.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {pages.map((page) => (
                <TabsContent key={page.slug} value={page.slug} className="space-y-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold text-[#1a1a1a]">{page.title}</h2>
                    <Button
                      onClick={() => handleSave(page.slug)}
                      disabled={saving === page.slug}
                      className="bg-[#c9a962] hover:bg-[#b89952] text-black"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving === page.slug ? 'Saving...' : 'Save Page'}
                    </Button>
                  </div>

                  {/* Simple Editor */}
                  <SimpleEditor
                    content={pageContents[page.slug] || ''}
                    onChange={(value) => handleContentChange(page.slug, value)}
                  />

                  {/* Preview Section */}
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-3 text-[#1a1a1a]">Preview</h3>
                    <Card className="bg-[#f5f5f0]">
                      <CardContent className="p-6">
                        <div
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: pageContents[page.slug] || '<p>No content yet...</p>',
                          }}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-blue-900 mb-2">Editing Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use the toolbar to format your content with headings, lists, and styles</li>
              <li>• Preview your changes in real-time before saving</li>
              <li>• Click "Save Page" to publish changes to the live site</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default MultiPageEditorPage;
