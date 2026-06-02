import { Link } from "react-router-dom";
import { ArrowRight, Wrench } from "lucide-react";

const Hero = () => {
  return (
    <section id="home" className="w-full min-h-screen flex items-center justify-center px-6 md:px-16 bg-transparent transition-colors duration-300">
      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center pt-24 md:pt-16">
        {/* Left Content */}
        <div className="space-y-8">
            {/* Badge */}
          <div className="flex items-center gap-2 bg-orange-100/60 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 px-4 py-2 rounded-full w-fit text-sm font-medium border border-orange-200/30 dark:border-orange-500/10 backdrop-blur-sm">
            <Wrench size={16} />
            Fast local repair assistance
          </div>
            {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900 dark:text-white transition-colors duration-300">
              When local help doesn't answer,{" "}
              <span className="text-blue-900 dark:text-blue-400"> Rapid</span><span className="text-orange-600 dark:text-orange-500">Fix</span> does.
            </h1>

            <p className="text-lg text-gray-600 dark:text-gray-350 leading-relaxed max-w-xl transition-colors duration-300">
              Connect instantly with trusted electricians, plumbers, mechanics,
              carpenters, and repair professionals near you.
            </p>
          </div>
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/dashboard"
              className="bg-blue-900 hover:bg-blue-800 dark:bg-orange-600 dark:hover:bg-orange-500 transition-all duration-300 text-white px-6 py-3 rounded-4xl font-semibold flex items-center gap-2 shadow-md cursor-pointer no-underline text-center justify-center"
            >
              Raise an Issue
              <ArrowRight size={18} />
            </Link>

            <button className="border border-gray-300 dark:border-slate-700 hover:border-blue-900 dark:hover:border-orange-500 hover:text-blue-900 dark:hover:text-orange-400 bg-white/20 dark:bg-slate-900/10 backdrop-blur-sm transition-all duration-300 px-6 py-3 rounded-4xl font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
              Become a Worker
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex justify-center">

          <div className="relative w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] md:w-[450px] md:h-[450px] bg-orange-100/40 dark:bg-slate-800/30 backdrop-blur-sm rounded-[40px] flex items-center justify-center shadow-xl border border-white/20 dark:border-slate-800/20 transition-all duration-300">

            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1200&auto=format&fit=crop"
              alt="Repair Worker"
              className="w-full h-full object-cover rounded-[40px]"
            />

            {/* Floating Card */}
            <div className="absolute bottom-6 left-6 glass-panel px-5 py-4 rounded-2xl transition-colors duration-300">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Active Workers Nearby
              </p>

              <h3 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                120+
              </h3>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
