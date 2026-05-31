import { useState, useEffect, type ChangeEvent, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";
import { MapPin, AlertCircle, Upload, CheckCircle } from "lucide-react";

type ProblemProps = {
  open: boolean;
  setopen: React.Dispatch<React.SetStateAction<boolean>>;
  onProblemCreated?: () => void;
};

interface SavedAddress {
  _id: string;
  address: string;
  area: string;
  city: string;
}

export default function Problem({ open, setopen, onProblemCreated }: ProblemProps) {
  const { appUser } = useAuth();
  
  // Basic problem fields
  const [formdata, setformdata] = useState({
    problemname: "",
    description: "",
    urgency: false,
  });

  // Files
  const [picture, setPicture] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  // Address logic
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddressForm, setShowNewAddressForm] = useState<boolean>(false);
  const [newAddress, setNewAddress] = useState({
    address: "",
    area: "",
    city: "",
    district: "",
    state: "",
    pin_code: "",
  });

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
    if (files && files[0]) {
      if (name === "picture") {
        setPicture(files[0]);
      } else if (name === "video") {
        setVideo(files[0]);
      }
    }
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
      
      if (picture) {
        data.append("picture", picture);
      }
      if (video) {
        data.append("video", video);
      }

      await api.post("/problem/createProblem", data, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSuccess(true);
      setTimeout(() => {
        setopen(false);
        setSuccess(false);
        setformdata({ problemname: "", description: "", urgency: false });
        setPicture(null);
        setVideo(null);
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
    <section className="fixed inset-0 backdrop-blur-sm bg-black/50 dark:bg-black/75 z-[999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setopen(false)}
          className="absolute top-4 right-4 text-2xl font-bold text-slate-400 hover:text-red-500 dark:hover:text-red-400 w-10 h-10 transition-colors flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
        >
          &times;
        </button>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Request Raised Successfully!</h3>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Connecting with technicians near you…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">Raise a Service Request</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Describe the problem and select an address to summon a certified technician.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-3 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl px-4 py-3">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column: Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Problem Name</label>
                  <input
                    type="text"
                    name="problemname"
                    value={formdata.problemname}
                    onChange={handleInputChange}
                    placeholder="e.g. Living Room AC Not Cooling"
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Detailed Description</label>
                  <textarea
                    name="description"
                    value={formdata.description}
                    onChange={handleInputChange}
                    placeholder="Provide details of the issue (e.g. making weird noise, water dripping…)"
                    rows={4}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800">
                  <input
                    type="checkbox"
                    id="urgency"
                    name="urgency"
                    checked={formdata.urgency}
                    onChange={handleInputChange}
                    className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-orange-500 focus:ring-blue-500 dark:focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="urgency" className="block text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    Urgent Request <span className="text-red-500 dark:text-orange-400 font-normal">(Emergency technicians requested)</span>
                  </label>
                </div>
              </div>

              {/* Right Column: Files & Address */}
              <div className="space-y-4">
                {/* Uploads */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Add Photo</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors rounded-xl p-3 cursor-pointer text-center h-28 relative">
                      <Upload size={20} className="text-slate-400 mb-1.5" />
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-full">
                        {picture ? picture.name : "Upload Image"}
                      </span>
                      <input type="file" name="picture" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">Add Video</label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors rounded-xl p-3 cursor-pointer text-center h-28 relative">
                      <Upload size={20} className="text-slate-400 mb-1.5" />
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-full">
                        {video ? video.name : "Upload Clip"}
                      </span>
                      <input type="file" name="video" accept="video/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Address Selection */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-850/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin size={14} className="text-blue-500" />
                      Service Address
                    </span>
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm((v) => !v)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                      >
                        {showNewAddressForm ? "Select Saved" : "+ Add New"}
                      </button>
                    )}
                  </div>

                  {!showNewAddressForm ? (
                    <div>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none cursor-pointer"
                      >
                        {addresses.map((addr) => (
                          <option key={addr._id} value={addr._id}>
                            {addr.address}, {addr.area} ({addr.city})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        name="address"
                        placeholder="Street Address / Door No."
                        value={newAddress.address}
                        onChange={handleNewAddressChange}
                        className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                        required={showNewAddressForm}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          name="area"
                          placeholder="Area / Locality"
                          value={newAddress.area}
                          onChange={handleNewAddressChange}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          required={showNewAddressForm}
                        />
                        <input
                          type="text"
                          name="city"
                          placeholder="City"
                          value={newAddress.city}
                          onChange={handleNewAddressChange}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          required={showNewAddressForm}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="text"
                          name="district"
                          placeholder="District"
                          value={newAddress.district}
                          onChange={handleNewAddressChange}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          required={showNewAddressForm}
                        />
                        <input
                          type="text"
                          name="state"
                          placeholder="State"
                          value={newAddress.state}
                          onChange={handleNewAddressChange}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          required={showNewAddressForm}
                        />
                        <input
                          type="text"
                          name="pin_code"
                          placeholder="Pin Code"
                          value={newAddress.pin_code}
                          onChange={handleNewAddressChange}
                          className="w-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
                          required={showNewAddressForm}
                        />
                      </div>
                      {addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowNewAddressForm(false)}
                          className="text-[10px] text-slate-500 dark:text-slate-400 hover:underline block text-right w-full mt-1"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-900 dark:bg-orange-600 hover:bg-blue-800 dark:hover:bg-orange-500 text-white py-3.5 rounded-xl transition-all font-bold text-sm shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Raising Request…
                </>
              ) : (
                "Submit Repair Request →"
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}