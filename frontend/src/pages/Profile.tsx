import { useState, useEffect, type FormEvent } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";
import { auth } from "../config/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Users, 
  Key, 
  Save, 
  ShieldAlert, 
  CheckCircle,
  MapPin,
  Trash2,
  Plus,
  Loader2
} from "lucide-react";

interface SavedAddress {
  _id: string;
  address: string;
  area: string;
  city: string;
  district: string;
  state: string;
  pin_code: number;
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

export default function Profile() {
  const { appUser, appToken, onAuthSuccess } = useAuth();

  const [form, setForm] = useState({
    name: appUser?.name || "",
    email: appUser?.email || "",
    phone: appUser?.phone || "",
    age: appUser?.age ? String(appUser.age) : "",
    gender: appUser?.gender || "",
  });

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressSuccess, setAddressSuccess] = useState("");
  const [showAddAddress, setShowAddAddress] = useState(false);
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
        console.error("Error fetching pincode details:", err);
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  useEffect(() => {
    if (appUser?._id) {
      fetchAddresses();
    }
  }, [appUser?._id]);

  const fetchAddresses = async () => {
    setAddressLoading(true);
    setAddressError("");
    try {
      const res = await api.get(`/address/getAddressesByUserId?userId=${appUser?._id}`);
      if (res.data && res.data.addresses) {
        setAddresses(res.data.addresses);
      }
    } catch (err: any) {
      console.error("Error fetching addresses:", err);
      setAddressError(err?.response?.data?.message || "Failed to load saved addresses.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleAddAddress = async (e: FormEvent) => {
    e.preventDefault();
    setAddressLoading(true);
    setAddressError("");
    setAddressSuccess("");

    const { address, area, city, district, state, pin_code } = newAddress;
    if (!address || !area || !city || !district || !state || !pin_code) {
      setAddressError("Please fill in all address fields.");
      setAddressLoading(false);
      return;
    }

    try {
      const res = await api.post("/address/addAddress", {
        belong_to: appUser?._id,
        address,
        area,
        city,
        district,
        state,
        pin_code: Number(pin_code),
      });

      if (res.status === 201) {
        setAddressSuccess("Address added successfully!");
        setNewAddress({
          address: "",
          area: "",
          city: "",
          district: "",
          state: "",
          pin_code: "",
        });
        setShowAddAddress(false);
        fetchAddresses();
      }
    } catch (err: any) {
      console.error("Error adding address:", err);
      setAddressError(err?.response?.data?.message || "Failed to add address.");
    } finally {
      setAddressLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setAddressLoading(true);
    setAddressError("");
    setAddressSuccess("");
    try {
      await api.delete(`/address/deleteAddress/${addressId}`);
      setAddressSuccess("Address deleted successfully.");
      fetchAddresses();
    } catch (err: any) {
      console.error("Error deleting address:", err);
      setAddressError(err?.response?.data?.message || "Failed to delete address.");
    } finally {
      setAddressLoading(false);
    }
  };

  const setField = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!form.name || !form.phone || !form.age || !form.gender || !form.email) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }

    try {
      const res = await api.put("/auth/profile", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        age: Number(form.age),
        gender: form.gender,
      });

      const data = res.data;
      if (data.success && data.user) {
        setSuccess("Profile updated successfully!");
        if (appToken) {
          onAuthSuccess(appToken, data.user);
        }
      } else {
        setError(data.message || "Failed to update profile.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Server error while saving.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    setError("");
    setResetSuccess(false);
    setResetLoading(true);

    if (!form.email) {
      setError("Email address is required to reset password.");
      setResetLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, form.email);
      setResetSuccess(true);
    } catch (err: any) {
      console.error(err);
      if (err?.code === "auth/user-not-found") {
        setError("No account found for this email in Firebase.");
      } else {
        setError("Failed to send reset email: " + (err.message || err));
      }
    } finally {
      setResetLoading(false);
    }
  };

  const getProviderBadge = () => {
    if (appUser?.firebaseUid) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
          Google / Firebase
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800">
        SMS OTP (Twilio)
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 px-6 md:px-16 max-w-4xl mx-auto w-full">
        {/* Header copy */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your personal profile details, authentication options, and security settings.
          </p>
        </div>

        {/* Outer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left panel: Info summary */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 text-center shadow-sm">
              <div className="relative w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-blue-500/25">
                {form.name?.[0]?.toUpperCase() || "U"}
              </div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{form.name || "User"}</h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{form.email}</p>

              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-left space-y-3.5">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Auth Method</p>
                  <div className="mt-1">{getProviderBadge()}</div>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Account ID</p>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400 break-all mt-1">
                    {appUser?._id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Forms */}
          <div className="md:col-span-2 space-y-6">
            {/* Success / Error Banners */}
            {error && (
              <div className="flex items-center gap-3 text-red-500 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-2xl px-4 py-3">
                <ShieldAlert size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 text-emerald-500 text-sm bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl px-4 py-3">
                <CheckCircle size={18} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Profile editing card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <User size={18} className="text-blue-500" />
                Personal Details
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Full Name</label>
                    <div className="relative">
                      <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={form.name}
                        onChange={setField("name")}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Email Address</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={form.email}
                        onChange={setField("email")}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Age</label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={form.age}
                        onChange={setField("age")}
                        min="16"
                        max="100"
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5 ml-0.5">Gender</label>
                    <div className="relative">
                      <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        value={form.gender}
                        onChange={setField("gender")}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm appearance-none cursor-pointer"
                        required
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="prefer_not">Prefer not</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-900 dark:bg-orange-600 hover:bg-blue-800 dark:hover:bg-orange-500 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Save size={16} />
                    {loading ? "Saving Changes…" : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>

            {/* Saved Addresses Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500">
                    <MapPin size={18} className="animate-pulse" />
                  </div>
                  Address Book
                </h3>
                {!showAddAddress && (
                  <button
                    onClick={() => setShowAddAddress(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 hover:border-orange-500/30 dark:hover:border-orange-500/30 transition-all cursor-pointer shadow-sm active:scale-[0.97]"
                  >
                    <Plus size={14} /> Add New
                  </button>
                )}
              </div>

              {addressError && (
                <div className="mb-4 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl px-3 py-2 flex items-center gap-2">
                  <ShieldAlert size={14} className="shrink-0" />
                  <span>{addressError}</span>
                </div>
              )}

              {addressSuccess && (
                <div className="mb-4 text-xs text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-xl px-3 py-2 flex items-center gap-2">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>{addressSuccess}</span>
                </div>
              )}

              {showAddAddress ? (
                <form onSubmit={handleAddAddress} className="space-y-4 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 bg-slate-50/40 dark:bg-slate-900/60 shadow-inner">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <MapPin size={12} className="text-orange-500" />
                    New Address Profile
                  </h4>
                  
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 ml-0.5">Street Address / Door No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flat 302, Green Apartments"
                      value={newAddress.address}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 ml-0.5">Area / Locality</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sector 12"
                        value={newAddress.area}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, area: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 ml-0.5">City</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dwarka"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 ml-0.5 flex items-center gap-1.5">
                        Pin Code
                        {pincodeLoading && <Loader2 size={10} className="animate-spin text-orange-500 shrink-0" />}
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 606603"
                        maxLength={6}
                        value={newAddress.pin_code}
                        onChange={(e) => handlePincodeChange(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-xs font-semibold text-orange-600 dark:text-orange-400"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 ml-0.5">District</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tiruvannamalai"
                        value={newAddress.district}
                        onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 ml-0.5">State</label>
                      <div className="relative">
                        <select
                          required
                          value={newAddress.state}
                          onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500/40 focus:border-transparent outline-none transition-all text-xs appearance-none cursor-pointer font-medium"
                        >
                          <option value="" disabled className="text-slate-400">Select State</option>
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">
                              {st}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddAddress(false)}
                      className="px-4 py-2 rounded-xl text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer active:scale-[0.97]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addressLoading}
                      className="px-5 py-2 rounded-xl bg-blue-900 dark:bg-orange-600 hover:bg-blue-800 dark:hover:bg-orange-500 text-white font-bold text-xs shadow-sm active:scale-[0.97] transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      {addressLoading && <Loader2 size={12} className="animate-spin" />}
                      Save Profile
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  {addressLoading && addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                      <p className="text-xs mt-2">Loading your address profiles...</p>
                    </div>
                  ) : addresses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
                      <MapPin size={24} className="mb-2 text-slate-300 dark:text-slate-700" />
                      <p className="text-xs font-bold">No saved addresses</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] text-center leading-relaxed">Add a profile to easily select it during service requests.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3.5">
                      {addresses.map((addr) => (
                        <div
                          key={addr._id}
                          className="group relative flex items-start justify-between p-4.5 rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 hover:border-orange-500/30 dark:hover:border-orange-500/30 hover:bg-slate-50/70 dark:hover:bg-slate-900/80 shadow-sm hover:shadow transition-all duration-300"
                        >
                          <div className="flex gap-4">
                            <div className="mt-1 p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 shrink-0 flex items-center justify-center shadow-inner">
                              <MapPin size={16} />
                            </div>
                            <div className="pr-12">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight capitalize">
                                {addr.address}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 capitalize">
                                {addr.area}, {addr.city}
                              </p>
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 uppercase font-medium tracking-wide">
                                {addr.district}, {addr.state} - <strong className="font-semibold text-orange-600 dark:text-orange-400 font-mono text-xs ml-0.5">{addr.pin_code}</strong>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteAddress(addr._id)}
                            className="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 border border-transparent hover:border-red-100 dark:hover:border-red-900/40 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 shadow-sm"
                            title="Delete Address"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Password security card (only useful if using Firebase Auth) */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                <Key size={18} className="text-orange-500" />
                Security & Passwords
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Request a password reset email to change your login credentials via secure Firebase links.
              </p>

              {resetSuccess ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-2xl p-4 flex items-start gap-3">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Reset Email Dispatched!</h4>
                    <p className="text-xs mt-1 leading-relaxed">
                      We have sent a password reset link to <strong className="font-semibold">{form.email}</strong>. 
                      Please verify your inbox and spam filters to reset.
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                >
                  <Key size={14} />
                  {resetLoading ? "Dispatching link…" : "Send Password Reset Email"}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
