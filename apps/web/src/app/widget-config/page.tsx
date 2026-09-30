'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Palette,
  Bot,
  Settings,
  HelpCircle,
  Plus,
  Trash2,
  Building2,
  GraduationCap,
  Stethoscope,
  ShoppingBag,
  RotateCcw,
} from 'lucide-react';

const COLOR_PRESETS = [
  { name: 'Sky Blue', hex: '#0284c7' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Rose', hex: '#e11d48' },
  { name: 'Slate Dark', hex: '#0f172a' },
];

interface IndustryPreset {
  id: string;
  name: string;
  icon: any;
  company: string;
  botName: string;
  color: string;
  greeting: string;
  questions: string[];
}

const INDUSTRY_PRESETS: IndustryPreset[] = [
  {
    id: 'general',
    name: 'General Business',
    icon: Building2,
    company: 'Nexus Solutions',
    botName: 'Nexus Support AI',
    color: '#0284c7',
    greeting: 'Welcome! How can our support team assist you today?',
    questions: [
      'What services or solutions do you offer?',
      'How do I contact sales or human support?',
      'What are your business hours and location?',
      'I want to speak with a human agent.',
    ],
  },
  {
    id: 'education',
    name: 'Education / University',
    icon: GraduationCap,
    company: 'Angkor University',
    botName: 'Admissions Assistant',
    color: '#4f46e5',
    greeting: 'Hello! I am here to help you with academic programs, enrollment, and campus life.',
    questions: [
      'What undergraduate programs do you offer?',
      'How much is tuition & admission fees?',
      'What are the upcoming semester deadlines?',
      'How can I apply for a scholarship?',
    ],
  },
  {
    id: 'healthcare',
    name: 'Healthcare / Clinic',
    icon: Stethoscope,
    company: 'CarePlus Medical',
    botName: 'Clinic Concierge',
    color: '#059669',
    greeting: 'Welcome to CarePlus Clinic. How can we help your wellness today?',
    questions: [
      'What medical specialties are available?',
      'How do I book a doctor appointment?',
      'What are your opening hours & emergency contact?',
      'Do you accept medical insurance or KHQR?',
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce / Retail',
    icon: ShoppingBag,
    company: 'Zando Express',
    botName: 'Shopping Assistant',
    color: '#e11d48',
    greeting: 'Hi there! Looking for deals, sizing advice, or tracking a package?',
    questions: [
      'Where is my order status?',
      'What is your 30-day return policy?',
      'What payment methods are supported?',
      'Can I speak with a customer representative?',
    ],
  },
  {
    id: 'custom',
    name: 'Custom / Other (ផ្សេងៗ)',
    icon: HelpCircle,
    company: 'My Custom Business',
    botName: 'AI Support Assistant',
    color: '#0f172a',
    greeting: 'Welcome! How can our organization assist you today?',
    questions: [
      'What services or solutions do you offer?',
      'How do I book an appointment or consult?',
      'What are your hours and location?',
      'I want to speak with a human agent.',
    ],
  },
];

export default function WidgetConfigPage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('general');
  const [customIndustryName, setCustomIndustryName] = useState<string>('');
  const [botName, setBotName] = useState('Nexus Support AI');
  const [companyName, setCompanyName] = useState('Nexus Solutions');
  const [primaryColor, setPrimaryColor] = useState('#0284c7');
  const [greeting, setGreeting] = useState('Welcome! How can our support team assist you today?');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [quickQuestions, setQuickQuestions] = useState<string[]>([
    'What services or solutions do you offer?',
    'How do I contact sales or human support?',
    'What are your business hours and location?',
    'I want to speak with a human agent.',
  ]);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [copied, setCopied] = useState(false);

  // Auth protection for Tenant Admin
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/login?redirect=/widget-config';
      }
    }
  }, []);

  // Compute origin
  const webOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3002';

  const handleApplyPreset = (preset: IndustryPreset) => {
    setSelectedIndustry(preset.id);
    if (preset.id !== 'custom') {
      setCompanyName(preset.company);
      setBotName(preset.botName);
      setPrimaryColor(preset.color);
      setGreeting(preset.greeting);
      setQuickQuestions([...preset.questions]);
    }
  };

  const handleAddQuestion = () => {
    const trimmed = newQuestionText.trim();
    if (!trimmed) return;
    if (quickQuestions.length >= 6) return;
    setQuickQuestions([...quickQuestions, trimmed]);
    setNewQuestionText('');
  };

  const handleRemoveQuestion = (index: number) => {
    setQuickQuestions(quickQuestions.filter((_, idx) => idx !== index));
  };

  const handleUpdateQuestion = (index: number, val: string) => {
    const updated = [...quickQuestions];
    updated[index] = val;
    setQuickQuestions(updated);
  };

  // Embed script snippet
  const embedCode = `<!-- AI Chatbot Floating Widget -->
<script
  src="${webOrigin}/widget.js"
  data-bot-name="${botName}"
  data-company="${companyName}"
  data-primary-color="${primaryColor}"
  data-greeting="${greeting}"
  data-quick-questions="${quickQuestions.join(';')}"
  data-position="${position}"
  data-web-url="${webOrigin}"
  defer>
</script>`;

  // Preview URL for iframe
  const previewUrl = `/widget?botName=${encodeURIComponent(botName)}&company=${encodeURIComponent(
    companyName
  )}&primaryColor=${encodeURIComponent(primaryColor)}&greeting=${encodeURIComponent(
    greeting
  )}&quickQuestions=${encodeURIComponent(quickQuestions.join(';'))}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="space-y-6 max-w-7xl w-full mx-auto pb-28 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Bot className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            <span>Multi-Tenant Widget Builder & Embed</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Customize your AI chatbot appearance, industry persona, starter questions, and embed into any website or business.
          </p>
        </div>

        <a
          href={previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-colors border border-transparent dark:border-slate-700"
        >
          <span>Open Full Widget Preview</span>
          <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
        </a>
      </div>

      {/* Industry Presets Selector */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 transition-colors">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span>Choose Industry Template / ជ្រើសរើសប្រភេទអាជីវកម្ម</span>
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Click a template to auto-populate brand & starter questions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {INDUSTRY_PRESETS.map((preset) => {
            const IconComponent = preset.icon;
            const isSelected = selectedIndustry === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 ring-2 ring-sky-500/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white shadow-xs"
                  style={{ backgroundColor: preset.color }}
                >
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 leading-tight">
                    {preset.name}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {preset.company}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {selectedIndustry === 'custom' && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-200">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Industry Type / ប្រភេទវិស័យផ្ទាល់ខ្លួន
            </label>
            <input
              type="text"
              placeholder="e.g. Real Estate, Hotel & Resort, Law Firm, Logistics, Travel Agency..."
              value={customIndustryName}
              onChange={(e) => setCustomIndustryName(e.target.value)}
              className="w-full sm:w-1/2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Configuration Controls & Code (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customization Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5 transition-colors">
            <h2 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>Brand & Appearance Settings</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bot Name / ឈ្មោះ Bot
                </label>
                <input
                  type="text"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. Campus Assistant, Clinic Concierge..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Company / Organization Name / ឈ្មោះស្ថាប័ន
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="e.g. Norton University, CarePlus Clinic..."
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Welcome Greeting / សារស្វាគមន៍ដំបូង
              </label>
              <textarea
                rows={2}
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Initial message displayed when the chat window opens..."
              />
            </div>

            {/* Quick Questions Manager */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                    <span>Starter / Quick Questions (FAQ Chips) / សំណួរពេញនិយម</span>
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Customers can click these quick suggestion chips to ask common questions immediately.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {quickQuestions.length}/6
                </span>
              </div>

              <div className="space-y-2">
                {quickQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => handleUpdateQuestion(idx, e.target.value)}
                      className="flex-1 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(idx)}
                      disabled={quickQuestions.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 transition-colors"
                      title="Remove question"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              {quickQuestions.length < 6 && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Add a new quick question..."
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuestion();
                      }
                    }}
                    className="flex-1 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    disabled={!newQuestionText.trim()}
                    className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                  </button>
                </div>
              )}
            </div>

            {/* Color Accent Picker */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                <span>Theme Accent Color / ពណ៌ Theme</span>
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.hex}
                    type="button"
                    onClick={() => setPrimaryColor(p.hex)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      primaryColor === p.hex
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 ring-2 ring-sky-500/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span className="h-3.5 w-3.5 rounded-full shadow-xs" style={{ backgroundColor: p.hex }}></span>
                    <span>{p.name}</span>
                  </button>
                ))}
                <div className="flex items-center gap-1.5 ml-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-8 w-8 cursor-pointer rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent"
                    title="Choose custom color"
                  />
                  <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{primaryColor}</span>
                </div>
              </div>
            </div>

            {/* Position Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Widget Position on Screen
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="position"
                    checked={position === 'bottom-right'}
                    onChange={() => setPosition('bottom-right')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>Bottom Right (Standard)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="position"
                    checked={position === 'bottom-left'}
                    onChange={() => setPosition('bottom-left')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>Bottom Left</span>
                </label>
              </div>
            </div>
          </div>

          {/* Embed Code Card */}
          <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-sky-400" />
                  <span>One-Line Embed Snippet</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Paste this snippet right before the closing &lt;/body&gt; tag of any website.
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors shadow-sm"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Script'}</span>
              </button>
            </div>

            <pre className="bg-slate-950 p-4 rounded-xl text-xs font-mono text-sky-300 overflow-x-auto border border-slate-800 leading-relaxed">
              <code>{embedCode}</code>
            </pre>

            <div className="pt-1 flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Compatible with WordPress, Next.js, Shopify, Laravel, and custom HTML sites.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Preview (5 cols) */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="w-full max-w-[390px] bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col h-[640px] sticky top-6 transition-colors">
            <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="font-semibold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-white">Live Floating Preview</span>
              </span>
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">380 x 600</span>
            </div>
            <div className="flex-1 w-full relative overflow-hidden bg-slate-100 dark:bg-slate-950">
              <iframe
                key={previewUrl}
                src={previewUrl}
                className="w-full h-full border-0 absolute inset-0"
                title="Widget Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
