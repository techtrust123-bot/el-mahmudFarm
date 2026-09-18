import React from 'react';
import { FiArrowLeft, FiArrowRight, FiMail, FiMessageCircle, FiShield } from 'react-icons/fi';
import { FaXTwitter } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import cloudFarmLogo from '../assets/CloudFarm_logo.png';
import { availableSocialLinks, getWhatsappUrl, siteConfig } from '../config/siteConfig';

const PublicSupportPage = () => {
  const whatsappUrl = getWhatsappUrl();

  return (
    <div className="min-h-screen bg-[#f7faf6] text-slate-900">
      <header className="border-b border-emerald-950/10 bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 lg:px-8">
          <Link to="/" className="flex items-center gap-3"><img src={cloudFarmLogo} alt="CloudFarm logo" className="h-10 w-10 rounded-xl object-contain" /><span className="text-xl font-black text-emerald-950">CloudFarm</span></Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-emerald-800"><FiArrowLeft /> Back home</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-24">
        <div className="max-w-2xl"><p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">Support center</p><h1 className="mt-3 text-5xl font-black tracking-tight text-emerald-950 sm:text-6xl">Let’s keep your farm moving.</h1><p className="mt-6 text-lg leading-8 text-slate-600">Reach CloudFarm support for help with your account, farm records, subscriptions, sales, inventory, and everyday platform workflows.</p></div>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <a href={whatsappUrl || undefined} target={whatsappUrl ? '_blank' : undefined} rel="noreferrer" className={`group border p-7 shadow-sm ${whatsappUrl ? 'border-emerald-700 bg-emerald-950 text-white hover:bg-emerald-900' : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed'}`} aria-disabled={!whatsappUrl} onClick={(event) => { if (!whatsappUrl) event.preventDefault(); }}><FiMessageCircle size={28} className="text-emerald-300" /><h2 className="mt-6 text-2xl font-black">WhatsApp support</h2><p className="mt-3 leading-7 opacity-75">Message the CloudFarm administrator for direct help with an active account or platform workflow.</p><span className="mt-7 inline-flex items-center gap-2 text-sm font-black">{whatsappUrl ? 'Open WhatsApp' : 'WhatsApp number not configured'} {whatsappUrl && <FiArrowRight className="transition-transform group-hover:translate-x-1" />}</span></a>
          <a href={siteConfig.support.email ? `mailto:${siteConfig.support.email}` : undefined} className={`border p-7 shadow-sm ${siteConfig.support.email ? 'border-slate-200 bg-white hover:border-emerald-600' : 'border-slate-200 bg-white text-slate-400 cursor-not-allowed'}`} onClick={(event) => { if (!siteConfig.support.email) event.preventDefault(); }}><FiMail size={28} className="text-emerald-700" /><h2 className="mt-6 text-2xl font-black text-emerald-950">Email support</h2><p className="mt-3 leading-7 text-slate-600">Use email for account questions, support follow-up, and issues that need more detail.</p><span className="mt-7 inline-flex text-sm font-black text-emerald-800">{siteConfig.support.email || 'Support email not configured'}</span></a>
        </div>
        <div className="mt-12 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <section className="border border-slate-200 bg-white p-7"><div className="flex items-start gap-4"><span className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><FiShield size={22} /></span><div><h2 className="text-xl font-black text-emerald-950">What support covers</h2><p className="mt-3 leading-7 text-slate-600">We can help you understand CloudFarm workflows, find records, work through subscription access, and get unstuck while managing poultry, livestock, feed, expenses, inventory, and sales.</p></div></div></section>
          <section className="border border-slate-200 bg-white p-7"><h2 className="text-xl font-black text-emerald-950">Follow CloudFarm</h2><div className="mt-5 flex flex-wrap gap-3">{availableSocialLinks.length ? availableSocialLinks.map(({ label, href }) => <a key={label} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-emerald-600 hover:text-emerald-700">{label === 'X' ? <FaXTwitter /> : <FiArrowRight />}{label}</a>) : <p className="text-sm leading-6 text-slate-500">Social links will appear here once configured by the CloudFarm team.</p>}</div></section>
        </div>
      </main>
      <footer className="border-t border-emerald-950/10 bg-emerald-950 px-5 py-6 text-center text-sm text-emerald-100/65">CloudFarm support is here to help you keep your farm records useful and current.</footer>
    </div>
  );
};

export default PublicSupportPage;
