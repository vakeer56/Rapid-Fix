import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import WorkerBadge from "../components/WorkerBadge";
import { useAuth } from "../context/AuthContext";
import api from "../service/api";
import { auth } from "../config/firebase";
import { sendPasswordResetEmail, RecaptchaVerifier, linkWithPhoneNumber } from "firebase/auth";
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
  Loader2,
  Briefcase,
  ShieldCheck,
  BadgeCheck,
  FileText,
  UploadCloud,
  Clock,
  Camera,
  ChevronRight,
  Lock,
  AlertTriangle,
  X,
  type LucideIcon
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

// Shared style tokens for a consistent, professional SaaS look
const CARD = "bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm";
const INPUT = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const INPUT_ICON = "w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all";
const LABEL = "block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5";

// Per-document-type config: number field label, placeholder, formatting & validation
interface DocTypeConfig {
  numberLabel: string;
  placeholder: string;
  maxLength: number;
  hint: string;
  normalize: (v: string) => string;
  validate: (v: string) => boolean;
  error: string;
}

const DOC_TYPES: Record<string, DocTypeConfig> = {
  "Aadhaar Card": {
    numberLabel: "Aadhaar Number",
    placeholder: "1234 5678 9012",
    maxLength: 14, // 12 digits + 2 spaces
    hint: "12-digit number as printed on your Aadhaar card.",
    normalize: (v) => v.replace(/\D/g, "").slice(0, 12).replace(/(.{4})(?=.)/g, "$1 "),
    validate: (v) => /^\d{12}$/.test(v.replace(/\D/g, "")),
    error: "Enter a valid 12-digit Aadhaar number.",
  },
  "PAN Card": {
    numberLabel: "PAN Number",
    placeholder: "ABCDE1234F",
    maxLength: 10,
    hint: "10 characters: 5 letters, 4 digits, then 1 letter.",
    normalize: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
    validate: (v) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase()),
    error: "Enter a valid PAN (e.g. ABCDE1234F).",
  },
  "Driving Licence": {
    numberLabel: "Driving Licence Number",
    placeholder: "TN0120231234567",
    maxLength: 16,
    hint: "State code + RTO + year + serial (e.g. TN0120231234567).",
    normalize: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16),
    validate: (v) => /^[A-Z]{2}[0-9]{12,14}$/.test(v.toUpperCase().replace(/[^A-Z0-9]/g, "")),
    error: "Enter a valid driving licence number (e.g. TN0120231234567).",
  },
  "Voter ID": {
    numberLabel: "Voter ID (EPIC) Number",
    placeholder: "ABC1234567",
    maxLength: 10,
    hint: "10 characters: 3 letters followed by 7 digits.",
    normalize: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10),
    validate: (v) => /^[A-Z]{3}[0-9]{7}$/.test(v.toUpperCase()),
    error: "Enter a valid Voter ID / EPIC number (e.g. ABC1234567).",
  },
  "Passport": {
    numberLabel: "Passport Number",
    placeholder: "A1234567",
    maxLength: 8,
    hint: "8 characters: 1 letter followed by 7 digits.",
    normalize: (v) => v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
    validate: (v) => /^[A-Z][0-9]{7}$/.test(v.toUpperCase()),
    error: "Enter a valid passport number (e.g. A1234567).",
  },
};

