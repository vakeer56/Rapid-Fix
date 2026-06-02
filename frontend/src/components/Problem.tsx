import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";
import { 
  MapPin, 
  AlertCircle, 
  Upload, 
  CheckCircle, 
  ArrowLeft, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Video as VideoIcon,
  Loader2
} from "lucide-react";

type ProblemProps = {
  open: boolean;
  setopen: React.Dispatch<React.SetStateAction<boolean>>;
  onProblemCreated?: () => void;
  prefillName?: string;
  prefillDescription?: string;
  prefillCategory?: string;
};

interface SavedAddress {
  _id: string;
  address: string;
  area: string;
  city: string;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export default function Problem({ 
  open, 
  setopen, 
  onProblemCreated,
  prefillName,
  prefillDescription,
  prefillCategory
}: ProblemProps) {
  const { appUser } = useAuth();
  
  // Basic problem fields
  const [formdata, setformdata] = useState({
    problemname: "",
    description: "",
    urgency: false,
  });

  // Files & Previews
  const [pictures, setPictures] = useState<File[]>([]);
  const [picturePreviews, setPicturePreviews] = useState<string[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<{ name: string; size: string }[]>([]);
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    if (open) {
      setformdata({
        problemname: prefillName || "",
        description: prefillDescription || "",
        urgency: false,
      });
      setCategory(prefillCategory || "");
    }
  }, [open, prefillName, prefillDescription, prefillCategory]);

