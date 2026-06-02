import { useState, useEffect, type FormEvent } from "react";
import { X, User, Phone, Calendar, Users, Briefcase, MapPin, Upload, Loader2, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  prefillName?: string | null;
  prefillEmail?: string | null;
  role?: "user" | "worker";
}

export const ProfileCompletionModal = ({ isOpen, onClose, prefillName, prefillEmail, role = "user" }: Props) => {
  const { setupToken, onAuthSuccess, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: prefillName || "",
    age: "",
    gender: "",
    phone: "",
    experience: "",
    pincode: "",
    located_address: "",
    preferred_areas: "",
    photo: "",
  });
  
  const [loading, setLoading] = useState(false);
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [preferredAreas, setPreferredAreas] = useState<string[]>([""]);

  const addPreferredArea = () => {
    setPreferredAreas(prev => [...prev, ""]);
  };

  const handlePreferredAreaChange = (index: number, value: string) => {
    setPreferredAreas(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removePreferredArea = (index: number) => {
    if (preferredAreas.length > 1) {
      setPreferredAreas(prev => prev.filter((_, i) => i !== index));
    }
  };

  useEffect(() => {
    if (prefillName) setForm((f) => ({ ...f, name: prefillName }));
  }, [prefillName]);

  const handlePincodeChange = async (pin: string) => {
    const cleanPin = pin.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setPincodeLoading(true);
      setError("");
      try {
        const res = await api.get(`/address/pincode/${cleanPin}`);
        const data = res.data;
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
          const office = data[0].PostOffice[0];
          let matchedState = office.State;
          if (matchedState.toLowerCase() === "tamilnadu") matchedState = "Tamil Nadu";
          
          const city = office.Block && office.Block !== "NA" ? office.Block : office.District;
          const autodetectedAddress = `${city}, ${office.District}, ${matchedState} - ${cleanPin}`;
          
          setForm(prev => ({
            ...prev,
            located_address: autodetectedAddress
          }));
        } else {
          setError("Invalid pincode or details not found.");
        }
      } catch (err) {
        console.error("Completion modal pincode error:", err);
        setError("Error fetching pincode details. Please enter address manually.");
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Profile photo must be less than 5MB.");
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setForm(prev => ({ ...prev, photo: base64String }));
        setPhotoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (role === "worker") {
      const validPreferredAreas = preferredAreas.map(a => a.trim()).filter(Boolean);
      if (!form.name || !form.age || !form.gender || !form.phone || !form.experience || !form.located_address || validPreferredAreas.length === 0 || !form.photo) {
        setError("Please fill in all fields, select a gender, provide at least one preferred location, and select a compulsory profile photo.");
        return;
      }
      if (selectedCategories.length === 0) {
        setError("Please select at least one trade category.");
        return;
      }
    } else {
      if (!form.name || !form.age || !form.gender || !form.phone) {
        setError("Please fill in all fields to continue.");
        return;
      }
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);
    try {
      const payload = role === "worker" ? {
        role: "worker",
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        experience: Number(form.experience),
        located_address: form.located_address,
        preferred_areas: preferredAreas.map(a => a.trim()).filter(Boolean),
        photo: form.photo,
        phone: form.phone,
        categories: selectedCategories,
      } : {
        role: "user",
        name: form.name,
        age: Number(form.age),
        gender: form.gender,
        phone: form.phone,
      };

      const res = await api.post(
        "/auth/firebase/complete-profile",
        payload,
        { headers: { Authorization: `Bearer ${setupToken}` } }
      );

      const data = res.data;
      if (data.success && data.token) {
        onAuthSuccess(data.token, data.user);
        navigate("/dashboard", { replace: true });
      } else {
        setError(data.message || "Something went wrong.");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr?.response?.data?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isWorker = role === "worker";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.15);
          border-radius: 99px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(249, 115, 22, 0.35);
        }
      `}</style>

      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={onClose} />

      {/* Modal card */}
      <div className={`relative w-full ${isWorker ? "max-w-4xl" : "max-w-md"} bg-slate-950 border border-slate-800/80 rounded-3xl shadow-2xl shadow-black/80 overflow-hidden max-h-[90vh] flex flex-row transition-all duration-300`}>
        
        {/* Left decorative steps pane (Visible only for Service Partners on desktop) */}
        {isWorker && (
          <div className="hidden md:flex md:w-72 shrink-0 bg-slate-900 border-r border-slate-800 flex-col justify-between p-7 relative overflow-hidden select-none">
            {/* Background lighting */}
            <div className="absolute -left-12 -bottom-12 w-44 h-44 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -right-12 -top-12 w-44 h-44 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="relative z-10 space-y-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/10 px-2.5 py-1 rounded-full border border-orange-500/20">
                  Onboarding Step 2
                </span>
                <h3 className="text-xl font-extrabold text-white mt-4 tracking-tight leading-tight">Service Partner</h3>
                <p className="text-xs text-slate-300 mt-2.5 leading-relaxed font-medium">
                  Provide trade specific qualifications and locations to start receiving jobs near you.
                </p>
              </div>

              {/* Verified steps tracker */}
              <div className="space-y-5 pt-6 border-t border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xs font-black shrink-0">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-slate-200">Account Authenticated</p>
                    <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Firebase credential active</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/30 flex items-center justify-center text-xs font-black animate-pulse shrink-0">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-white">Partner Verification</p>
                    <p className="text-[11px] text-orange-400/90 font-bold mt-0.5">Fill in located trade data</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-500 border border-slate-700 flex items-center justify-center text-xs font-extrabold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500">Authorized Launch</p>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">Review complete & start earning</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 text-[10px] font-bold text-slate-500 tracking-widest uppercase">
              Powered by RapidFix Partner Core.
            </div>
          </div>
        )}

        {/* Right Form Pane */}
        <div className="flex-grow flex flex-col max-h-[90vh] overflow-hidden bg-slate-950">
          {/* Top orange/blue highlight line */}
          <div className={`h-1.5 w-full bg-gradient-to-r ${isWorker ? "from-orange-500 to-amber-500" : "from-blue-500 to-indigo-500"}`} />

          {/* Modal Header */}
          <div className="p-6 pb-4 border-b border-slate-900 flex justify-between items-start shrink-0">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight leading-none">
                {isWorker ? "Service Partner Onboarding" : "Complete Your Profile"}
              </h2>
              <p className="text-xs text-slate-400 mt-2">
                {isWorker
                  ? "Activate your partner status to start tracking dispatch logs."
                  : "Tell us a bit about yourself to get started."}
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 cursor-pointer"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Scrolling Form Body */}
          <div className="p-6 pb-12 overflow-y-auto custom-scrollbar flex-grow space-y-5">
            {/* Prefilled Profile Info Chip */}
            {prefillEmail && (
              <div className={`flex items-center gap-3 border rounded-2xl p-3 ${
                isWorker 
                  ? "bg-orange-500/5 border-orange-500/10 text-orange-400"
                  : "bg-blue-500/5 border-blue-500/10 text-blue-400"
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br shrink-0 ${
                  isWorker ? "from-orange-500 to-amber-500" : "from-blue-500 to-indigo-500"
                }`}>
                  {(prefillName || prefillEmail)?.[0]?.toUpperCase()}
                </div>
                <div className="truncate">
                  <p className="text-xs font-bold text-slate-100 truncate">
                    {prefillName}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{prefillEmail}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isWorker ? (
                /* Workers Grid split */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                  
                  {/* Left Form Column */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="Name"
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Phone Number</label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="tel"
                          required
                          placeholder="10-digit number"
                          value={form.phone}
                          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm font-semibold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-0.5">Age</label>
                        <div className="relative">
                          <Calendar size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            required
                            placeholder="Age"
                            min="16"
                            max="100"
                            value={form.age}
                            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                            className="w-full pl-8 pr-1 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-xs font-semibold"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-0.5">Gender</label>
                        <div className="relative">
                          <Users size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <select
                            required
                            value={form.gender}
                            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                            className="w-full pl-8 pr-1 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-xs appearance-none cursor-pointer font-semibold"
                          >
                            <option value="">Gender</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-0.5">Exp (Yrs)</label>
                        <div className="relative">
                          <Briefcase size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="number"
                            required
                            placeholder="Yrs"
                            min="0"
                            max="50"
                            value={form.experience}
                            onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                            className="w-full pl-8 pr-1 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Pincode</label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          placeholder="6-digit pincode"
                          maxLength={6}
                          value={form.pincode}
                          onChange={(e) => handlePincodeChange(e.target.value)}
                          className="w-full pl-10 pr-10 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm font-bold text-orange-400"
                        />
                        {pincodeLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                            <Loader2 size={14} className="animate-spin text-orange-500" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Located Address</label>
                      <div className="relative">
                        <textarea
                          required
                          placeholder="Auto-filled via Pincode"
                          value={form.located_address}
                          onChange={(e) => setForm((f) => ({ ...f, located_address: e.target.value }))}
                          rows={2}
                          className="w-full px-3 py-3 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm font-semibold resize-none leading-relaxed"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right Form Column */}
                  <div className="space-y-3.5">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">
                        Preferred Locations (At least one)
                      </label>
                      <div className="space-y-2 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                        {preferredAreas.map((area, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <div className="relative flex-grow">
                              <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                required={index === 0}
                                placeholder={index === 0 ? "e.g. City Name or District (Compulsory)" : "e.g. Popular Area Name (Optional)"}
                                value={area}
                                onChange={(e) => handlePreferredAreaChange(index, e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 focus:bg-slate-900/80 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-transparent transition-all text-sm font-semibold"
                              />
                            </div>
                            {preferredAreas.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePreferredArea(index)}
                                className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-red-950/20 hover:border-red-900/50 text-slate-400 hover:text-red-400 transition-all cursor-pointer active:scale-95 shrink-0"
                                title="Remove location"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={addPreferredArea}
                        className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-800 hover:border-orange-500/30 bg-slate-900/20 hover:bg-slate-900/40 text-slate-400 hover:text-orange-400 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer active:scale-[0.98]"
                      >
                        <Plus size={13} />
                        Add Place
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1 ml-0.5">
                        Trade Categories (Select all that apply)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "Plumber", label: "Plumber 🪠" },
                          { id: "Electrician", label: "Electrician ⚡" },
                          { id: "Mechanic", label: "Mechanic ⚙️" },
                          { id: "Technician", label: "Technician 🖥️" },
                          { id: "Other", label: "Other 🛠️" },
                        ].map((cat) => {
                          const isSelected = selectedCategories.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => {
                                setSelectedCategories((prev) =>
                                  prev.includes(cat.id)
                                    ? prev.filter((c) => c !== cat.id)
                                    : [...prev, cat.id]
                                );
                              }}
                              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-extrabold transition-all duration-200 active:scale-[0.97] cursor-pointer select-none ${
                                isSelected
                                  ? cat.id === "Plumber" ? "bg-blue-500/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10"
                                    : cat.id === "Electrician" ? "bg-amber-500/20 border-amber-500 text-amber-400 shadow-md shadow-amber-500/10"
                                    : cat.id === "Mechanic" ? "bg-purple-500/20 border-purple-500 text-purple-400 shadow-md shadow-purple-500/10"
                                    : cat.id === "Technician" ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10"
                                    : "bg-orange-600/20 border-orange-500 text-orange-400 shadow-md shadow-orange-500/10"
                                  : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              {cat.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Photo Upload with Preview */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-400 mb-1 ml-0.5">
                        Profile Photo (Compulsory)
                      </label>
                      <div className="border border-dashed border-slate-800 rounded-2xl p-4 bg-slate-900/20 flex items-center gap-3.5 hover:bg-slate-900/40 transition-colors">
                        <div className="relative w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <Upload size={16} className="text-slate-500 animate-pulse" />
                          )}
                        </div>
                        <div className="flex-grow">
                          <p className="text-xs text-slate-400 mb-2 leading-tight">Must show your face clearly so clients can identify you.</p>
                          <label className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white text-xs font-extrabold cursor-pointer transition-all active:scale-[0.97] select-none shadow-sm">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handlePhotoUpload}
                            />
                            Select Photo
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Customer Completion Form */
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="Full Name"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Phone Number</label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="Phone Number (10 digits)"
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Age</label>
                      <div className="relative">
                        <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="number"
                          required
                          placeholder="Age"
                          min="16"
                          max="100"
                          value={form.age}
                          onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm font-semibold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-0.5">Gender</label>
                      <div className="relative">
                        <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <select
                          required
                          value={form.gender}
                          onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-800 bg-slate-900/40 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-transparent transition-all text-sm appearance-none cursor-pointer font-semibold"
                        >
                          <option value="" className="text-slate-400">Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              <div className="pt-4 border-t border-slate-900 space-y-3 shrink-0">
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white text-xs tracking-wider uppercase transition-all duration-200 shadow-lg active:scale-[0.98] cursor-pointer ${
                    isWorker 
                      ? "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-orange-500/10 hover:shadow-orange-500/25" 
                      : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/10 hover:shadow-blue-500/25"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Saving Details…
                    </span>
                  ) : (
                    "Complete Onboarding Setup →"
                  )}
                </button>

                <button
                  type="button"
                  onClick={signOut}
                  className="w-full py-3 rounded-xl font-bold text-slate-400 hover:text-white text-xs transition-all border border-slate-800 hover:bg-slate-900/50 cursor-pointer active:scale-[0.98]"
                >
                  Cancel Registration & Sign Out
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      {error && (
        <>
          <style>{`
            @keyframes slideIn {
              from {
                transform: translateX(120%);
                opacity: 0;
              }
              to {
                transform: translateX(0);
                opacity: 1;
              }
            }
            .animate-slide-in {
              animation: slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          <div className="fixed top-6 right-6 z-[99999] max-w-sm w-[90%] sm:w-80 bg-slate-900/90 backdrop-blur-md border border-red-500/30 text-white rounded-2xl p-4 shadow-2xl shadow-red-950/20 animate-slide-in flex items-start gap-3">
            <div className="mt-0.5 p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 shrink-0">
              <span>⚠️</span>
            </div>
            <div className="flex-grow">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-red-400">Onboarding Error</h4>
              <p className="text-xs text-slate-200 mt-1 font-semibold leading-relaxed">{error}</p>
            </div>
            <button type="button" onClick={() => setError("")} className="text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0">
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
};
