import RapidFix from '../assets/RapidFix.png';
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-950 text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-slate-900 mt-0 transition-colors duration-300">
      
      {/* Main Grid Container */}
      <div className="max-w-7xl mx-auto px-6 md:px-16 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">
        
        {/* Brand Column */}
        <div className="space-y-6">
          <div className="flex items-center">
            <img src={RapidFix} alt="RapidFix Logo" className="h-16 dark:brightness-110 -ml-2" />
          </div>
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            RapidFix connects you instantly with trusted local experts to resolve electrical, plumbing, carpentry, and emergency repair issues seamlessly.
          </p>
          
          {/* Social Icons */}
          <div className="flex items-center gap-3">
            {[
              { 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                  </svg>
                ), 
                href: "#facebook", 
                label: "Facebook" 
              },
              { 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
                  </svg>
                ), 
                href: "#twitter", 
                label: "Twitter" 
              },
              { 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                  </svg>
                ), 
                href: "#instagram", 
                label: "Instagram" 
              },
              { 
                icon: (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                    <rect x="2" y="9" width="4" height="12"/>
                    <circle cx="4" cy="4" r="2"/>
                  </svg>
                ), 
                href: "#linkedin", 
                label: "LinkedIn" 
              }
            ].map((social, index) => (
              <a
                key={index}
                href={social.href}
                className="w-10 h-10 rounded-full border border-gray-250 dark:border-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-blue-900 dark:hover:text-orange-500 hover:bg-blue-50 dark:hover:bg-orange-950/20 hover:border-blue-200 dark:hover:border-orange-500/30 transition-all duration-300 scale-100 hover:scale-110 cursor-pointer"
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
            Quick Navigation
          </h3>
          <ul className="space-y-3 list-none p-0 m-0 text-sm">
            {[
              { label: "Home", href: "/" },
              { label: "About Us", href: "#about" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Active Services", href: "#services" }
            ].map((link, index) => (
              <li key={index}>
                <a
                  href={link.href}
                  className="hover:text-blue-900 dark:hover:text-orange-500 transition-colors duration-200 flex items-center gap-1 group no-underline"
                >
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Support & Services Column */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
            Work & Support
          </h3>
          <ul className="space-y-3 list-none p-0 m-0 text-sm">
            {[
              { label: "Raise an Issue", href: "/" },
              { label: "Become a Worker", href: "#worker" },
              { label: "Safety Regulations", href: "#safety" },
              { label: "Frequently Asked Questions", href: "#faqs" }
            ].map((link, index) => (
              <li key={index}>
                <a
                  href={link.href}
                  className="hover:text-blue-900 dark:hover:text-orange-500 transition-colors duration-200 flex items-center gap-1 group no-underline"
                >
                  <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all" />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Us Column */}
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 dark:text-white">
            Contact Support
          </h3>
          <ul className="space-y-4 list-none p-0 m-0 text-sm">
            <li className="flex items-start gap-3">
              <Mail size={18} className="text-blue-900 dark:text-orange-550 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 m-0">Email us</p>
                <a href="mailto:support@rapidfix.com" className="text-xs hover:text-blue-900 dark:hover:text-orange-500 no-underline">
                  support@rapidfix.com
                </a>
              </div>
            </li>
            
            <li className="flex items-start gap-3">
              <Phone size={18} className="text-blue-900 dark:text-orange-550 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 m-0">Call support</p>
                <a href="tel:+911234567890" className="text-xs hover:text-blue-900 dark:hover:text-orange-500 no-underline">
                  +91 12345 67890
                </a>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <MapPin size={18} className="text-blue-900 dark:text-orange-550 mt-0.5" />
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200 m-0">Our location</p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Chennai, Tamil Nadu, India
                </span>
              </div>
            </li>
          </ul>
        </div>

      </div>

      {/* Sub-Footer Copyright Area */}
      <div className="border-t border-gray-200 dark:border-slate-900 py-6 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 md:px-16 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p className="text-gray-500 dark:text-gray-400">
            © 2026 RapidFix. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#privacy" className="hover:text-blue-900 dark:hover:text-orange-500 no-underline">Privacy Policy</a>
            <a href="#terms" className="hover:text-blue-900 dark:hover:text-orange-500 no-underline">Terms of Service</a>
          </div>
        </div>
      </div>

    </footer>
  );
}