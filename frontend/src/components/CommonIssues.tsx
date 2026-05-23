// CommonIssuesGrid.tsx

import {
  Zap,
  Droplets,
  Car,
  Hammer,
  Laptop,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

const issues = [
  {
    title: "Electrical Issues",
    description: "Power failure, wiring issues, switch repairs",
    icon: <Zap size={28} />,
  },

  {
    title: "Plumbing Problems",
    description: "Leakage, pipe blockage, tap repairs",
    icon: <Droplets size={28} />,
  },

  {
    title: "Vehicle Assistance",
    description: "Bike and car breakdown support",
    icon: <Car size={28} />,
  },

  {
    title: "Carpentry Work",
    description: "Furniture fixing and wood repairs",
    icon: <Hammer size={28} />,
  },

  {
    title: "Tech Support",
    description: "Laptop, router, and device setup",
    icon: <Laptop size={28} />,
  },

  {
    title: "Emergency Repairs",
    description: "Urgent home and office maintenance",
    icon: <ShieldAlert size={28} />,
  },
];

const CommonIssuesGrid = () => {
  return (
    <section className="w-full py-24 px-6 md:px-16 bg-white">
      
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">

          <p className="text-blue-900 font-semibold mb-3">
            Common Service Categories
          </p>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Raise issues faster with
            <span className="text-blue-900"> Rapid</span><span className="text-orange-600">Fix</span>
          </h2>

          <p className="text-gray-600 mt-5 max-w-2xl mx-auto text-lg">
            Select from commonly reported repair and maintenance
            problems across multiple service departments.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {issues.map((issue, index) => (
            <div
              key={index}
              className="group bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-3xl p-8 transition-all duration-300 shadow-sm hover:shadow-xl cursor-pointer"
            >

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                {issue.icon}
              </div>

              {/* Content */}
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {issue.title}
              </h3>

              <p className="text-gray-600 leading-relaxed">
                {issue.description}
              </p>

            </div>
          ))}

        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-16">

          <button className="bg-blue-900 hover:bg-blue-600 transition-all duration-300 text-white px-8 py-4 rounded-2xl font-semibold flex items-center gap-3 shadow-lg">
            Raise a New Issue
            <ArrowRight size={20} />
          </button>

        </div>

      </div>
    </section>
  );
};

export default CommonIssuesGrid;