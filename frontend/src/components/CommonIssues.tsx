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
    <section className="w-full py-24 px-6 md:px-16 bg-white">
      
      <div className="max-w-7xl mx-auto">

        {/* Heading */}
        <div className="text-center mb-16">

          <p className="text-blue-900 font-semibold mb-3">
            Common Service Categories
          </p>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
            Raise issues faster with
            <span className="text-blue-900"> Rapid<span className="text-orange-500">Fix</span></span>
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
              {/* <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                {issue.icon}
              </div> */}

                <img src={issue.image} alt={issue.title}  className=" w-full h-56 object-cover rounded-2xl"/> 


              {/* Content */}
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                {issue.title}
              </h3>

              <button className="bg-blue-900 hover:bg-blue-600 transition-all duration-300 text-white px-6 py-2 rounded-4xl font-semibold flex items-center gap-3 shadow-lg">
                Raise a New Issue
              </button>
              {/* <p className="text-gray-600 leading-relaxed">
                {issue.description}
              </p> */}

            </div>
          ))}

        </div>

        {/* CTA Button */}
        <div className="flex justify-center mt-16">

          <button onClick={()=>setopen(true)} className="bg-blue-900 hover:bg-blue-600 transition-all duration-300 text-white px-8 py-4 rounded-4xl font-semibold flex items-center gap-3 shadow-lg">
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