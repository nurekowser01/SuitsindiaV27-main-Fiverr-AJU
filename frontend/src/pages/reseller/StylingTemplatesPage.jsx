import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import api from '../../lib/api';
import {
  ArrowLeft,
  Home,
  Loader2,
  Check,
  Plus,
  Trash2,
  Save,
  Search,
  Edit,
  Bookmark,
  Package,
  X,
  Image
} from 'lucide-react';

const LOGO_URL = "https://customer-assets.emergentagent.com/job_9da33e7c-3de8-4395-ae8f-eb17ebcbc337/artifacts/75k3o1w3_suits.png";

const StylingTemplatesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // List view state
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Editor state
  const [editorMode, setEditorMode] = useState(false); // false = list, true = editor
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [step, setStep] = useState(1); // 1 = pick product, 2 = style editor
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  // Styling state (mirrors StylingPage)
  const [parameters, setParameters] = useState([]);
  const [constructions, setConstructions] = useState([]);
  const [activeParameter, setActiveParameter] = useState(null);
  const [selectedOptions, setSelectedOptions] = useState({});
  const [selectedSubOptions, setSelectedSubOptions] = useState({});
  const [selectedConstruction, setSelectedConstruction] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [templatesRes, categoriesRes] = await Promise.all([
        api.get(`/styling/templates`),
        api.get(`/products/categories`)
      ]);
      setTemplates(templatesRes.data || []);
      setCategories(categoriesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStylingOptions = async (productId) => {
    try {
      const response = await api.get(`/styling/parameters/${productId}`);
      const styling = response.data;
      setParameters(styling.parameters || []);
      setConstructions(styling.constructions || []);
      if (styling.parameters?.length > 0) {
        setActiveParameter(styling.parameters[0].id);
      }
    } catch (error) {
      console.error('Error fetching styling options:', error);
      toast.error('Failed to load styling options');
    }
  };

  // --- List Actions ---
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setStep(1);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedOptions({});
    setSelectedSubOptions({});
    setSelectedConstruction(null);
    setTemplateName('');
    setTemplateDescription('');
    setActiveParameter(null);
    setParameters([]);
    setConstructions([]);
    setEditorMode(true);
  };

  const handleEditTemplate = async (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || '');
    setSelectedOptions(template.options || {});
    setSelectedSubOptions(template.sub_options || {});
    setSelectedConstruction(template.construction || null);

    for (const cat of categories) {
      const product = cat.products?.find(p => p.id === template.product_id);
      if (product) {
        setSelectedCategory(cat);
        setSelectedProduct(product);
        await fetchStylingOptions(product.id);
        break;
      }
    }

    setStep(2);
    setEditorMode(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/styling/templates/${templateId}`);
      toast.success('Template deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  // --- Editor Actions ---
  const handleProductSelect = async (product) => {
    setSelectedProduct(product);
    await fetchStylingOptions(product.id);
    setStep(2);
  };

  const handleOptionSelect = (parameterId, option) => {
    setSelectedOptions(prev => ({ ...prev, [parameterId]: option }));
    // Clear sub-option when parent changes
    if (!option.has_sub_options) {
      setSelectedSubOptions(prev => {
        const next = { ...prev };
        delete next[parameterId];
        return next;
      });
    }
  };

  const handleSubOptionSelect = (parameterId, subOption) => {
    setSelectedSubOptions(prev => ({ ...prev, [parameterId]: subOption }));
  };

  const handleConstructionSelect = (construction) => {
    setSelectedConstruction(prev => prev?.id === construction.id ? null : construction);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { toast.error('Please enter a template name'); return; }
    if (Object.keys(selectedOptions).length === 0) { toast.error('Please select at least one styling option'); return; }

    setSaving(true);
    try {
      const templateData = {
        name: templateName.trim(),
        description: templateDescription.trim(),
        product_id: selectedProduct.id,
        product_name: selectedProduct.name,
        options: selectedOptions,
        sub_options: selectedSubOptions,
        construction: selectedConstruction,
        user_id: user?.email || 'anonymous',
        is_global: false
      };

      if (editingTemplate) {
        await api.put(`/styling/templates/${editingTemplate.id}`, templateData);
        toast.success('Template updated!');
      } else {
        await api.post(`/styling/templates`, templateData);
        toast.success('Template created!');
      }

      setEditorMode(false);
      fetchData();
    } catch (error) {
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleBackFromEditor = () => {
    if (step === 2 && !editingTemplate) {
      setStep(1);
      setSelectedProduct(null);
      setParameters([]);
      setConstructions([]);
    } else {
      setEditorMode(false);
    }
  };

  const activeParam = parameters.find(p => p.id === activeParameter);
  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1829] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#c9a962]" />
      </div>
    );
  }

  // ==================== EDITOR MODE ====================
  if (editorMode) {
    // Step 1: Product Selection
    if (step === 1) {
      return (
        <div className="min-h-screen flex flex-col bg-[#0f1829]">
          <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={handleBackFromEditor} className="h-10 w-10">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={LOGO_URL} alt="Suits India" className="h-10 w-auto object-contain" />
              <div>
                <h1 className="text-lg font-semibold text-gray-800">New Template</h1>
                <p className="text-xs text-gray-500">Select a product</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            {!selectedCategory ? (
              <div>
                <p className="text-white/60 text-sm mb-4">Select a product category:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {categories.map(cat => (
                    <button key={cat.id} onClick={() => setSelectedCategory(cat)}
                      className="p-6 rounded-xl border-2 border-white/10 bg-white/5 hover:border-[#c9a962] hover:bg-[#c9a962]/10 transition-all text-left"
                      data-testid={`category-${cat.id}`}>
                      <h4 className="font-medium text-white text-lg">{cat.name}</h4>
                      <p className="text-xs text-white/50">{cat.products?.length || 0} products</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)} className="mb-4 text-white/70 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Categories
                </Button>
                <h4 className="font-medium text-white mb-4">{selectedCategory.name}</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(selectedCategory.products || []).filter(p => p.is_active !== false).map(product => (
                    <button key={product.id} onClick={() => handleProductSelect(product)}
                      className="p-6 rounded-xl border-2 border-white/10 bg-white/5 hover:border-[#c9a962] hover:bg-[#c9a962]/10 transition-all text-left"
                      data-testid={`product-${product.id}`}>
                      <h4 className="font-medium text-white">{product.name}</h4>
                      <p className="text-xs text-white/50">{product.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>
      );
    }

    // Step 2: Full-page Styling Editor (same layout as StylingPage)
    return (
      <div className="min-h-screen flex flex-col bg-gray-100" data-testid="template-editor">
        {/* Header — matches StylingPage */}
        <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackFromEditor} className="h-10 w-10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={LOGO_URL} alt="Suits India" className="h-10 w-auto object-contain" />
            <div>
              <h1 className="text-lg font-semibold text-gray-800">{selectedProduct?.name}</h1>
              <p className="text-sm text-gray-500">
                {editingTemplate ? `Editing: ${editingTemplate.name}` : 'New Template'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-[#c9a962]/20 text-[#c9a962] border-0">
              {Object.keys(selectedOptions).length} options selected
            </Badge>
            <Button variant="ghost" size="icon" onClick={() => setEditorMode(false)} className="h-10 w-10">
              <Home className="h-5 w-5 text-gray-600" />
            </Button>
          </div>
        </header>

        {/* Main Content — same layout as StylingPage */}
        <div className="flex-1 flex">
          {/* Left Sidebar — Parameters */}
          <aside className="w-28 bg-[#1a2744] flex flex-col overflow-y-auto">
            {parameters.map(param => (
              <button
                key={param.id}
                onClick={() => setActiveParameter(param.id)}
                className={`px-2 py-4 text-left border-l-4 transition-all ${
                  activeParameter === param.id
                    ? 'bg-[#c9a962] border-[#c9a962] text-black font-medium'
                    : 'border-transparent text-white/80 hover:bg-white/10'
                }`}
                data-testid={`param-${param.id}`}
              >
                <span className="text-xs leading-tight block">{param.name}</span>
                {selectedOptions[param.id] && (
                  <Check className="h-3 w-3 mt-1 text-green-400" />
                )}
              </button>
            ))}
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-4 overflow-y-auto">
            {/* Template Name & Description */}
            <div className="bg-white rounded-lg p-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Template Name *</label>
                  <Input
                    placeholder="e.g., Classic Business Suit"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    data-testid="template-name-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Description (optional)</label>
                  <Input
                    placeholder="Brief description"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Product Title */}
            <div className="bg-white rounded-lg p-3 mb-4">
              <h2 className="text-center font-semibold text-gray-800">{selectedProduct?.name}</h2>
            </div>

            {/* Construction Variant Selection */}
            {constructions.length > 0 && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-2">Select Variant</h3>
                <div className="flex gap-2 flex-wrap">
                  {constructions.map(construction => (
                    <Button
                      key={construction.id}
                      variant={selectedConstruction?.id === construction.id ? "default" : "outline"}
                      className={selectedConstruction?.id === construction.id
                        ? "bg-[#c9a962] hover:bg-[#b89952] text-black"
                        : ""}
                      onClick={() => handleConstructionSelect(construction)}
                      data-testid={`construction-${construction.id}`}
                    >
                      {construction.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Parameter Options — same grid as StylingPage */}
            {activeParam && (
              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 border-b pb-2">
                  {activeParam.name}
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {activeParam.options?.map(option => (
                    <button
                      key={option.id}
                      onClick={() => handleOptionSelect(activeParam.id, option)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        selectedOptions[activeParam.id]?.id === option.id
                          ? 'border-[#c9a962] bg-[#c9a962]/10'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`option-${option.id}`}
                    >
                      {option.image ? (
                        <img
                          src={option.image}
                          alt={option.name}
                          className="w-full aspect-square object-contain mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-gray-100 rounded flex items-center justify-center mb-2">
                          <Image className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                      {option.surcharge > 0 && (
                        <p className="text-xs text-gray-500">Upcharge - {option.surcharge}</p>
                      )}
                      <p className="text-xs font-medium text-gray-800">{option.name}</p>
                      {option.has_sub_options && (option.sub_options || []).length > 0 && (
                        <p className="text-[10px] text-blue-500 mt-0.5">has sub-options</p>
                      )}
                    </button>
                  ))}
                </div>

                {/* Sub-Options Section — same as StylingPage */}
                {(() => {
                  const selectedOpt = selectedOptions[activeParam.id];
                  if (!selectedOpt?.has_sub_options || !(selectedOpt.sub_options || []).length) return null;
                  return (
                    <div className="mt-4 pt-4 border-t-2 border-blue-200" data-testid={`sub-options-${activeParam.id}`}>
                      <h4 className="text-sm font-medium text-blue-600 mb-3">
                        Select {selectedOpt.name} Sub-Option
                      </h4>
                      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {(selectedOpt.sub_options || []).map(sub => (
                          <button
                            key={sub.id}
                            onClick={() => handleSubOptionSelect(activeParam.id, sub)}
                            className={`p-3 rounded-lg border-2 transition-all ${
                              selectedSubOptions[activeParam.id]?.id === sub.id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                            data-testid={`sub-option-${sub.id}`}
                          >
                            {sub.image ? (
                              <img
                                src={sub.image}
                                alt={sub.name}
                                className="w-full aspect-square object-contain mb-2"
                              />
                            ) : (
                              <div className="w-full aspect-square bg-blue-50 rounded flex items-center justify-center mb-2">
                                <span className="text-lg text-blue-400">&#9671;</span>
                              </div>
                            )}
                            {sub.surcharge > 0 && (
                              <p className="text-xs text-gray-500">Upcharge - {sub.surcharge}</p>
                            )}
                            <p className="text-xs font-medium text-gray-800">{sub.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Selected Options Summary */}
            {Object.keys(selectedOptions).length > 0 && (
              <div className="bg-[#1a2744] rounded-lg p-4 mb-4">
                <h5 className="text-white font-medium mb-2">
                  Selected Options ({Object.keys(selectedOptions).length})
                </h5>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(selectedOptions).map(([key, value]) => {
                    const param = parameters.find(p => p.id === key);
                    const subOpt = selectedSubOptions[key];
                    return (
                      <span key={key}
                        className="bg-white/10 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <span className="text-white/60">{param?.name}:</span>
                        <span>{value.name || value}</span>
                        {subOpt && <span className="text-blue-300 ml-1">({subOpt.name})</span>}
                        <button onClick={() => {
                          setSelectedOptions(prev => { const n = { ...prev }; delete n[key]; return n; });
                          setSelectedSubOptions(prev => { const n = { ...prev }; delete n[key]; return n; });
                        }} className="ml-1 hover:text-red-400">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="bg-white rounded-lg p-4">
              <Button
                onClick={handleSaveTemplate}
                disabled={saving || !templateName.trim() || Object.keys(selectedOptions).length === 0}
                className="w-full bg-[#c9a962] hover:bg-[#b89952] text-black font-medium py-3"
                data-testid="save-template-btn"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" /> {editingTemplate ? 'Update Template' : 'Save Template'}</>
                )}
              </Button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ==================== LIST MODE ====================
  return (
    <div className="min-h-screen flex flex-col bg-[#0f1829]">
      {/* Header */}
      <header className="bg-white shadow-md px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/reseller/dashboard')} className="h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={LOGO_URL} alt="Suits India" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Styling Templates</h1>
            <p className="text-xs text-gray-500">Create & manage reusable styling presets</p>
          </div>
        </div>
        <Button size="icon" className="bg-[#c9a962] hover:bg-[#b89952] text-white h-10 w-10 rounded-lg"
          onClick={() => navigate('/reseller/dashboard')}>
          <Home className="h-5 w-5" />
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6">
        {/* Search and Create */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
            />
          </div>
          <Button onClick={handleCreateNew} className="bg-[#c9a962] hover:bg-[#b89952] text-black font-medium"
            data-testid="create-template-btn">
            <Plus className="h-4 w-4 mr-2" /> Create Template
          </Button>
        </div>

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="bg-white/5 rounded-xl p-12 text-center">
            <Bookmark className="h-16 w-16 mx-auto text-white/20 mb-4" />
            <h3 className="text-white text-xl mb-2">No Templates Yet</h3>
            <p className="text-white/60 mb-6">Create styling templates to speed up your order process</p>
            <Button onClick={handleCreateNew} className="bg-[#c9a962] hover:bg-[#b89952] text-black">
              <Plus className="h-4 w-4 mr-2" /> Create Your First Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => (
              <div key={template.id}
                className="bg-white/10 backdrop-blur rounded-xl p-5 hover:bg-white/15 transition-all border border-white/10"
                data-testid={`template-card-${template.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-white font-semibold text-lg">{template.name}</h3>
                    <p className="text-white/60 text-sm">{template.product_name}</p>
                  </div>
                  <Badge className="bg-[#c9a962]/20 text-[#c9a962] border-0">
                    {Object.keys(template.options || {}).length} options
                  </Badge>
                </div>

                {template.description && (
                  <p className="text-white/50 text-sm mb-3 line-clamp-2">{template.description}</p>
                )}

                <div className="flex flex-wrap gap-1 mb-4">
                  {Object.entries(template.options || {}).slice(0, 4).map(([key, value]) => (
                    <span key={key} className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded">
                      {typeof value === 'object' ? value.name : value}
                    </span>
                  ))}
                  {Object.keys(template.options || {}).length > 4 && (
                    <span className="text-xs text-white/50">+{Object.keys(template.options).length - 4} more</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm"
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                    onClick={() => handleEditTemplate(template)}
                    data-testid={`edit-template-${template.id}`}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm"
                    className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDeleteTemplate(template.id)}
                    data-testid={`delete-template-${template.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default StylingTemplatesPage;