  // Address logic
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(false);
  const [saveAddress, setSaveAddress] = useState<boolean>(true);
  const [newAddress, setNewAddress] = useState({
    address: "",
    area: "",
    city: "",
    district: "",
    state: "",
    pin_code: "",
  });
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const handlePincodeChange = async (pin: string) => {
    const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
    setNewAddress(prev => ({ ...prev, pin_code: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await api.get(`/address/pincode/${cleanPin}`);
        const data = res.data;
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
          const office = data[0].PostOffice[0];
          
          let matchedState = office.State;
          if (matchedState.toLowerCase() === "tamilnadu") {
            matchedState = "Tamil Nadu";
          }
          
          const standardState = INDIAN_STATES.find(
            s => s.toLowerCase().replace(/\s+/g, "") === matchedState.toLowerCase().replace(/\s+/g, "")
          ) || matchedState;

          const resolvedCity = office.Block && office.Block !== "NA" ? office.Block : office.District;
          setNewAddress(prev => ({
            ...prev,
            city: resolvedCity || prev.city,
            district: office.District || prev.district,
            state: standardState || prev.state,
          }));
        }
      } catch (err) {
        console.error("Error fetching pincode details inside Problem:", err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Load existing addresses on mount
  useEffect(() => {
    if (open && appUser?._id) {
      fetchAddresses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, appUser]);

  const fetchAddresses = async () => {
    try {
      const res = await api.get(`/address/getAddressesByUserId?userId=${appUser?._id}`);
      if (res.data && res.data.addresses) {
        setAddresses(res.data.addresses);
        if (res.data.addresses.length > 0) {
          setSelectedAddressId(res.data.addresses[0]._id);
          setShowNewAddressForm(false);
        } else {
          setShowNewAddressForm(true);
        }
      }
    } catch (err) {
      console.error("Error fetching addresses:", err);
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setformdata((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleNewAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewAddress((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files) {
      const filesArray = Array.from(files);
      if (name === "picture") {
        if (pictures.length + filesArray.length > 10) {
          setError("You can upload a maximum of 10 pictures.");
          return;
        }
        setPictures(prev => [...prev, ...filesArray]);
        setPicturePreviews(prev => [
          ...prev,
          ...filesArray.map(file => URL.createObjectURL(file))
        ]);
      } else if (name === "video") {
        if (videos.length + filesArray.length > 5) {
          setError("You can upload a maximum of 5 videos.");
          return;
        }
        setVideos(prev => [...prev, ...filesArray]);
        setVideoPreviews(prev => [
          ...prev,
          ...filesArray.map(file => ({
            name: file.name,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          }))
        ]);
      }
    }
  };

  const removePicture = (index: number) => {
    setPictures(prev => prev.filter((_, i) => i !== index));
    setPicturePreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setVideoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!appUser?._id) {
      setError("Please sign in to raise a request.");
      setLoading(false);
      return;
    }

    if (!formdata.problemname || !formdata.description) {
      setError("Problem name and description are required.");
      setLoading(false);
      return;
    }

    if (!category) {
      setError("Please select a problem category.");
      setLoading(false);
      return;
    }

    try {
      let finalAddressId = selectedAddressId;

      // 1. Handle Inline Address Creation if needed
      if (showNewAddressForm) {
        const { address, area, city, district, state, pin_code } = newAddress;
        if (!address || !area || !city || !district || !state || !pin_code) {
          setError("All address fields are required for a new address.");
          setLoading(false);
          return;
        }

        const addressRes = await api.post("/address/addAddress", {
          belong_to: appUser._id,
          address,
          area,
          city,
          district,
          state,
          pin_code: Number(pin_code),
          isSaved: saveAddress,
        });

        if (addressRes.data && addressRes.data.addressId) {
          finalAddressId = addressRes.data.addressId;
        } else {
          throw new Error("Failed to create new address profile");
        }
      }

      if (!finalAddressId) {
        setError("Please select or add an address for service.");
        setLoading(false);
        return;
      }

      // 2. Submit the multipart/form-data problem details
      const data = new FormData();
      data.append("name", formdata.problemname);
      data.append("description", formdata.description);
      data.append("urgency", String(formdata.urgency));
      data.append("address", finalAddressId);
      data.append("category", category);
      
      pictures.forEach((pic) => {
        data.append("picture", pic);
      });
      videos.forEach((vid) => {
        data.append("video", vid);
      });

      await api.post("/problem/createProblem", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      setTimeout(() => {
        setopen(false);
        setSuccess(false);
        setformdata({ problemname: "", description: "", urgency: false });
        setPictures([]);
        setPicturePreviews([]);
        setVideos([]);
        setVideoPreviews([]);
        setCategory("");
        if (onProblemCreated) onProblemCreated();
      }, 1800);

    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || err.message || "Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <section className="fixed inset-0 z-[999] bg-slate-950 flex flex-col lg:flex-row overflow-hidden animate-fade-in font-sans">
      
      {/* ── LEFT IMMERSIVE BRANDING PANEL (35% Width) ── */}
      <div className="hidden lg:flex lg:w-[35%] xl:w-[30%] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative flex-col justify-between p-12 overflow-hidden border-r border-slate-900/60">
        
        {/* Dynamic Glowing Background Effects */}
        <div className="absolute top-[-10%] right-[-10%] w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Brand/Portal Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
            <Zap className="w-5 h-5 animate-pulse" />
          </div>
          <span className="text-sm font-extrabold tracking-wider text-white uppercase">RapidFix Portal</span>
        </div>

        {/* Central Core Progress / Value Props */}
        <div className="relative z-10 space-y-8 my-auto">
          <div>
            <h1 className="text-3xl font-extrabold text-white leading-tight">
              Raise a<br />
              <span className="bg-gradient-to-r from-orange-400 to-amber-300 bg-clip-text text-transparent">
                Service Request
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Define your repair needs, upload diagnostics, and dispatch background-verified specialists to your home.
            </p>
          </div>

          {/* Value Progress Checklist */}
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs shrink-0 font-bold">1</div>
              <div>
                <h4 className="text-xs font-bold text-white">Describe Your Problem</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Specify AC, plumbing, or electric issues</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs shrink-0 font-bold">2</div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">Address & Diagnostics</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Upload visual guides and select the location</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 border border-slate-800 text-slate-400 text-xs shrink-0 font-bold">3</div>
              <div>
                <h4 className="text-xs font-bold text-slate-300">Dynamic Dispatch</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Rapidly matches you with background-verified Pros</p>
              </div>
            </div>
          </div>
        </div>

        {/* Verified Badging */}
        <div className="relative z-10 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-4 flex gap-3 items-center">
          <ShieldCheck className="text-emerald-400 w-8 h-8 shrink-0" />
          <div>
            <h4 className="text-white font-bold text-[11px]">100% Background Verified</h4>
            <p className="text-[9px] text-slate-400 mt-0.5">All local service providers are certified & background-verified.</p>
          </div>
        </div>

      </div>

      {/* ── RIGHT DYNAMIC FORM PANEL (Full Width / Rest of Screen) ── */}
      <div className="flex-1 bg-slate-950/95 backdrop-blur-xl relative flex flex-col justify-between overflow-y-auto">
        
        {/* Full-width Close Button */}
        <button
          onClick={() => setopen(false)}
          className="absolute top-6 right-8 z-10 text-slate-400 hover:text-white transition-all w-11 h-11 flex items-center justify-center rounded-full bg-slate-900/60 border border-slate-800 hover:border-slate-700 cursor-pointer shadow-lg active:scale-95"
          title="Close Portal"
        >
          <ArrowLeft size={16} />
        </button>

        {/* Dynamic Center Panel */}
        <div className="w-full max-w-4xl mx-auto px-6 py-12 sm:px-12 md:py-16 my-auto">
          {success ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse-glow">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
                <CheckCircle className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-3xl font-extrabold text-white">Request Dispatched Successfully!</h2>
              <p className="text-slate-400 text-sm mt-3 max-w-md mx-auto leading-relaxed">
                Your emergency request is active. We are matching background-verified technicians near your location right now.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
              
              {/* Header Title for Mobile / Tablet */}
              <div className="lg:hidden space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">RapidFix Portal</span>
                </div>
                <h2 className="text-3xl font-extrabold text-white">Raise a Service Request</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Provide repair details, diagnostics, and address to summons immediate technical services.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 text-red-400 text-xs bg-red-950/20 border border-red-900/40 rounded-2xl px-5 py-4 animate-fade-in">
                  <AlertCircle size={16} className="shrink-0 animate-pulse" />
                  <span>{error}</span>
                </div>
              )}

              {/* 2-Column Desktop Grid for Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Column 1: Details */}
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-0.5">Problem Category</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full border border-slate-800 bg-slate-900/40 text-white rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all text-sm cursor-pointer appearance-none"
                        required
                      >
                        <option value="" disabled className="bg-slate-950 text-slate-500">Select Category</option>
                        <option value="Plumber" className="bg-slate-950 text-white">Plumber 🪠</option>
                        <option value="Electrician" className="bg-slate-950 text-white">Electrician ⚡</option>
                        <option value="Mechanic" className="bg-slate-950 text-white">Mechanic ⚙️</option>
                        <option value="Technician" className="bg-slate-950 text-white">Technician 🖥️</option>
                        <option value="Other" className="bg-slate-950 text-white">Other 🛠️</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-0.5">Problem Name</label>
                    <input
                      type="text"
                      name="problemname"
                      value={formdata.problemname}
                      onChange={handleInputChange}
                      placeholder="e.g. Living Room AC Not Cooling"
                      className="w-full border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 ml-0.5">Detailed Description</label>
                    <textarea
                      name="description"
                      value={formdata.description}
                      onChange={handleInputChange}
                      placeholder="Describe what's happening (e.g. compressor makes a clicking noise, water leaking from vent...)"
                      rows={5}
                      className="w-full border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 rounded-xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent transition-all text-sm resize-none scrollbar-thin"
                      required
                    />
                  </div>

                  {/* Urgency Glowing Slider card */}
                  <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                    formdata.urgency 
                      ? "bg-orange-500/10 border-orange-500/30 shadow-lg shadow-orange-500/5" 
                      : "bg-slate-900/40 border-slate-800"
                  }`}>
                    <div className="flex items-start gap-3.5">
                      <input
                        type="checkbox"
                        id="urgency"
                        name="urgency"
                        checked={formdata.urgency}
                        onChange={handleInputChange}
                        className="w-5 h-5 mt-0.5 rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500 focus:ring-offset-slate-950 cursor-pointer"
                      />
                      <div className="cursor-pointer" onClick={() => setformdata(f => ({ ...f, urgency: !f.urgency }))}>
                        <label htmlFor="urgency" className="block text-xs font-extrabold text-white cursor-pointer flex items-center gap-1.5">
                          <Zap size={14} className={formdata.urgency ? "text-orange-400 fill-orange-400 animate-pulse" : "text-slate-400"} />
                          Urgent Emergency Dispatch
                        </label>
                        <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                          Check this if you need immediate local attention. Nearby emergency technicians are pinged first.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2: Uploads & Addresses */}
                <div className="space-y-5">
                  
                  {/* Uploads row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Diagnostic Photos</label>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 cursor-pointer text-center h-28 border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300">
                        <Upload size={18} className="text-slate-500 mb-1.5" />
                        <span className="text-[10px] font-bold text-slate-300">Upload Images</span>
                        <span className="text-[8px] text-slate-500 mt-0.5">Select up to 10 JPG, PNG</span>
                        <input type="file" name="picture" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400">Diagnostic Videos</label>
                      <label className="flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-3 cursor-pointer text-center h-28 border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 transition-all duration-300">
                        <Upload size={18} className="text-slate-500 mb-1.5" />
                        <span className="text-[10px] font-bold text-slate-300">Upload Clips</span>
                        <span className="text-[8px] text-slate-500 mt-0.5">Select up to 5 MP4, MOV</span>
                        <input type="file" name="video" accept="video/*" multiple onChange={handleFileChange} className="hidden" />
                      </label>
                    </div>
                  </div>

                  {/* Media Preview Strip */}
                  {(picturePreviews.length > 0 || videoPreviews.length > 0) && (
                    <div className="border border-slate-800 bg-slate-900/20 rounded-2xl p-4 space-y-3">
                      <h4 className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Attached Diagnostics</h4>
                      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                        {picturePreviews.map((src, index) => (
                          <div key={`pic-${index}`} className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-800 group shadow-md">
                            <img src={src} alt="Attached Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removePicture(index)}
                              className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-red-650 text-white rounded-full w-4 flex items-center justify-center h-4 text-[9px] font-bold transition-all border border-white/10 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}

                        {videoPreviews.map((vid, index) => (
                          <div key={`vid-${index}`} className="relative w-20 h-16 rounded-lg bg-indigo-950/40 border border-indigo-900 flex flex-col items-center justify-center p-1.5 shrink-0 group text-center shadow-md">
                            <VideoIcon size={14} className="text-indigo-400 mb-1 animate-pulse" />
                            <span className="text-[7px] font-bold text-slate-300 truncate max-w-full leading-tight">{vid.name}</span>
                            <span className="text-[6px] text-indigo-400 font-bold uppercase">{vid.size}</span>
                            <button
                              type="button"
                              onClick={() => removeVideo(index)}
                              className="absolute top-0.5 right-0.5 bg-black/75 hover:bg-red-650 text-white rounded-full w-4 flex items-center justify-center h-4 text-[9px] font-bold transition-all border border-white/10 cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Service Address Module */}
                  <div className="border border-slate-800 rounded-2xl p-4 bg-slate-900/30">
                    <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2.5">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 flex items-center gap-1.5">
                        <MapPin size={12} className="text-orange-500" />
                        Service Address
                      </span>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNewAddressForm((v) => !v)}
                          className="text-[10px] text-orange-400 hover:text-orange-300 transition-colors font-bold cursor-pointer"
                        >
                          {showNewAddressForm ? "Select Saved Address" : "+ Create New Address"}
                        </button>
                      )}
                    </div>

                    {!showNewAddressForm ? (
                      <div>
                        <select
                          value={selectedAddressId}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-950 text-slate-200 text-xs focus:ring-2 focus:ring-orange-500/50 outline-none cursor-pointer appearance-none transition-all"
                        >
                          {addresses.map((addr) => (
                            <option key={addr._id} value={addr._id} className="bg-slate-950">
                              {addr.address}, {addr.area} ({addr.city})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2.5 animate-fade-in">
                        <input
                          type="text"
                          name="address"
                          placeholder="Street Address / Door No."
                          value={newAddress.address}
                          onChange={handleNewAddressChange}
                          className="w-full border border-slate-800 bg-slate-950 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                          required={showNewAddressForm}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            name="area"
                            placeholder="Area / Locality"
                            value={newAddress.area}
                            onChange={handleNewAddressChange}
                            className="w-full border border-slate-800 bg-slate-950 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                            required={showNewAddressForm}
                          />
                          <input
                            type="text"
                            name="city"
                            placeholder="City"
                            value={newAddress.city}
                            onChange={handleNewAddressChange}
                            className="w-full border border-slate-800 bg-slate-950 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                            required={showNewAddressForm}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              name="pin_code"
                              placeholder="Pin Code"
                              maxLength={6}
                              value={newAddress.pin_code}
                              onChange={(e) => handlePincodeChange(e.target.value)}
                              className="w-full border border-slate-800 bg-slate-950 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none font-semibold text-orange-500"
                              required={showNewAddressForm}
                            />
                            {pincodeLoading && (
                              <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-orange-500" />
                            )}
                          </div>
                          <input
                            type="text"
                            name="district"
                            placeholder="District"
                            value={newAddress.district}
                            onChange={handleNewAddressChange}
                            className="w-full border border-slate-800 bg-slate-950 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none"
                            required={showNewAddressForm}
                          />
                          <div className="relative">
                            <select
                              required={showNewAddressForm}
                              value={newAddress.state}
                              onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                              className="w-full border border-slate-800 bg-slate-950 text-slate-200 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-orange-500 outline-none appearance-none cursor-pointer"
                            >
                              <option value="" disabled className="text-slate-600">State</option>
                              {INDIAN_STATES.map((st) => (
                                <option key={st} value={st} className="bg-slate-950 text-white">
                                  {st}
                                </option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">▼</div>
                          </div>
                        </div>

                        {/* Save Address for Future Use Checkbox */}
                        <div className="flex items-center gap-2 mt-1 ml-0.5 select-none animate-fade-in">
                          <input
                            type="checkbox"
                            id="save-address-checkbox"
                            checked={saveAddress}
                            onChange={(e) => setSaveAddress(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-slate-800 bg-slate-950 text-orange-500 focus:ring-orange-500/50 cursor-pointer accent-orange-500"
                          />
                          <label
                            htmlFor="save-address-checkbox"
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-300 cursor-pointer transition-colors"
                          >
                            Save this address to my profile for future use
                          </label>
                        </div>
                        {addresses.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowNewAddressForm(false)}
                            className="text-[10px] text-slate-500 hover:text-white transition-colors block text-right w-full mt-1 font-bold cursor-pointer"
                          >
                            Cancel & Select Saved
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Dispatch bar */}
              <div className="pt-6 border-t border-slate-900 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white rounded-xl transition-all duration-200 font-bold text-sm shadow-lg shadow-orange-500/10 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Dispatching Request…
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} className="animate-pulse" />
                      Submit & Dispatch Pro Request →
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>

        {/* Footer info bar */}
        <div className="border-t border-slate-900/60 py-4 px-8 text-center text-[10px] text-slate-500 bg-slate-950/40">
          Secured system encryption. By submitting this request, you agree to dispatch background-verified technician services.
        </div>

      </div>

    </section>
  );
}