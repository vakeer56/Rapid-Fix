import {
    FileText,
    SearchCheck,
    Wrench,
    ArrowRight
} from "lucide-react"

const STEPS = [
  {
    icon: <FileText size={32} />,
    title: "Raise an Issue",
    description:
      "Describe your repair problem in seconds and submit it instantly.",
  },
  {
    icon: <SearchCheck size={32} />,
    title: "Get Matched",
    description:
      "RapidFix connects you with nearby trusted workers available immediately.",
  },
  {
    icon: <Wrench size={32} />,
    title: "Problem Fixed",
    description:
      "The worker arrives, resolves the issue, and gets your day back on track.",
  },
];

const HowItWorks = () => {
  return (
    <section
      id="how-it-works"
      className="w-full py-24 px-6 md:px-16 bg-transparent transition-colors duration-300"
    >
      <div className="max-w-7xl mx-auto">

        {/* SECTION HEADER */}
        <div className="text-center max-w-3xl mx-auto space-y-5">

          {/* <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-600 px-4 py-2 rounded-full text-sm font-medium">
            <Wrench size={16} />
            Simple Process
          </div> */}

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white leading-tight transition-colors duration-300">
            How
            <span className="text-blue-900 dark:text-blue-400"> Rapid</span><span className="text-orange-600 dark:text-orange-555">Fix</span> works
          </h2>

          <p className="text-lg text-gray-600 dark:text-gray-350 leading-relaxed transition-colors duration-300">
            Get repair assistance quickly through a streamlined
            3-step workflow designed for emergencies and daily fixes.
          </p>
        </div>

        {/* STEPS */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">

          {STEPS.map((step, index) => (
            <div
              key={index}
              className="relative glass-panel rounded-3xl p-8 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
            >

              {/* STEP NUMBER */}
              <div className="absolute top-6 right-6 text-5xl font-bold text-gray-200 dark:text-slate-800/40 transition-colors duration-300">
                0{index + 1}
              </div>

              {/* ICON */}
              <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                {step.icon}
              </div>

              {/* CONTENT */}
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
                  {step.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-350 leading-relaxed transition-colors duration-300">
                  {step.description}
                </p>
              </div>

              {/* ARROW */}
              {index !== STEPS.length - 1 && (
                <div className="hidden md:flex absolute -right-5 top-1/2 -translate-y-1/2 glass-panel w-10 h-10 rounded-full items-center justify-center shadow-md">
                  <ArrowRight size={18} className="text-blue-500 dark:text-blue-400" />
                </div>
              )}
            </div>
          ))}

        </div>
      </div>
    </section>
  );
};


export default HowItWorks;