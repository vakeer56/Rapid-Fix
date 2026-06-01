// CommonIssuesGrid.tsx
import fan from "../assets/fan.jpg";
import tap from "../assets/tap.jpg";
import waterheater from "../assets/waterheater.jpg";
import waterpump from "../assets/waterpump.jpg";
import waterpurifier from "../assets/waterfilter.jpg";
import cctv from "../assets/cctv.jpg";

import { useState } from "react";
import {
 
  ArrowRight,
} from "lucide-react";
// import { set } from "mongoose";
import Problem from "./Problem";
import { useAuth } from "../context/AuthContext";

const issues = [
  {
    title: "Water Pump Issues",
    image: waterpump,
    category: "Plumber",
    defaultName: "Water Pump Repair & Installation",
    defaultDesc: "Water pump is not turning on, making excessive noise, or has a pressure drop / motor failure issue."
  },
  {
    title: "Tap Issues",
    image: tap,
    category: "Plumber",
    defaultName: "Leaky Tap & Faucet Maintenance",
    defaultDesc: "Faucet dripping water continuously, low water flow, or pipe joint leakage underneath the sink."
  },
  {
    title: "Water Heater Issues",
    image: waterheater,
    category: "Electrician",
    defaultName: "Geyser/Water Heater Heating Failure",
    defaultDesc: "Water heater is not heating the water, tripping the power circuit breaker, or has a water leakage."
  },
  {
    title: "Fan Issues",
    image: fan,
    category: "Electrician",
    defaultName: "Ceiling/Exhaust Fan Speed or Motor Failure",
    defaultDesc: "Ceiling fan is spinning extremely slowly, humming loudly, or has stopped working entirely."
  },
  {
    title: "Water Purifier Issues",
    image: waterpurifier,
    category: "Technician",
    defaultName: "RO Water Purifier Service & Filter Change",
    defaultDesc: "Water taste is abnormal, slow filtration rate, or filter change indicator alarm is active."
  },
  {
    title: "CCTV Issues",
    image: cctv,
    category: "Technician",
    defaultName: "CCTV Camera Offline / Recording Failure",
    defaultDesc: "IP/Analog camera displays no signal, night vision infrared has failed, or DVR storage is not recording video feed."
  },
];

const CommonIssuesGrid = () => {
  const { appUser } = useAuth();
  const [open, setopen] = useState(false);
  const [prefill, setPrefill] = useState({ name: "", desc: "", cat: "" });

  const isWorker = appUser?.role === "worker";

  const handleRaiseIssue = (issue: typeof issues[0]) => {
    if (isWorker) return;
    setPrefill({
      name: issue.defaultName,
      desc: issue.defaultDesc,
      cat: issue.category,
    });
    setopen(true);
  };

  const handleRaiseGeneralIssue = () => {
    if (isWorker) return;
    setPrefill({ name: "", desc: "", cat: "" });
    setopen(true);
  };

  return (
    <section className="w-full pt-24 pb-0 px-6 md:px-16 bg-transparent transition-colors duration-300">
      
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">

          <p className="text-blue-900 dark:text-blue-400 font-semibold mb-3">
            Common Service Categories
          </p>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white transition-colors duration-300">
            Raise issues faster with
            <span className="text-blue-900 dark:text-blue-400"> Rapid<span className="text-orange-500 dark:text-orange-500">Fix</span></span>
          </h2>

          <p className="text-gray-600 dark:text-gray-350 mt-5 max-w-2xl mx-auto text-lg transition-colors duration-300">
            Select from commonly reported repair and maintenance
            problems across multiple service departments.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">

          {issues.map((issue, index) => (
            <div
              key={index}
              className="group glass-panel rounded-3xl p-8 transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 cursor-pointer flex flex-col justify-between h-[450px]"
            >
              <div>
                <img src={issue.image} alt={issue.title}  className=" w-full h-56 object-cover rounded-2xl mb-6"/> 

                {/* Content */}
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 transition-colors duration-300">
                  {issue.title
                }</h3>
              </div>

              <button 
                onClick={() => handleRaiseIssue(issue)} 
                disabled={isWorker}
                className={`w-full transition-all duration-300 px-6 py-3 rounded-4xl font-semibold flex items-center justify-center gap-3 shadow-md ${
                  isWorker 
                    ? "bg-gray-300 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed border border-gray-400/20 dark:border-slate-700/40"
                    : "bg-blue-900 hover:bg-blue-800 dark:bg-orange-600 dark:hover:bg-orange-500 text-white cursor-pointer"
                }`}
              >
                Raise a New Issue
              </button>
            </div>
          ))}

        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-16">

          <button 
            onClick={handleRaiseGeneralIssue} 
            disabled={isWorker}
            className={`transition-all duration-300 px-8 py-4 rounded-4xl font-semibold flex items-center gap-3 shadow-lg ${
              isWorker 
                ? "bg-gray-300 dark:bg-slate-800 text-gray-500 dark:text-slate-400 cursor-not-allowed border border-gray-400/20 dark:border-slate-700/40"
                : "bg-blue-900 hover:bg-blue-800 dark:bg-orange-600 dark:hover:bg-orange-500 text-white cursor-pointer"
            }`}
          >
            Raise a New Issue
            <ArrowRight size={20} />
          </button>
          

        </div>
          <Problem 
            open={open} 
            setopen={setopen} 
            prefillName={prefill.name} 
            prefillDescription={prefill.desc} 
            prefillCategory={prefill.cat}
          />
      </div>
    </section>
  );
};

export default CommonIssuesGrid;