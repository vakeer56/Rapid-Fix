import { ShieldCheck, Sparkles, Clock, Star } from "lucide-react";

export default function About() {
  return (
    <section
      id="about"
      className="w-full py-24 px-6 md:px-16 bg-transparent transition-colors duration-300 relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-5 mb-16">
          <p className="text-blue-900 dark:text-blue-400 font-semibold mb-3 tracking-wider uppercase text-sm">
            About Our Mission
          </p>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight transition-colors duration-300">
            Redefining Emergency
            <span className="text-blue-900 dark:text-blue-400"> Local</span><span className="text-orange-600 dark:text-orange-500"> Repairs</span>
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-350 leading-relaxed transition-colors duration-300">
            RapidFix was built with a simple mission: to bridge the gap when local services are unavailable. We match emergency repair needs with nearby certified professionals instantly, eliminating long wait times and billing uncertainties.
          </p>
        </div>

        {/* Outer 2-Column Info Block */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Text Block */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-panel rounded-3xl p-8 space-y-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="text-orange-500" size={24} />
                Why RapidFix Stands Out
              </h3>
              
              <p className="text-gray-600 dark:text-gray-350 text-sm leading-relaxed">
                Traditional directory platforms require you to call dozens of numbers, negotiate rates, and invite unverified service providers into your home. RapidFix changes the game by automating the dispatch process based on location and trade specializations.
              </p>

              <div className="space-y-4 pt-4 border-t border-gray-150 dark:border-slate-800">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">60-Second Dispatching</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Our dynamic queue immediately alerts background-verified specialists near you.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">100% Certified Professionals</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Every service partner undergoes comprehensive criminal and certification checks.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <Star size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm">Transparency First</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Upfront pricing estimations, direct review system, and zero hidden dispatch fees.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Metrics Block */}
          <div className="lg:col-span-5 grid grid-cols-1 gap-6">
            <div className="glass-panel rounded-3xl p-6 shadow-md text-center">
              <h4 className="text-4xl font-extrabold text-blue-900 dark:text-blue-400">120+</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mt-2">Active Service Partners</p>
            </div>

            <div className="glass-panel rounded-3xl p-6 shadow-md text-center">
              <h4 className="text-4xl font-extrabold text-orange-600 dark:text-orange-500">60s</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mt-2">Average Dispatch Match</p>
            </div>

            <div className="glass-panel rounded-3xl p-6 shadow-md text-center">
              <h4 className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-500">4.9★</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold mt-2">Customer Satisfaction Rating</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
