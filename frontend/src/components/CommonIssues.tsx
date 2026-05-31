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

const issues = [
  {
    title: "Water Pump Issues",
    image: waterpump,
  },
  
  {
    title: "Tap Issues",
    image: tap,
  },
  {
    title: "Water Heater Issues",
    image: waterheater,
  },
  {
    title: "Fan Issues",
    image: fan,
  },
  {
    title: "Water Purifier Issues",
    image: waterpurifier,
  },
  {
    title: "CCTV Issues",
    image: cctv,
  },
];

const CommonIssuesGrid = () => {
  const [open, setopen] = useState(false);
  return (
    <section className="w-full pt-24 pb-0 px-6 md:px-16 bg-white dark:bg-slate-950 transition-colors duration-300">
      
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
              className="group bg-gray-50 dark:bg-slate-900/40 hover:bg-blue-50 dark:hover:bg-slate-900/80 border border-gray-200 dark:border-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/40 rounded-3xl p-8 transition-all duration-300 shadow-sm hover:shadow-xl dark:hover:shadow-indigo-950/10 cursor-pointer flex flex-col justify-between h-[450px]"
            >
              <div>
                <img src={issue.image} alt={issue.title}  className=" w-full h-56 object-cover rounded-2xl mb-6"/> 

                {/* Content */}
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 transition-colors duration-300">
                  {issue.title}
                </h3>
              </div>

              <button onClick={() => setopen(true)} className="w-full bg-blue-900 hover:bg-blue-800 dark:bg-orange-600 dark:hover:bg-orange-500 transition-all duration-300 text-white px-6 py-3 rounded-4xl font-semibold flex items-center justify-center gap-3 shadow-md cursor-pointer">
                Raise a New Issue
              </button>
            </div>
          ))}

        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-16">

          <button onClick={()=>setopen(true)} className="bg-blue-900 hover:bg-blue-800 dark:bg-orange-600 dark:hover:bg-orange-500 transition-all duration-300 text-white px-8 py-4 rounded-4xl font-semibold flex items-center gap-3 shadow-lg cursor-pointer">
            Raise a New Issue
            <ArrowRight size={20} />
          </button>
          

        </div>
          <Problem open= {open} setopen={setopen}></Problem>
      </div>
    </section>
  );
};

export default CommonIssuesGrid;