'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bot,
  Building2,
  GraduationCap,
  Stethoscope,
  ShoppingBag,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Send,
  Zap,
  BookOpen,
  MessageSquare,
  Users,
  ChevronRight,
  HelpCircle,
  Languages,
} from 'lucide-react';

export default function Home() {
  const [lang, setLang] = useState<'km' | 'en'>('km');
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [industry, setIndustry] = useState('corporate');
  const [customIndustry, setCustomIndustry] = useState('');
  const [orgName, setOrgName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [requestRef, setRequestRef] = useState('');

  // Read language preference on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('app_lang') as 'km' | 'en';
      if (saved) {
        setLang(saved);
        document.documentElement.lang = saved;
      } else {
        setLang('km');
        document.documentElement.lang = 'km';
      }
    }
  }, []);

  const handleToggleLang = () => {
    const next = lang === 'km' ? 'en' : 'km';
    setLang(next);
    localStorage.setItem('app_lang', next);
    if (typeof window !== 'undefined') {
      document.documentElement.lang = next;
    }
  };

  // Dynamically load the floating chat widget on the landing page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingScript = document.getElementById('omni-floating-widget');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'theara-floating-widget';
        script.src = '/widget.js';
        script.setAttribute('data-bot-name', 'Theara AI Assistant');
        script.setAttribute('data-company', 'Theara AI Platform');
        script.setAttribute('data-primary-color', '#0284c7');
        script.setAttribute(
          'data-greeting',
          'សួស្តី! Welcome to Theara AI Support. How can I help your business automate customer service today?'
        );
        script.setAttribute(
          'data-quick-questions',
          'What industries do you support?;How do I get an AI Assistant for my business?;What are your features?'
        );
        script.setAttribute('data-web-url', window.location.origin);
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, []);

  const handleOpenWidget = () => {
    const bubble = document.querySelector('.ai-support-widget-bubble') as HTMLElement;
    if (bubble) bubble.click();
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !contactName || !email) return;

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const ref = `#REQ-${Math.floor(100000 + Math.random() * 900000)}`;
      setRequestRef(ref);
      setSubmitSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetModal = () => {
    setSubmitSuccess(false);
    setOrgName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setNotes('');
    setCustomIndustry('');
    setIsRequestModalOpen(false);
  };

  const isKm = lang === 'km';

  return (
    <div
      className={`min-h-full w-full bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white ${
        isKm ? 'font-khmer' : 'font-sans'
      }`}
    >
      {/* Top Navbar */}
      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-6 sm:px-12 py-4 flex justify-between items-center max-w-7xl mx-auto w-full transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-sky-600/20">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg text-white tracking-tight">Theara AI Support</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                {isKm ? 'គម្រោង AI ផ្ទាល់ខ្លួន' : 'Personal AI Project'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              {isKm ? 'ប្រព័ន្ធ AI Customer Support បង្កើតឡើងដោយ ជឺម ធារ៉ា' : 'Smart AI Customer Support built by Chim Theara'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={handleToggleLang}
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
            title="Toggle Language / ប្តូរភាសា"
          >
            <Languages className="h-3.5 w-3.5 text-sky-400" />
            <span>{isKm ? '🇺🇸 English' : '🇰🇭 ភាសាខ្មែរ'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRequestModalOpen(true)}
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white transition-all shadow-md shadow-sky-500/20 cursor-pointer"
          >
            <span>{isKm ? 'ស្នើសុំ AI' : 'Request AI Assistant'}</span>
          </button>

          <Link
            href="/login"
            className="text-xs font-semibold px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <span>{isKm ? 'ចូលគណនី' : 'Sign In'}</span>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-20 flex-1 flex flex-col justify-center items-center text-center space-y-12">
        <div className="space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-950/80 border border-sky-800 text-sky-300 text-xs font-medium shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{isKm ? 'ប្រព័ន្ធឆ្លើយតបអតិថិជន ២៤/៧ • គាំទ្រភាសាខ្មែរ & អង់គ្លេស' : '24/7 AI Customer Support Automation • Khmer & English'}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {isKm ? (
              <>
                ឆ្លើយតបអតិថិជន ២៤/៧ ដោយស្វ័យប្រវត្តិជាមួយ{' '}
                <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  AI ឆ្លាតវៃ
                </span>
              </>
            ) : (
              <>
                Smart 24/7 AI Customer Support Powered by{' '}
                <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  Modern LLMs
                </span>
              </>
            )}
          </h1>

          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {isKm
              ? 'ជំនួយការ AI ឆ្លាតវៃដែលយល់ដឹងពីឯកសារ និងសេវាកម្មអាជីវកម្មរបស់អ្នក (RAG) ជាមួយការគាំទ្រភាសាខ្មែរ និងអង់គ្លេស ការបញ្ជូនទៅកាន់បុគ្គលិកផ្ទាល់ និងបង្កប់លើ Website ងាយស្រួលដោយកូដ ១ បន្ទាត់។'
              : 'An intelligent AI customer assistant that understands your business documents and FAQs (RAG). Features live agent handoff, Khmer & English support, and easy one-line website embedding.'}
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => setIsRequestModalOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm px-7 py-3 rounded-xl shadow-lg shadow-sky-600/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{isKm ? 'ស្នើសុំ AI សម្រាប់អាជីវកម្មរបស់អ្នក' : 'Request AI for Your Business'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleOpenWidget}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-sm px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-sky-400" />
              <span>{isKm ? 'សាកល្បង Chat ផ្ទាល់ (Live Widget)' : 'Test Live Chatbot'}</span>
            </button>
          </div>
        </div>

        {/* Industry Solutions Grid */}
        <div className="w-full pt-8 space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              <span>{isKm ? 'ដំណោះស្រាយសម្រាប់គ្រប់វិស័យអាជីវកម្ម' : 'Tailored for Any Industry'}</span>
            </h2>
            <p className="text-xs text-slate-400">
              {isKm
                ? 'ស្ថាប័ននីមួយៗទទួលបាន Workspace ដាច់ដោយឡែកជាមួយ Knowledge Base & Persona ផ្ទាល់ខ្លួន'
                : 'Each organization receives an isolated Tenant Workspace with customized knowledge base & persona.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {/* Corporate */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-sky-500/50 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isKm ? 'អាជីវកម្ម & សេវាកម្ម (Business & Tech)' : 'Business & Services'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isKm
                    ? 'ប្រឹក្សាសេវាកម្ម, ដោះស្រាយបញ្ហាបច្ចេកទេស, និងបង្កើត Support Ticket ស្វ័យប្រវត្តិ។'
                    : 'Technical help, pricing, service details, and live ticket routing for businesses.'}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-sky-400 flex items-center gap-1">
                <span>{isKm ? 'បង្កើត Ticket ស្វ័យប្រវត្តិ' : 'Auto-creates tickets'}</span>
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            {/* Education */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/50 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isKm ? 'សាលារៀន & សាកលវិទ្យាល័យ (Education)' : 'Education & Universities'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isKm
                    ? 'តម្លៃសិក្សា, អាហារូបករណ៍, មុខវិជ្ជាបរិញ្ញាបត្រ, កាលវិភាគចូលរៀន, និងជីវិតនិស្សិត។'
                    : 'Tuition fees, academic programs, scholarship applications, schedules, and campus life.'}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
                <span>{isKm ? 'ប្រឹក្សាការចុះឈ្មោះរៀន' : 'Admissions concierge'}</span>
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            {/* Healthcare */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-emerald-500/50 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isKm ? 'គ្លីនិក & មន្ទីរពេទ្យ (Healthcare)' : 'Healthcare & Clinics'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isKm
                    ? 'កក់ម៉ោងជួបគ្រូពេទ្យ, ឯកទេសវេជ្ជសាស្រ្ត, លេខសង្គ្រោះបន្ទាន់, និងម៉ោងបើកទ្វារ។'
                    : 'Doctor booking, specialty services, emergency contacts, operating hours, and wellness guidance.'}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <span>{isKm ? 'កក់ម៉ោងពិនិត្យជំងឺ' : 'Appointment bookings'}</span>
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>

            {/* Retail */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 hover:border-rose-500/50 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isKm ? 'ហាងទំនិញ & អនឡាញ (Retail & Shop)' : 'Retail & E-Commerce'}
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  {isKm
                    ? 'ពិនិត្យការបញ្ជាទិញ, គោលការណ៍ប្តូរទំនិញ, ការទូទាត់ប្រាក់ KHQR, និងបង្វែរមកបុគ្គលិក។'
                    : 'Order status, return & refund policies, product recommendations, and human agent takeover.'}
                </p>
              </div>
              <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
                <span>{isKm ? 'លក់ & គាំទ្រ ២៤/៧' : '24/7 sales agent'}</span>
                <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </div>

          {/* Custom Industry Callout */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">
                  {isKm
                    ? 'មានអាជីវកម្មវិស័យផ្សេងទៀត? (អចលនទ្រព្យ, សណ្ឋាគារ, ដឹកជញ្ជូន, មេធាវី...)'
                    : 'Have another type of business? (Real Estate, Hospitality, Logistics, Law...)'}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isKm
                    ? 'ប្រព័ន្ធយើងគាំទ្រការរៀបចំវិស័យផ្ទាល់ខ្លួន ១០០%។ គ្រាន់តែបំពេញទម្រង់ស្នើសុំ ក្រុមការងារយើងនឹងរៀបចំជូនភ្លាមៗ។'
                    : 'Our platform supports fully custom industry setups. Simply submit a request and specify your organization’s unique workflow.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setIndustry('other');
                setIsRequestModalOpen(true);
              }}
              className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {isKm ? 'ស្នើសុំវិស័យផ្ទាល់ខ្លួន &rarr;' : 'Request Custom Setup &rarr;'}
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left pt-6">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-2">
            <BookOpen className="h-6 w-6 text-sky-400" />
            <h3 className="font-bold text-sm text-white">
              {isKm ? 'Knowledge Base ដាច់ដោយឡែក (RAG)' : 'Isolated Knowledge Base (RAG)'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm
                ? 'បញ្ចូលឯកសារ PDF ឬ FAQ របស់ក្រុមហ៊ុនអ្នក។ AI នឹងស្វែងរកទិន្នន័យជាក់ស្តែង ដើម្បីឆ្លើយយ៉ាងត្រឹមត្រូវបំផុត។'
                : 'Upload your company manuals, brochures, and FAQs. The AI searches pgvector chunks to ground answers accurately without hallucination.'}
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-2">
            <Users className="h-6 w-6 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">
              {isKm ? 'បុគ្គលិកទទួលឆ្លើយតបផ្ទាល់ (Human Takeover)' : 'Human Agent Takeover'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm
                ? 'នៅពេលអតិថិជនត្រូវការជំនួយពីមនុស្ស ឬសុំជួបបុគ្គលិក Support Agent អាចចូលជួយ Chat ភ្លាមៗតាម Socket.IO។'
                : 'When a customer requests human help or an issue requires escalation, support agents take over instantly via live Socket.IO inbox.'}
            </p>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 space-y-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">
              {isKm ? 'គ្រប់គ្រងតាមតួនាទី (Role-Based Access)' : 'Role Management & Access'}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isKm
                ? 'បែងចែកសិទ្ធិយ៉ាងច្បាស់លាស់រវាង Super Admin, Tenant Admin, និង Support Agent ដើម្បីភាពងាយស្រួល និងសុវត្ថិភាព។'
                : 'Clear permission boundaries between Super Admin, Workspace Admin, and Support Agents for simple, secure operations.'}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 space-y-2">
        <p className="text-slate-400 font-medium">
          © 2026 Theara AI Support Platform. Built by <span className="text-sky-400 font-semibold">Chim Theara (ជឺម ធារ៉ា)</span>.
        </p>
        <p className="text-[11px] text-slate-500">
          Smart AI Support • Khmer & English • Live Human Handoff • Easy Website Embed
        </p>
      </footer>

      {/* Request AI Assistant Onboarding Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden transition-colors">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/40">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold">
                  <Bot className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {isKm ? 'ស្នើសុំបើកគណនី AI Assistant Workspace' : 'Request AI Assistant Workspace'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {isKm ? 'សំណើនឹងត្រូវបានពិនិត្យ និង Approve ដោយ Super Admin' : 'Application will be reviewed & approved by Super Admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Modal Content */}
            {submitSuccess ? (
              <div className="p-6 text-center space-y-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-white">
                    {isKm ? 'សំណើត្រូវបានបញ្ជូនដោយជោគជ័យ!' : 'Application Submitted Successfully!'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    {isKm ? (
                      <>
                        លេខកូដសម្គាល់សំណើរបស់អ្នកគឺ{' '}
                        <span className="font-mono font-bold text-sky-400">{requestRef}</span>។ ក្រុមការងារ Super Admin នឹងត្រួតពិនិត្យ និងរៀបចំគណនី Tenant Admin ជូនក្នុងរយៈពេល ២៤ ម៉ោង។
                      </>
                    ) : (
                      <>
                        Your request reference ID is{' '}
                        <span className="font-mono font-bold text-sky-400">{requestRef}</span>. Our Super Admin team will review your organization details and provision your Tenant Admin workspace.
                      </>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
                  <p className="font-semibold text-slate-300">{isKm ? 'ជំហានបន្ទាប់:' : 'Next Steps:'}</p>
                  <p>{isKm ? '1. Super Admin ផ្ទៀងផ្ទាត់ព័ត៌មានស្ថាប័នរបស់អ្នក។' : '1. Super Admin verifies your organization credentials.'}</p>
                  <p>{isKm ? '2. អ្នកនឹងទទួលបាន Email គណនីចូលប្រើជា Tenant Admin។' : '2. You will receive an activation email with your Tenant Admin credentials.'}</p>
                  <p>{isKm ? '3. ចូលទៅកាន់ Knowledge Base ដើម្បី Upload ឯកសារ និងយកកូដ Widget ទៅប្រើ។' : '3. Log in to configure your Knowledge Base & copy your website embed widget.'}</p>
                </div>
                <button
                  onClick={resetModal}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-colors shadow-sm"
                >
                  {isKm ? 'យល់ព្រម & បិទ' : 'Understood & Close'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isKm ? 'ឈ្មោះស្ថាប័ន / ក្រុមហ៊ុន' : 'Organization / Company Name'} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={isKm ? 'ឧ. សាកលវិទ្យាល័យ, គ្លីនិកព្យាបាល, ហាងលក់ទំនិញ...' : 'e.g. Norton University, CarePlus Clinic, Zando Shop'}
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isKm ? 'ប្រភេទវិស័យ' : 'Industry Category'}
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="corporate">🏢 {isKm ? 'អាជីវកម្ម & សេវាកម្ម' : 'Business & Services'}</option>
                      <option value="education">🎓 {isKm ? 'សាលារៀន & សាកលវិទ្យាល័យ' : 'Education & University'}</option>
                      <option value="healthcare">🏥 {isKm ? 'គ្លីនិក & មន្ទីរពេទ្យ' : 'Healthcare & Clinic'}</option>
                      <option value="retail">🛍️ {isKm ? 'ហាងទំនិញ & អនឡាញ' : 'Retail & E-Commerce'}</option>
                      <option value="other">✨ {isKm ? 'ផ្សេងៗ (Other / Custom)' : 'Other / Custom (ផ្សេងៗ)'}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isKm ? 'ឈ្មោះអ្នកទំនាក់ទំនង' : 'Contact Person Name'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isKm ? 'ឧ. ឈឹម ធារ៉ា' : 'e.g. Chim Theara'}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                {industry === 'other' && (
                  <div className="animate-in fade-in duration-200">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isKm ? 'បញ្ជាក់ប្រភេទវិស័យផ្ទាល់ខ្លួន' : 'Specify Custom Industry'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={isKm ? 'ឧ. អចលនទ្រព្យ, សណ្ឋាគារ, ដឹកជញ្ជូន, មេធាវី...' : 'e.g. Real Estate, Hotel & Resort, Law Firm, Logistics...'}
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                      className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isKm ? 'Email ក្រុមហ៊ុន' : 'Work Email'} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {isKm ? 'លេខទូរស័ព្ទ / Telegram' : 'Phone / Telegram'}
                    </label>
                    <input
                      type="text"
                      placeholder="+855 12 345 678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    {isKm ? 'ការពិពណ៌នាសង្ខេបពីតម្រូវការ' : 'Requirements / Use Case Overview'}
                  </label>
                  <textarea
                    rows={2}
                    placeholder={isKm ? 'ពណ៌នាសង្ខេបពីអ្វីដែលអ្នកចង់ឱ្យ AI ជួយឆ្លើយតប...' : "Briefly describe what you'd like your AI Assistant to handle..."}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-slate-700 bg-slate-950 text-white rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    {isKm ? 'បោះបង់' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isSubmitting ? (isKm ? 'កំពុងបញ្ជូន...' : 'Submitting...') : (isKm ? 'បញ្ជូនសំណើ' : 'Submit Application')}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