export default function Profile() {
  const { appUser, appToken, onAuthSuccess, signOut } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: appUser?.name || "",
    email: appUser?.email || "",
    phone: appUser?.phone || "",
    age: appUser?.age ? String(appUser.age) : "",
    gender: appUser?.gender || "",
    experience: appUser?.experience ? String(appUser.experience) : "",
    located_address: appUser?.located_address || "",
    preferred_areas: appUser?.preferred_areas?.join(", ") || "",
    categories: appUser?.categories?.join(", ") || "",
  });

  const [photo, setPhoto] = useState<string>("");
  const [photoPreview, setPhotoPreview] = useState<string>(appUser?.photo || "");

  // Worker government-document verification states
  const [verification, setVerification] = useState<{
    governmentVerification?: {
      status: "none" | "pending" | "approved" | "rejected";
      documentType?: string;
      documentNumber?: string;
      documentImages?: string[];
      rejectionReason?: string;
    };
    badge?: { tier: string; label: string };
  } | null>(null);
  const [docType, setDocType] = useState<string>("Aadhaar Card");
  const [docNumber, setDocNumber] = useState<string>("");
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [docPreviews, setDocPreviews] = useState<{ url: string; name: string; isImage: boolean }[]>([]);
  const [docSubmitting, setDocSubmitting] = useState<boolean>(false);
  const [docError, setDocError] = useState<string>("");
  const [docSuccess, setDocSuccess] = useState<string>("");

  const docCfg = DOC_TYPES[docType] || DOC_TYPES["Aadhaar Card"];

  const handleDocTypeChange = (value: string) => {
    setDocType(value);
    setDocNumber("");
    setDocError("");
  };

  const handleDocNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDocNumber(docCfg.normalize(e.target.value));
    setDocError("");
  };

  const handleDocFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    e.target.value = ""; // allow re-selecting the same file
    if (!incoming.length) return;
    setDocError("");
    setDocFiles((prev) => [...prev, ...incoming].slice(0, 3));
    setDocPreviews((prev) =>
      [
        ...prev,
        ...incoming.map((f) => ({ url: URL.createObjectURL(f), name: f.name, isImage: f.type.startsWith("image/") })),
      ].slice(0, 3)
    );
  };

  const removeDocFile = (index: number) => {
    setDocPreviews((prev) => {
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
    setDocFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Phone Verification States
  const [verificationStep, setVerificationStep] = useState<"idle" | "sending" | "otp_sent" | "verifying">("idle");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [phoneError, setPhoneError] = useState("");
  const [phoneSuccess, setPhoneSuccess] = useState("");

  // Email Verification States
  const [emailVerificationStep, setEmailVerificationStep] = useState<"idle" | "sending" | "otp_sent" | "verifying">("idle");
  const [emailVerificationCode, setEmailVerificationCode] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  // Critical Edit Modal States
  const [editingField, setEditingField] = useState<"phone" | "email" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");

  // Active settings section (SaaS-style left nav)
  const [activeSection, setActiveSection] = useState<"profile" | "verification" | "addresses" | "security" | "danger">("profile");

  const openEditModal = (field: "phone" | "email") => {
    setEditingField(field);
    setEditValue(form[field]);
    setEditError("");
  };

  const handleConfirmEdit = () => {
    setEditError("");
    if (editingField === "phone") {
      const cleanPhone = editValue.replace(/\D/g, "");
      if (!/^\d{10}$/.test(cleanPhone)) {
        setEditError("Please enter a valid 10-digit phone number.");
        return;
      }
      setForm(f => ({ ...f, phone: cleanPhone }));
    } else if (editingField === "email") {
      const cleanEmail = editValue.trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        setEditError("Please enter a valid email address.");
        return;
      }
      setForm(f => ({ ...f, email: cleanEmail }));
    }
    setEditingField(null);
  };

  const handleSendOTP = async () => {
    setPhoneError("");
    setPhoneSuccess("");
    if (!/^\d{10}$/.test(form.phone)) {
      setPhoneError("Please enter a valid 10-digit phone number first.");
      return;
    }
    setVerificationStep("sending");
    try {
      const formatPhone = `+91${form.phone}`;

      // Clean up any old recaptcha container/verifier
      const oldContainer = document.getElementById("recaptcha-container");
      if (oldContainer) {
        oldContainer.innerHTML = "";
      }

      const verifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });

      if (!auth.currentUser) {
        throw new Error("No active Firebase session found. Please re-login.");
      }

      const confirmation = await linkWithPhoneNumber(auth.currentUser, formatPhone, verifier);
      setConfirmationResult(confirmation);
      setVerificationStep("otp_sent");
      setPhoneSuccess(`Verification code sent to +91 ${form.phone}!`);
    } catch (err: any) {
      console.error("Error sending OTP:", err);
      let msg = err.message || "Failed to send verification code.";
      if (err.code === "auth/credential-already-in-use") {
        msg = "This phone number is already linked to another worker profile.";
      } else if (err.code === "auth/invalid-phone-number") {
        msg = "Invalid phone number format.";
      }
      setPhoneError(msg);
      setVerificationStep("idle");
    }
  };

  const handleVerifyOTP = async () => {
    setPhoneError("");
    setPhoneSuccess("");
    if (!/^\d{6}$/.test(verificationCode)) {
      setPhoneError("Please enter a valid 6-digit OTP.");
      return;
    }
    setVerificationStep("verifying");
    try {
      if (!confirmationResult) {
        throw new Error("No active verification session found. Please request a new code.");
      }

      await confirmationResult.confirm(verificationCode);

      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) {
        throw new Error("Failed to retrieve updated credentials from Firebase.");
      }

      const res = await api.put("/auth/verify-phone", { idToken });

      if (res.data && res.data.success) {
        setPhoneSuccess("Phone number verified successfully!");
        setVerificationStep("idle");
        setVerificationCode("");
        setConfirmationResult(null);

        if (appToken && res.data.user) {
          onAuthSuccess(appToken, res.data.user);
        }
      } else {
        throw new Error(res.data.message || "Failed to verify phone on server.");
      }
    } catch (err: any) {
      console.error("Error verifying OTP:", err);
      setPhoneError(err.message || "Invalid OTP code. Please try again.");
      setVerificationStep("otp_sent");
    }
  };

  const handleSendEmailOTP = async () => {
    setEmailError("");
    setEmailSuccess("");
    if (!form.email) {
      setEmailError("Please enter a valid email address first.");
      return;
    }
    setEmailVerificationStep("sending");
    try {
      const res = await api.post("/auth/email-otp/send");
      if (res.data && res.data.success) {
        setEmailSuccess(res.data.message || `Verification code sent to ${form.email}!`);
        setEmailVerificationStep("otp_sent");
      } else {
        throw new Error(res.data.message || "Failed to send email verification code.");
      }
    } catch (err: any) {
      console.error("Error sending email OTP:", err);
      setEmailError(err.response?.data?.message || err.message || "Failed to send email verification.");
      setEmailVerificationStep("idle");
    }
  };

  const handleVerifyEmailOTP = async () => {
    setEmailError("");
    setEmailSuccess("");
    if (!/^\d{6}$/.test(emailVerificationCode)) {
      setEmailError("Please enter a valid 6-digit OTP.");
      return;
    }
    setEmailVerificationStep("verifying");
    try {
      const res = await api.post("/auth/email-otp/verify", { code: emailVerificationCode });
      if (res.data && res.data.success) {
        setEmailSuccess("Email verified successfully!");
        setEmailVerificationStep("idle");
        setEmailVerificationCode("");
        if (appToken && res.data.user) {
          onAuthSuccess(appToken, res.data.user);
        }
      } else {
        throw new Error(res.data.message || "Failed to verify email OTP.");
      }
    } catch (err: any) {
      console.error("Error verifying email OTP:", err);
      setEmailError(err.response?.data?.message || err.message || "Invalid OTP code. Please try again.");
      setEmailVerificationStep("otp_sent");
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirmation) return;
    setDeleteLoading(true);
    setDeleteError("");
    try {
      // 1. Delete from backend MongoDB database
      await api.delete("/auth/delete-account", {
        data: { confirmation: deleteConfirmation }
      });

      // 2. Delete from Firebase Authentication client side
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (firebaseErr: any) {
          console.warn("[Firebase] Client side user delete skipped or failed:", firebaseErr.message);
          // If deletion requires recent login, sign them out so their session is cleared anyway
          await auth.signOut();
        }
      }

      // 3. Complete logout on the application context
      await signOut();
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("Account deletion error:", err);
      setDeleteError(err?.response?.data?.message || "Failed to permanently delete account.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const [preferredAreas, setPreferredAreas] = useState<string[]>([""]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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
    if (appUser) {
      setForm({
        name: appUser.name || "",
        email: appUser.email || "",
        phone: appUser.phone || "",
        age: appUser.age ? String(appUser.age) : "",
        gender: appUser.gender || "",
        experience: appUser.experience ? String(appUser.experience) : "",
        located_address: appUser.located_address || "",
        preferred_areas: appUser.preferred_areas?.join(", ") || "",
        categories: appUser.categories?.join(", ") || "",
      });
      setPhotoPreview(appUser.photo || "");
      if (appUser.preferred_areas && Array.isArray(appUser.preferred_areas) && appUser.preferred_areas.length > 0) {
        setPreferredAreas(appUser.preferred_areas);
      } else {
        setPreferredAreas([""]);
      }
      setSelectedCategories(appUser.categories || []);
    }
  }, [appUser]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setPhoto(base64String);
        setPhotoPreview(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (appUser?._id && appUser?.role !== "worker") {
      fetchAddresses();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?._id, appUser?.role]);

  useEffect(() => {
    if (appUser?._id && appUser?.role === "worker") {
      fetchVerification();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appUser?._id, appUser?.role]);

  const fetchVerification = async () => {
    try {
      const res = await api.get("/verification/me");
      if (res.data && res.data.success) {
        setVerification({
          governmentVerification: res.data.governmentVerification,
          badge: res.data.badge,
        });
      }
    } catch (err) {
      console.warn("Verification status fetch failed/skipped:", err);
    }
  };

  const handleSubmitDocs = async (e: FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    if (!docNumber.trim()) {
      setDocError(`Please enter your ${docCfg.numberLabel}.`);
      return;
    }
    if (!docCfg.validate(docNumber)) {
      setDocError(docCfg.error);
      return;
    }
    if (docFiles.length === 0) {
      setDocError("Please upload at least one clear image of your document.");
      return;
    }
    setDocSubmitting(true);
    try {
      const data = new FormData();
      data.append("documentType", docType);
      data.append("documentNumber", docNumber.trim());
      docFiles.forEach((file) => data.append("documents", file));

      // Let the browser set the multipart boundary automatically
      const res = await api.post("/verification/submit", data);
      if (res.data && res.data.success) {
        setVerification({
          governmentVerification: res.data.governmentVerification,
          badge: res.data.badge,
        });
        setDocNumber("");
        docPreviews.forEach((p) => URL.revokeObjectURL(p.url));
        setDocPreviews([]);
        setDocFiles([]);
        setDocSuccess(res.data.message || "Documents submitted successfully.");
      }
    } catch (err: any) {
      setDocError(err?.response?.data?.message || "Failed to submit documents.");
    } finally {
      setDocSubmitting(false);
    }
  };

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

    const isWorker = appUser?.role === "worker";

    if (isWorker) {
      const validPreferredAreas = preferredAreas.map(a => a.trim()).filter(Boolean);
      if (!form.name || !form.phone || !form.age || !form.email || !form.experience || !form.located_address || validPreferredAreas.length === 0 || selectedCategories.length === 0) {
        setError("Please fill in all compulsory fields, select at least one trade category, and provide at least one preferred location.");
        setLoading(false);
        return;
      }
    } else {
      if (!form.name || !form.phone || !form.age || !form.gender || !form.email) {
        setError("Please fill in all fields.");
        setLoading(false);
        return;
      }
    }

    if (!/^\d{10}$/.test(form.phone)) {
      setError("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        age: Number(form.age),
      };

      if (isWorker) {
        payload.experience = Number(form.experience);
        payload.located_address = form.located_address;
        payload.preferred_areas = preferredAreas.map(a => a.trim()).filter(Boolean);
        payload.categories = selectedCategories;
      } else {
        payload.gender = form.gender;
      }

      if (photo) {
        payload.photo = photo;
      }

      const res = await api.put("/auth/profile", payload);

      const data = res.data;
      if (data.success && data.user) {
        setSuccess("Profile updated successfully!");
        setPhoto("");
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 rounded-full border border-blue-200 dark:border-blue-800">
          Google / Firebase
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 rounded-full border border-amber-200 dark:border-amber-800">
        SMS OTP (Twilio)
      </span>
    );
  };

  const isWorker = appUser?.role === "worker";

  const navItems: { id: typeof activeSection; label: string; icon: LucideIcon; danger?: boolean }[] = [
    { id: "profile", label: "Profile", icon: User },
    ...(isWorker ? [{ id: "verification" as const, label: "Verification", icon: BadgeCheck }] : []),
    ...(!isWorker ? [{ id: "addresses" as const, label: "Addresses", icon: MapPin }] : []),
    { id: "security", label: "Security", icon: Lock },
    { id: "danger", label: "Delete Account", icon: Trash2, danger: true },
  ];

  // Small reusable verified / pending pill for email & phone
  const verifyPill = (verified: boolean) =>
    verified ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-500/20 whitespace-nowrap shrink-0">
        <CheckCircle size={10} /> Verified
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20 whitespace-nowrap shrink-0">
        <ShieldAlert size={10} /> Pending
      </span>
    );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Navbar />

      <main className="flex-grow pt-28 pb-16 px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto w-full">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Account Settings</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your profile, {isWorker ? "verification" : "saved addresses"}, and security preferences.
            </p>
          </div>

          <div className={`flex items-center gap-3 ${CARD} px-4 py-2.5`}>
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt={form.name} className="w-full h-full object-cover" />
              ) : (
                form.name?.[0]?.toUpperCase() || "U"
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[160px]">{form.name || "User"}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">{isWorker ? "Service Partner" : "Customer"}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-8 items-start">
          {/* Left navigation */}
          <nav className={`${CARD} p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible lg:sticky lg:top-28`}>
            {navItems.map((item) => {
              const active = activeSection === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`group flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? item.danger
                        ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                        : "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                      : item.danger
                      ? "text-red-500/80 hover:bg-red-50 dark:hover:bg-red-950/20"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {active && <ChevronRight size={14} className="hidden lg:block opacity-70" />}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="space-y-6 min-w-0">
            {/* Global banners */}
            {error && (
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl px-4 py-3">
                <ShieldAlert size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 text-sm bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl px-4 py-3">
                <CheckCircle size={18} className="shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* ───────────────────────── PROFILE ───────────────────────── */}
            {activeSection === "profile" && (
              <div className={`${CARD} p-6 sm:p-8`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <User size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Personal Details</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Your basic account information.</p>
                  </div>
                </div>

                {/* Avatar uploader */}
                <div className="flex items-center gap-5 mb-7 pb-7 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-2xl font-bold shadow-md overflow-hidden shrink-0 group">
                    {photoPreview ? (
                      <img src={photoPreview} alt={form.name} className="w-full h-full object-cover" />
                    ) : (
                      form.name?.[0]?.toUpperCase() || "U"
                    )}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
                      <Camera size={18} />
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">Profile photo</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-2">PNG or JPG, up to 5MB.</p>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
                      <UploadCloud size={13} /> Upload new photo
                      <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    </label>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div>
                      <label className={LABEL}>Full Name</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={form.name} onChange={setField("name")} className={INPUT_ICON} required />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 ml-0.5 whitespace-nowrap">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email Address</label>
                        {verifyPill(form.email === appUser?.email && !!appUser?.isEmailVerified)}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-grow">
                          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="email" value={form.email} readOnly className={`${INPUT_ICON} bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 select-none`} required />
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => openEditModal("email")} className="px-3.5 py-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer">
                            Edit
                          </button>
                          {(form.email !== appUser?.email || !appUser?.isEmailVerified) && (
                            <button
                              type="button"
                              onClick={handleSendEmailOTP}
                              disabled={emailVerificationStep !== "idle" || !form.email}
                              className="px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                            >
                              {emailVerificationStep === "sending" ? (<><Loader2 size={12} className="animate-spin" /> Sending…</>) : "Verify Email"}
                            </button>
                          )}
                        </div>
                      </div>

                      {emailError && (
                        <p className="text-xs text-rose-500 mt-2 font-medium bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{emailError}</p>
                      )}
                      {emailSuccess && (
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">{emailSuccess}</p>
                      )}

                      {(emailVerificationStep === "otp_sent" || emailVerificationStep === "verifying") && (
                        <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl animate-fade-in">
                          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Enter 6-Digit Email Code</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="000000"
                              value={emailVerificationCode}
                              onChange={(e) => setEmailVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              className="flex-grow text-center tracking-[0.4em] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailOTP}
                              disabled={emailVerificationStep === "verifying" || emailVerificationCode.length !== 6}
                              className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all active:scale-95 flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                            >
                              {emailVerificationStep === "verifying" ? <Loader2 size={12} className="animate-spin" /> : "Verify Code"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Phone Number</label>
                      {verifyPill(form.phone === appUser?.phone && !!appUser?.isPhoneVerified)}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-grow">
                        <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="tel" value={form.phone} readOnly className={`${INPUT_ICON} bg-slate-50 dark:bg-slate-800/30 text-slate-500 dark:text-slate-400 select-none`} required />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => openEditModal("phone")} className="px-3.5 py-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer">
                          Edit
                        </button>
                        {(form.phone !== appUser?.phone || !appUser?.isPhoneVerified) && (
                          <button
                            type="button"
                            onClick={handleSendOTP}
                            disabled={verificationStep !== "idle" || form.phone.length !== 10}
                            className="px-4 py-2.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                          >
                            {verificationStep === "sending" ? (<><Loader2 size={12} className="animate-spin" /> Sending…</>) : "Verify via SMS"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div id="recaptcha-container" className="mt-2"></div>

                    {phoneError && (
                      <p className="text-xs text-rose-500 mt-2 font-medium bg-rose-500/10 px-3 py-2 rounded-lg border border-rose-500/20">{phoneError}</p>
                    )}
                    {phoneSuccess && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 font-medium bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20">{phoneSuccess}</p>
                    )}

                    {(verificationStep === "otp_sent" || verificationStep === "verifying") && (
                      <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-xl animate-fade-in">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Enter 6-Digit SMS Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                            className="flex-grow text-center tracking-[0.4em] font-bold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                          />
                          <button
                            type="button"
                            onClick={handleVerifyOTP}
                            disabled={verificationStep === "verifying" || verificationCode.length !== 6}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white transition-all active:scale-95 flex items-center justify-center gap-1 shrink-0 cursor-pointer"
                          >
                            {verificationStep === "verifying" ? <Loader2 size={12} className="animate-spin" /> : "Verify Code"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Age */}
                    <div>
                      <label className={LABEL}>Age</label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="number" value={form.age} onChange={setField("age")} min="16" max="100" className={INPUT_ICON} required />
                      </div>
                    </div>

                    {/* Gender */}
                    <div>
                      <label className={LABEL}>Gender</label>
                      <div className="relative">
                        <Users size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                        <select value={form.gender} onChange={setField("gender")} className={`${INPUT_ICON} appearance-none cursor-pointer`} required>
                          <option value="">Select…</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                          <option value="prefer_not">Prefer not</option>
                        </select>
                      </div>
                    </div>

                    {/* Experience (worker) */}
                    {isWorker && (
                      <div>
                        <label className={LABEL}>Experience (Years)</label>
                        <div className="relative">
                          <Briefcase size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input type="number" value={form.experience} onChange={setField("experience")} min="0" max="80" className={INPUT_ICON} required />
                        </div>
                      </div>
                    )}
                  </div>

                  {isWorker && (
                    <>
                      <div>
                        <label className={LABEL}>Located Address</label>
                        <div className="relative">
                          <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={form.located_address}
                            onChange={setField("located_address")}
                            className={INPUT_ICON}
                            placeholder="e.g. Dwarka, Tiruvannamalai, Tamil Nadu - 606603"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Preferred Locations */}
                        <div>
                          <label className={LABEL}>Preferred Locations <span className="text-slate-400 font-normal">(at least one)</span></label>
                          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                            {preferredAreas.map((area, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="relative flex-grow">
                                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <input
                                    type="text"
                                    required={index === 0}
                                    placeholder={index === 0 ? "City or District (required)" : "Area name (optional)"}
                                    value={area}
                                    onChange={(e) => handlePreferredAreaChange(index, e.target.value)}
                                    className={INPUT_ICON}
                                  />
                                </div>
                                {preferredAreas.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removePreferredArea(index)}
                                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer shrink-0"
                                    title="Remove location"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={addPreferredArea}
                            className="mt-2 w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <Plus size={13} /> Add Location
                          </button>
                        </div>

                        {/* Trade Categories */}
                        <div>
                          <label className={LABEL}>Trade Categories <span className="text-slate-400 font-normal">(select all that apply)</span></label>
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
                                      prev.includes(cat.id) ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                                    );
                                  }}
                                  className={`py-2.5 px-3 rounded-lg border text-xs font-bold transition-all active:scale-[0.97] cursor-pointer ${
                                    isSelected
                                      ? "bg-indigo-50 dark:bg-indigo-500/15 border-indigo-300 dark:border-indigo-500/40 text-indigo-700 dark:text-indigo-300"
                                      : "bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"
                                  }`}
                                >
                                  {cat.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 pt-4">
                      <span className="font-semibold">Sign-in method:</span> {getProviderBadge()}
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="mt-4 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      {loading ? "Saving…" : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ─────────────────────── VERIFICATION ─────────────────────── */}
            {activeSection === "verification" && isWorker && (() => {
              const tier = verification?.badge?.tier || appUser?.badge?.tier || "pending";
              const gov = verification?.governmentVerification;
              const govStatus = gov?.status || "none";
              const emailPhoneVerified = tier !== "pending";

              return (
                <div className={`${CARD} p-6 sm:p-8`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <BadgeCheck size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">Request Verification</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Earn trust badges by verifying your identity.</p>
                      </div>
                    </div>
                    <WorkerBadge badge={verification?.badge || appUser?.badge} size="sm" />
                  </div>

                  {/* Trust ladder */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-6">
                    {[
                      { t: "verified", label: "Verified", req: "Email + phone" },
                      { t: "verified_pro", label: "Verified Pro", req: "Gov. document" },
                      { t: "trusted_pro", label: "Trusted Pro", req: "4.5★ · 35 jobs" },
                      { t: "trusted_elite", label: "Trusted Elite", req: "4.8★ · 100 jobs" },
                    ].map((step) => {
                      const order = ["verified", "verified_pro", "trusted_pro", "trusted_elite"];
                      const reached = order.indexOf(tier) >= order.indexOf(step.t);
                      return (
                        <div key={step.t} className={`rounded-xl border p-3 text-center ${reached ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10" : "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30"}`}>
                          <p className={`text-[11px] font-extrabold ${reached ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>{step.label}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{step.req}</p>
                        </div>
                      );
                    })}
                  </div>

                  {!emailPhoneVerified && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                      <ShieldAlert size={15} className="mt-0.5 shrink-0" />
                      <span>Verify both your <strong>email</strong> and <strong>phone number</strong> in the Profile tab before requesting document verification.</span>
                    </div>
                  )}

                  {emailPhoneVerified && govStatus === "approved" && (
                    <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl p-4 text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed flex items-start gap-2">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                      <span>Your <strong>{gov?.documentType || "document"}</strong> has been verified and approved. You are a <strong>Verified Pro</strong>.</span>
                    </div>
                  )}

                  {emailPhoneVerified && govStatus === "pending" && (
                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                      <Clock size={15} className="mt-0.5 shrink-0" />
                      <span>Your <strong>{gov?.documentType || "document"}</strong> is under review. We'll update your badge once an administrator approves it.</span>
                    </div>
                  )}

                  {emailPhoneVerified && (govStatus === "none" || govStatus === "rejected") && (
                    <form onSubmit={handleSubmitDocs} className="space-y-4">
                      {govStatus === "rejected" && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-3 text-xs text-red-600 dark:text-red-300 leading-relaxed flex items-start gap-2">
                          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                          <span>Your previous submission failed{gov?.rejectionReason ? `: ${gov.rejectionReason}` : "."} Please resubmit valid documents.</span>
                        </div>
                      )}
                      {docError && <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3.5 py-2.5 rounded-lg font-medium">{docError}</div>}
                      {docSuccess && <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-lg font-medium">{docSuccess}</div>}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={LABEL}>Document Type</label>
                          <div className="relative">
                            <FileText size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                            <select value={docType} onChange={(e) => handleDocTypeChange(e.target.value)} className={`${INPUT_ICON} appearance-none cursor-pointer`}>
                              {Object.keys(DOC_TYPES).map((t) => (
                                <option key={t}>{t}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className={LABEL}>{docCfg.numberLabel}</label>
                          <input
                            type="text"
                            inputMode={docType === "Aadhaar Card" ? "numeric" : "text"}
                            value={docNumber}
                            onChange={handleDocNumberChange}
                            maxLength={docCfg.maxLength}
                            placeholder={docCfg.placeholder}
                            className={`${INPUT} ${docNumber && !docCfg.validate(docNumber) ? "border-rose-400 dark:border-rose-500/60 focus:ring-rose-500/40 focus:border-rose-500" : ""}`}
                            autoComplete="off"
                          />
                          <p className={`mt-1 text-[10px] ${docNumber && !docCfg.validate(docNumber) ? "text-rose-500" : "text-slate-400"}`}>
                            {docNumber && !docCfg.validate(docNumber) ? docCfg.error : docCfg.hint}
                          </p>
                        </div>
                      </div>

                      <div>
                        <label className={LABEL}>Document Images <span className="text-slate-400 font-normal">(up to 3)</span></label>

                        {/* Selected file previews */}
                        {docPreviews.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-3">
                            {docPreviews.map((p, i) => (
                              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 group">
                                {p.isImage ? (
                                  <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1">
                                    <FileText size={20} />
                                    <span className="text-[8px] text-center mt-1 truncate w-full">{p.name}</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  onClick={() => removeDocFile(i)}
                                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 hover:bg-red-600 text-white flex items-center justify-center transition-colors"
                                  aria-label="Remove file"
                                >
                                  <X size={11} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {docFiles.length < 3 && (
                          <label className="flex flex-col items-center justify-center gap-1.5 w-full bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl px-3 py-6 text-xs text-slate-500 dark:text-slate-400 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
                            <UploadCloud size={20} className="text-indigo-500" />
                            <span className="font-semibold">{docFiles.length > 0 ? `Add another (${docFiles.length}/3)` : "Click to upload document image(s)"}</span>
                            <span className="text-[10px] text-slate-400">JPG, PNG or PDF</span>
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              multiple
                              className="hidden"
                              onChange={handleDocFilesChange}
                            />
                          </label>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={docSubmitting}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-sm shadow-sm active:scale-[0.98] transition-all cursor-pointer"
                      >
                        {docSubmitting ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
                        {docSubmitting ? "Submitting…" : "Submit for Verification"}
                      </button>
                    </form>
                  )}
                </div>
              );
            })()}

            {/* ───────────────────────── ADDRESSES ───────────────────────── */}
            {activeSection === "addresses" && !isWorker && (
              <div className={`${CARD} p-6 sm:p-8`}>
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">Address Book</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Saved addresses for faster service requests.</p>
                    </div>
                  </div>
                  {!showAddAddress && (
                    <button
                      onClick={() => setShowAddAddress(true)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      <Plus size={14} /> Add New
                    </button>
                  )}
                </div>

                {addressError && (
                  <div className="mb-4 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    <ShieldAlert size={14} className="shrink-0" /><span>{addressError}</span>
                  </div>
                )}
                {addressSuccess && (
                  <div className="mb-4 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg px-3 py-2 flex items-center gap-2">
                    <CheckCircle size={14} className="shrink-0" /><span>{addressSuccess}</span>
                  </div>
                )}

                {showAddAddress ? (
                  <form onSubmit={handleAddAddress} className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/60 dark:bg-slate-800/30">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5"><MapPin size={12} className="text-orange-500" /> New Address</h4>
                    <div>
                      <label className={LABEL}>Street Address / Door No.</label>
                      <input type="text" required placeholder="e.g. Flat 302, Green Apartments" value={newAddress.address} onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))} className={INPUT} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={LABEL}>Area / Locality</label>
                        <input type="text" required placeholder="e.g. Sector 12" value={newAddress.area} onChange={(e) => setNewAddress(prev => ({ ...prev, area: e.target.value }))} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>City</label>
                        <input type="text" required placeholder="e.g. Dwarka" value={newAddress.city} onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))} className={INPUT} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className={`${LABEL} flex items-center gap-1.5`}>Pin Code {pincodeLoading && <Loader2 size={10} className="animate-spin text-orange-500" />}</label>
                        <input type="text" required placeholder="e.g. 606603" maxLength={6} value={newAddress.pin_code} onChange={(e) => handlePincodeChange(e.target.value)} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>District</label>
                        <input type="text" required placeholder="e.g. Tiruvannamalai" value={newAddress.district} onChange={(e) => setNewAddress(prev => ({ ...prev, district: e.target.value }))} className={INPUT} />
                      </div>
                      <div>
                        <label className={LABEL}>State</label>
                        <select required value={newAddress.state} onChange={(e) => setNewAddress(prev => ({ ...prev, state: e.target.value }))} className={`${INPUT} appearance-none cursor-pointer`}>
                          <option value="" disabled>Select State</option>
                          {INDIAN_STATES.map((st) => (<option key={st} value={st}>{st}</option>))}
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-1">
                      <button type="button" onClick={() => setShowAddAddress(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">Cancel</button>
                      <button type="submit" disabled={addressLoading} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center gap-1.5">
                        {addressLoading && <Loader2 size={12} className="animate-spin" />} Save Address
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {addressLoading && addresses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                        <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        <p className="text-xs mt-2">Loading your addresses…</p>
                      </div>
                    ) : addresses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                        <MapPin size={24} className="mb-2 text-slate-300 dark:text-slate-700" />
                        <p className="text-xs font-bold">No saved addresses</p>
                        <p className="text-[10px] text-slate-400 mt-1 max-w-[220px] text-center">Add one to select it quickly during service requests.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {addresses.map((addr) => (
                          <div key={addr._id} className="group relative flex items-start justify-between p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/30 hover:border-orange-300 dark:hover:border-orange-500/30 transition-all">
                            <div className="flex gap-3.5">
                              <div className="mt-0.5 p-2.5 rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-500 shrink-0">
                                <MapPin size={16} />
                              </div>
                              <div className="pr-10">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 capitalize">{addr.address}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">{addr.area}, {addr.city}</p>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-wide">{addr.district}, {addr.state} - <strong className="text-orange-600 dark:text-orange-400 font-mono">{addr.pin_code}</strong></p>
                              </div>
                            </div>
                            <button onClick={() => handleDeleteAddress(addr._id)} className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 cursor-pointer" title="Delete Address">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ───────────────────────── SECURITY ───────────────────────── */}
            {activeSection === "security" && (
              <div className={`${CARD} p-6 sm:p-8`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <Key size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">Security &amp; Passwords</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Manage your login credentials.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 my-5 leading-relaxed">
                  Request a password reset email to change your login credentials via a secure Firebase link.
                </p>

                {resetSuccess ? (
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle size={18} className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm">Reset email sent!</h4>
                      <p className="text-xs mt-1 leading-relaxed">We've sent a password reset link to <strong>{form.email}</strong>. Check your inbox and spam folder.</p>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={resetLoading}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm active:scale-[0.98] cursor-pointer"
                  >
                    {resetLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    {resetLoading ? "Dispatching link…" : "Send Password Reset Email"}
                  </button>
                )}
              </div>
            )}

            {/* ───────────────────────── DANGER ZONE ───────────────────────── */}
            {activeSection === "danger" && (
              <div className={`${CARD} p-6 sm:p-8 border-red-200 dark:border-red-900/50`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-red-600 dark:text-red-400">Delete Account</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Permanently remove your account and data.</p>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 my-5 leading-relaxed">
                  This permanently deletes your profile, address records, and dispatch history. Ratings and reviews are preserved. <strong className="text-red-500">This action cannot be undone.</strong>
                </p>

                <div className="space-y-4">
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 rounded-lg text-xs flex flex-wrap items-center gap-1.5">
                    <span className="font-bold">Type</span>
                    <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 text-[11px] font-black select-all">{appUser?.role}@{appUser?.name}</code>
                    <span className="font-bold">to confirm.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">Confirmation text</label>
                      <input
                        type="text"
                        placeholder={`${appUser?.role}@${appUser?.name}`}
                        value={deleteConfirmation}
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleDeleteAccount}
                      disabled={deleteLoading || deleteConfirmation !== `${appUser?.role}@${appUser?.name}`}
                      className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-600 text-white font-bold text-xs transition-all shadow-sm disabled:cursor-not-allowed active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-2"
                    >
                      {deleteLoading ? (<><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</>) : (<><Trash2 size={14} /> Delete Account Permanently</>)}
                    </button>
                  </div>

                  {deleteError && <p className="text-xs text-red-500 font-bold animate-pulse">{deleteError}</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Critical Edit Modal Popup */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700 animate-scale-up">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <ShieldAlert className="text-indigo-500" size={18} />
              Update {editingField === "email" ? "Email Address" : "Phone Number"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
              Changing your registered {editingField === "email" ? "email" : "phone number"} resets its verification status. You'll need to verify the new credentials.
            </p>
            <div className="mb-5">
              <label className={LABEL}>New {editingField === "email" ? "Email Address" : "Phone Number"}</label>
              <input
                type={editingField === "email" ? "email" : "text"}
                value={editValue}
                onChange={(e) => setEditValue(editingField === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)}
                placeholder={editingField === "email" ? "name@example.com" : "10-digit number"}
                className={INPUT}
                autoFocus
              />
              {editError && <div className="mt-2 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 px-3 py-2 rounded-lg font-medium">{editError}</div>}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button type="button" onClick={() => setEditingField(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">Cancel</button>
              <button type="button" onClick={handleConfirmEdit} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer active:scale-95 transition-all">Confirm Change</button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
