import { ArrowRight, Wrench } from "lucide-react";

const Hero = () => {
  return (
    <section className="w-full min-h-screen flex items-center justify-center px-6 md:px-16 bg-gray-50">
      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8">
            {/* Badge */}
          <div className="flex items-center gap-2 bg-orange-100 text-orange-600 px-4 py-2 rounded-full w-fit text-sm font-medium">
            <Wrench size={16} />
            Fast local repair assistance
          </div>
            {/* Heading */}
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold leading-tight text-gray-900">
              When local help doesn't answer,{" "}
              <span className="text-blue-900"> RapidFix </span> does.
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed max-w-xl">
              Connect instantly with trusted electricians, plumbers, mechanics,
              carpenters, and repair professionals near you.
            </p>
          </div>
          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button className="bg-blue-900 hover:bg-blue-500 transition-all duration-300 text-white px-6 py-3 rounded-4xl font-semibold flex items-center gap-2 shadow-md">
              Raise an Issue
              <ArrowRight size={18} />
            </button>

            <button className="border border-gray-300 hover:border-blue-900 hover:text-blue-900 transition-all duration-300 px-6 py-3 rounded-4xl font-semibold text-gray-700">
              Become a Worker
            </button>
          </div>
        </div>

        {/* Right content */}
        <div className="flex justify-center">

          <div className="relative w-[350px] h-[350px] md:w-[450px] md:h-[450px] bg-orange-100 rounded-[40px] flex items-center justify-center shadow-xl">

            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1200&auto=format&fit=crop"
              alt="Repair Worker"
              className="w-full h-full object-cover rounded-[40px]"
            />

            {/* Floating Card */}
            <div className="absolute bottom-6 left-6 bg-white px-5 py-4 rounded-2xl shadow-lg">
              <p className="text-sm text-gray-500">
                Active Workers Nearby
              </p>

              <h3 className="text-2xl font-bold text-gray-900">
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
