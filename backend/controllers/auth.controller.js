const User = require("../model/user.model");
const Workers = require("../model/workers.model");
const Worker = Workers;

const uploadWorkerPhoto = async (photoBase64) => {
    if (!photoBase64) return "";
    if (photoBase64.startsWith("data:image")) {
        try {
            const cloudinary = require('../config/cloudinary.js');
            const result = await cloudinary.uploader.upload(photoBase64, {
                folder: "rapidfix_workers",
                transformation: [
                    { width: 400, height: 400, crop: "fill", gravity: "face" }
                ]
            });
            return result.secure_url;
        } catch (err) {
            console.error("Cloudinary worker photo uploader error:", err);
            return "";
        }
    }
    return photoBase64; // already a URL
};

const {sendOtp, checkOtp } = require("../services/twilioVerify.service");

const {generateAccessToken, generateSetupToken} = require("../utils/jwt");

// Sends an OTP to the provided phone number after validating the requested role.
const sendOtpController = async (req, res) => {
    try{
        const {phone, role} = req.body;

        if(!phone || !role){
            return res.status(401).json({
                success: false,
                message: "Phone number is required",
            });
        }

        if(!["users", "worker"].includes(role)) {
            return res.status(401).json({
                success: "false",
                message: "Invalid role",
            });
        }

        if (role === "users") {
            const oppositeWorker = await Worker.findOne({ phone });
            if (oppositeWorker) {
                return res.status(400).json({
                    success: false,
                    message: "This phone number is registered as a Service Partner. Please sign in as a Service Partner."
                });
            }
        } else if (role === "worker") {
            const oppositeUser = await User.findOne({ phone });
            if (oppositeUser) {
                return res.status(400).json({
                    success: false,
                    message: "This phone number is registered as a Customer. Please sign in as a Customer."
                });
            }
        }

        const result = await sendOtp(phone);

        if(!result.success){
            return res.status(500).json({
                success: false,
                message: "Failed to send OTP",
            });
        }

        return res.json({
            success: 'true',
            message: "OTP sent successfully",
        });
    } catch (error){
        console.error(error);

        return res.status(500).json({
            success: "false",
            message: "Server Error",
        });
    }
};

// Verifies the submitted OTP and returns either an access token or a setup token.
const verifyOtpController = async (req, res) => {
    try{
        const { phone, code, role} = req.body;

        if(!phone || !code || !role){
            return res.status(401).json({
                success: "false",
                message: "Phone, code and role are required",
            });
        }

        const verification = await checkOtp(phone, code);

        if(!verification.success){
            return res.status(401).json({
                success: "false",
                message: "Invalid OTP",
            });
        }

        if (role === "user") {
            const oppositeWorker = await Worker.findOne({ phone });
            if (oppositeWorker) {
                return res.status(400).json({
                    success: false,
                    message: "This phone number is registered as a Service Partner. Please sign in as a Service Partner."
                });
            }
        } else if (role === "worker") {
            const oppositeUser = await User.findOne({ phone });
            if (oppositeUser) {
                return res.status(400).json({
                    success: false,
                    message: "This phone number is registered as a Customer. Please sign in as a Customer."
                });
            }
        }

        let account = null;

        if(role==="user") {
            account = await User.findOne({phone});
        }

        if(role==="worker"){
            account = await Worker.findOne({phone});
        }

        if(account){
            const token = generateAccessToken({
                sub: account._id.toString(),
                role, 
                phone: account.phone,
            });

            return res.json({
                success: true,
                needsProfile: false,
                role,
                token,
                account,
            });
        }

        const setupToken = generateSetupToken({
            role, 
            phone,
            needsProfile: true,
        });

        return res.json({
            success: true,
            needsProfile: true,
            role,
            setupToken,
        });
    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

// Creates the missing user or worker profile after OTP verification and returns an access token.
const completeProfileController = async(req, res) => {
    try {
        const {role, phone} = req.user;

        let account = null;

        if (role === 'user') {
            const oppositeWorker = await Worker.findOne({ phone });
            if (oppositeWorker) {
                return res.status(400).json({ success: false, message: "This phone number is registered as a Service Partner." });
            }
        } else if (role === 'worker') {
            const oppositeUser = await User.findOne({ phone });
            if (oppositeUser) {
                return res.status(400).json({ success: false, message: "This phone number is registered as a Customer." });
            }
        }

        if(role==='user'){
            const {name, age, gender, email,} = req.body;

            if(!name || !age || !gender || !email){
                return res.status(500).json({
                    success: false,
                    message: "Missing required fields",
                })
            }
            account = await User.create({
                name,
                age,
                gender,
                email,
                phone,
                authProvider: "twilio",
                isPhoneVerified: true, // Verified via Twilio SMS OTP
            });
        }

        if (role === "worker") {
            const {
                name,
                age,
                gender,
                experience,
                preferred_areas,
                located_address,
                photo,
                categories,
            } = req.body;

            if (!name || !age || !gender || experience === undefined || !located_address || !photo || !preferred_areas || !categories) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required worker fields: name, age, gender, experience, located_address, preferred_areas, photo, and categories are compulsory.",
                });
            }

            const parsedAreas = Array.isArray(preferred_areas)
                ? preferred_areas
                : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);

            const parsedCategories = Array.isArray(categories)
                ? categories.map(c => c.trim()).filter(Boolean)
                : String(categories).split(",").map(c => c.trim()).filter(Boolean);

            const uniqueCategories = [...new Set(parsedCategories)];

            if (uniqueCategories.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "At least one category is mandatory for signing up as a worker.",
                });
            }

            const uploadedPhotoUrl = await uploadWorkerPhoto(photo);

            account = await Worker.create({
                name,
                age: Number(age),
                gender,
                experience: Number(experience),
                preferred_areas: parsedAreas,
                located_address,
                photo: uploadedPhotoUrl,
                phone,
                authProvider: "twilio",
                categories: uniqueCategories,
            });
        }

        const token = generateAccessToken({
            sub: account._id.toString(),
            role,
            phone,
        });

        return res.status(201).json({
            success: true,
            role,
            token,
            account,
        });
    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Returns the currently authenticated user or worker account details.
const meController = async (req, res) => {

    try {

        const {
            sub,
            role,
        } = req.user;

        let account = null;

        if (role === "user") {
            account = await User.findById(sub);
        }

        if (role === "worker") {
            account = await Worker.findById(sub);
        }

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "Account not found",
            });
        }

        return res.json({
            success: true,
            role,
            account,
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

// Authenticates a user or worker via Firebase ID token, creating or finding them in MongoDB.
// Body: { idToken, name?, age?, gender?, phone?, email?, role? }
// Returns: { success, needsProfile, token?, user?, firebaseUser? }
const firebaseAuthController = async (req, res) => {
    try {
        const { verifyFirebaseToken } = require('../middleware/firebaseAdmin.middleware');
        const { idToken, name, age, gender, phone, email: bodyEmail, role = "user" } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: 'idToken is required' });
        }

        // Verify the Firebase token
        let firebaseUser;
        try {
            firebaseUser = await verifyFirebaseToken(idToken);
        } catch (err) {
            return res.status(401).json({ success: false, message: 'Invalid Firebase token: ' + err.message });
        }

        const resolvedEmail = firebaseUser.email || bodyEmail;
        const resolvedName = firebaseUser.name || name;

        // Enforce strict collection selection & role boundary checks
        if (role === "worker") {
            const oppositeUser = await User.findOne({
                $or: [
                    { firebaseUid: firebaseUser.uid },
                    ...(resolvedEmail ? [{ email: resolvedEmail }] : [])
                ]
            });
            if (oppositeUser) {
                return res.status(400).json({
                    success: false,
                    message: "This credential belongs to a Customer account. Please sign in as a Customer."
                });
            }
        } else if (role === "user" || role === "users") {
            const oppositeWorker = await Worker.findOne({
                $or: [
                    { firebaseUid: firebaseUser.uid },
                    ...(resolvedEmail ? [{ email: resolvedEmail }] : [])
                ]
            });
            if (oppositeWorker) {
                return res.status(400).json({
                    success: false,
                    message: "This credential belongs to a Service Partner account. Please sign in as a Service Partner."
                });
            }
        }

        // Robust collection selection & lookup logic:
        // If a specific role is passed in the request body (e.g. at signup/login page select), use it.
        // Otherwise (e.g. automatic refresh/onAuthStateChanged check), search both Worker and User.
        let standardRole = role === "worker" ? "worker" : "user";
        let account = null;

        if (role === "worker") {
            account = await Worker.findOne({
                $or: [
                    { firebaseUid: firebaseUser.uid },
                    ...(resolvedEmail ? [{ email: resolvedEmail }] : [])
                ]
            });
        } else if (req.body.role === "user") {
            account = await User.findOne({
                $or: [
                    { firebaseUid: firebaseUser.uid },
                    ...(resolvedEmail ? [{ email: resolvedEmail }] : [])
                ]
            });
        } else {
            // No explicit role passed or default check: search both collections
            account = await Worker.findOne({
                $or: [
                    { firebaseUid: firebaseUser.uid },
                    ...(resolvedEmail ? [{ email: resolvedEmail }] : [])
                ]
            });
            if (account) {
                standardRole = "worker";
            } else {
                account = await User.findOne({
                    $or: [
                        { firebaseUid: firebaseUser.uid },
                        ...(resolvedEmail ? [{ email: resolvedEmail }] : [])
                    ]
                });
                standardRole = "user";
            }
        }

        // Check if profile is complete
        const isProfileComplete = (standardRole === "worker")
            ? (w) => w && w.name && w.age && w.gender && w.experience !== undefined && w.located_address && w.photo && w.preferred_areas?.length > 0 && w.categories?.length > 0 && w.phone
            : (u) => u && u.name && u.age && u.gender && u.phone;

        // If all profile fields provided in body, upsert the account
        if (standardRole === "worker") {
            const { gender, experience, preferred_areas, located_address, photo, categories } = req.body;
            if (name && age && gender && experience !== undefined && located_address && photo && preferred_areas && phone && categories) {
                const parsedAreas = Array.isArray(preferred_areas)
                    ? preferred_areas
                    : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);

                const parsedCategories = Array.isArray(categories)
                    ? categories.map(c => c.trim()).filter(Boolean)
                    : String(categories).split(",").map(c => c.trim()).filter(Boolean);

                const uniqueCategories = [...new Set(parsedCategories)];

                const uploadedPhotoUrl = await uploadWorkerPhoto(photo);

                if (account) {
                    account.firebaseUid = firebaseUser.uid;
                    account.authProvider = 'firebase';
                    if (!account.name) account.name = name;
                    if (!account.age) account.age = Number(age);
                    if (!account.gender) account.gender = gender;
                    if (account.experience === undefined) account.experience = Number(experience);
                    if (!account.located_address) account.located_address = located_address;
                    account.photo = uploadedPhotoUrl || account.photo || photo;
                    if (!account.preferred_areas || account.preferred_areas.length === 0) account.preferred_areas = parsedAreas;
                    if (!account.categories || account.categories.length === 0) account.categories = uniqueCategories;
                    if (!account.phone) account.phone = phone;
                    if (!account.email && resolvedEmail) account.email = resolvedEmail;
                    account.isEmailVerified = true; // Google signup/login automatically verifies email
                    await account.save();
                } else {
                    account = await Worker.create({
                        name,
                        age: Number(age),
                        gender,
                        experience: Number(experience),
                        located_address,
                        photo: uploadedPhotoUrl,
                        preferred_areas: parsedAreas,
                        categories: uniqueCategories,
                        phone,
                        email: resolvedEmail || '',
                        firebaseUid: firebaseUser.uid,
                        authProvider: 'firebase',
                        isEmailVerified: true, // Google signup/login automatically verifies email
                    });
                }
            }
        } else {
            // Customer logic
            if (name && age && gender && phone) {
                if (account) {
                    account.firebaseUid = firebaseUser.uid;
                    account.authProvider = 'firebase';
                    if (!account.name) account.name = name;
                    if (!account.age) account.age = age;
                    if (!account.gender) account.gender = gender;
                    if (!account.phone) account.phone = phone;
                    if (!account.email && resolvedEmail) account.email = resolvedEmail;
                    if (!account.photo && firebaseUser.picture) account.photo = firebaseUser.picture;
                    account.isEmailVerified = true; // Google signup/login automatically verifies email
                    await account.save();
                } else {
                    account = await User.create({
                        name,
                        age,
                        gender,
                        phone,
                        email: resolvedEmail || '',
                        firebaseUid: firebaseUser.uid,
                        authProvider: 'firebase',
                        photo: firebaseUser.picture || '',
                        isEmailVerified: true, // Google signup/login automatically verifies email
                        isPhoneVerified: false,
                    });
                }
            }
        }

        console.log("[Auth Debug] Found Account:", account ? account.toObject() : "null");
        console.log("[Auth Debug] standardRole:", standardRole);
        if (account) {
            console.log("[Auth Debug] name:", !!account.name, "age:", !!account.age, "gender:", !!account.gender, "phone:", !!account.phone);
            console.log("[Auth Debug] isProfileComplete:", isProfileComplete(account));
        }

        // If account exists and profile is complete, issue token
        if (account && isProfileComplete(account)) {
            if (standardRole === "user" && !account.photo && firebaseUser.picture) {
                account.photo = firebaseUser.picture;
                await account.save();
            }
            const token = generateAccessToken({
                sub: account._id.toString(),
                role: standardRole,
                phone: account.phone,
            });
            return res.json({
                success: true,
                needsProfile: false,
                token,
                user: {
                    ...account.toObject(),
                    role: standardRole,
                },
            });
        }

        const setupToken = generateSetupToken({
            role: standardRole,
            firebaseUid: firebaseUser.uid,
            email: resolvedEmail,
            photo: firebaseUser.picture || '',
            needsProfile: true,
            emailVerified: firebaseUser.email_verified || false,
        });

        return res.json({
            success: true,
            needsProfile: true,
            setupToken,
            firebaseUser: {
                uid: firebaseUser.uid,
                email: resolvedEmail,
                name: resolvedName,
                picture: firebaseUser.picture,
            },
        });
    } catch (error) {
        console.error('[firebaseAuthController]', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0] || 'email/phone';
            return res.status(400).json({
                success: false,
                message: `An account with this ${field} already exists.`
            });
        }
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// Completes a Firebase user or worker profile after initial sign-in.
// Requires setupToken (from firebaseAuthController when needsProfile=true).
// Body: { name, age, phone, ...role-specific-fields }
const firebaseCompleteProfileController = async (req, res) => {
    try {
        const { firebaseUid, email, role: tokenRole, photo } = req.user; // from requireSetupToken middleware
        const { role: bodyRole } = req.body;

        // Prioritize the role explicitly sent in the body to handle auto-login edge cases correctly
        const resolvedRole = bodyRole || tokenRole || "user";
        const standardRole = resolvedRole === "worker" ? "worker" : "user";

        if (standardRole === "worker") {
            const { name, age, gender, experience, located_address, preferred_areas, photo, phone, categories } = req.body;
            if (!name || !age || !gender || experience === undefined || !located_address || !photo || !preferred_areas || !phone || !categories) {
                return res.status(400).json({ success: false, message: 'All worker fields are required: name, age, gender, experience, located_address, preferred_areas, photo, phone and categories are compulsory.' });
            }

            const parsedAreas = Array.isArray(preferred_areas)
                ? preferred_areas
                : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);

            const parsedCategories = Array.isArray(categories)
                ? categories.map(c => c.trim()).filter(Boolean)
                : String(categories).split(",").map(c => c.trim()).filter(Boolean);

            const uniqueCategories = [...new Set(parsedCategories)];

            if (uniqueCategories.length === 0) {
                return res.status(400).json({ success: false, message: 'At least one category is mandatory for signing up as a worker.' });
            }

            const uploadedPhotoUrl = await uploadWorkerPhoto(photo);

            let account = await Worker.findOne({
                $or: [
                    { firebaseUid },
                    ...(email ? [{ email }] : [])
                ]
            });

            if (account) {
                account.firebaseUid = firebaseUid;
                account.authProvider = 'firebase';
                account.name = name;
                account.age = Number(age);
                account.gender = gender;
                account.experience = Number(experience);
                account.located_address = located_address;
                account.photo = uploadedPhotoUrl || account.photo || photo;
                account.preferred_areas = parsedAreas;
                account.categories = uniqueCategories;
                account.phone = phone;
                if (!account.email && email) account.email = email;
                account.isEmailVerified = true; // Google signup/login automatically verifies email
                await account.save();
            } else {
                account = await Worker.create({
                    name,
                    age: Number(age),
                    gender,
                    experience: Number(experience),
                    located_address,
                    photo: uploadedPhotoUrl,
                    preferred_areas: parsedAreas,
                    categories: uniqueCategories,
                    phone,
                    email: email || '',
                    firebaseUid,
                    authProvider: 'firebase',
                    isEmailVerified: true, // Google signup/login automatically verifies email
                });
            }

            const token = generateAccessToken({
                sub: account._id.toString(),
                role: 'worker',
                phone: account.phone,
            });

            return res.status(201).json({
                success: true,
                needsProfile: false,
                token,
                user: {
                    ...account.toObject(),
                    role: 'worker',
                },
            });
        } else {
            const { name, age, gender, phone } = req.body;

            if (!name || !age || !gender || !phone) {
                return res.status(400).json({ success: false, message: 'name, age, gender and phone are all required' });
            }

            let user = await User.findOne({
                $or: [
                    { firebaseUid },
                    ...(email ? [{ email }] : [])
                ]
            });

            if (user) {
                user.firebaseUid = firebaseUid;
                user.authProvider = 'firebase';
                user.name = name;
                user.age = age;
                user.gender = gender;
                user.phone = phone;
                if (!user.email && email) user.email = email;
                if (!user.photo && photo) user.photo = photo;
                user.isEmailVerified = true; // Google signup/login automatically verifies email
                await user.save();
            } else {
                user = await User.create({
                    name,
                    age,
                    gender,
                    phone,
                    email: email || '',
                    firebaseUid,
                    authProvider: 'firebase',
                    photo: photo || '',
                    isEmailVerified: true, // Google signup/login automatically verifies email
                    isPhoneVerified: false,
                });
            }

            const token = generateAccessToken({
                sub: user._id.toString(),
                role: 'user',
                phone: user.phone,
            });

            return res.status(201).json({
                success: true,
                needsProfile: false,
                token,
                user: {
                    ...user.toObject(),
                    role: 'user',
                },
            });
        }
    } catch (error) {
        console.error('[firebaseCompleteProfileController]', error);
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0] || 'email/phone';
            return res.status(400).json({
                success: false,
                message: `An account with this ${field} already exists.`
            });
        }
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

const updateProfileController = async (req, res) => {
    try {
        const { sub, role } = req.user;
        const { name, age, gender, phone, email, photo, experience, located_address, preferred_areas, categories } = req.body;

        if (role === "worker") {
            const worker = await Worker.findById(sub);
            if (!worker) {
                return res.status(404).json({ success: false, message: 'Worker not found' });
            }

            if (name !== undefined) worker.name = name;
            if (age !== undefined) worker.age = Number(age);
            if (gender !== undefined) worker.gender = gender;
            if (phone !== undefined) {
                if (worker.phone !== phone) {
                    worker.phone = phone;
                    worker.isPhoneVerified = false;
                }
            }
            if (email !== undefined) {
                if (worker.email !== email) {
                    worker.email = email;
                    worker.isEmailVerified = false;
                }
            }
            if (experience !== undefined) worker.experience = Number(experience);
            if (located_address !== undefined) worker.located_address = located_address;
            
            if (preferred_areas !== undefined) {
                worker.preferred_areas = Array.isArray(preferred_areas)
                    ? preferred_areas
                    : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);
            }
            if (categories !== undefined) {
                const parsedCategories = Array.isArray(categories)
                    ? categories.map(c => c.trim()).filter(Boolean)
                    : String(categories).split(",").map(c => c.trim()).filter(Boolean);
                worker.categories = [...new Set(parsedCategories)];
            }

            if (photo !== undefined && photo !== "") {
                const uploadedPhotoUrl = await uploadWorkerPhoto(photo);
                worker.photo = uploadedPhotoUrl || worker.photo || photo;
            }

            await worker.save();
            return res.json({
                success: true,
                message: 'Worker profile updated successfully',
                user: {
                    ...worker.toObject(),
                    role: 'worker'
                },
            });
        } else {
            const user = await User.findById(sub);
            if (!user) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            if (name !== undefined) user.name = name;
            if (age !== undefined) user.age = Number(age);
            if (gender !== undefined) user.gender = gender;
            if (phone !== undefined) {
                if (user.phone !== phone) {
                    user.phone = phone;
                    user.isPhoneVerified = false;
                }
            }
            if (email !== undefined) {
                if (user.email !== email) {
                    user.email = email;
                    user.isEmailVerified = false;
                }
            }

            if (photo !== undefined && photo !== "") {
                const uploadedPhotoUrl = await uploadWorkerPhoto(photo);
                user.photo = uploadedPhotoUrl || user.photo || photo;
            }

            await user.save();
            return res.json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    ...user.toObject(),
                    role: 'user'
                },
            });
        }
    } catch (error) {
        console.error('[updateProfileController]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

const verifyWorkerPhoneController = async (req, res) => {
    try {
        const { sub, role } = req.user;
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ success: false, message: "Firebase ID Token is required" });
        }

        const { verifyFirebaseToken } = require('../middleware/firebaseAdmin.middleware');
        const firebaseUser = await verifyFirebaseToken(idToken);

        if (!firebaseUser.phone_number) {
            return res.status(400).json({ success: false, message: "No phone number found in Firebase token. Please complete verification." });
        }

        let account;
        if (role === "worker") {
            account = await Worker.findById(sub);
        } else if (role === "user") {
            account = await User.findById(sub);
        } else {
            // Fallback for mock tests/legacy: check Worker then User
            account = await Worker.findById(sub);
            if (!account) {
                account = await User.findById(sub);
            }
        }

        if (!account) {
            return res.status(404).json({ success: false, message: `${role === "worker" ? "Worker" : "User"} not found` });
        }

        const firebasePhone = firebaseUser.phone_number.replace(/\D/g, "").slice(-10);
        const dbPhone = account.phone.replace(/\D/g, "").slice(-10);

        if (firebasePhone !== dbPhone) {
            return res.status(400).json({ 
                success: false, 
                message: `Phone number mismatch. Firebase verified ${firebaseUser.phone_number}, but profile has ${account.phone}` 
            });
        }

        account.isPhoneVerified = true;
        await account.save();

        return res.json({
            success: true,
            message: "Phone number verified successfully",
            user: {
                ...account.toObject(),
                role
            }
        });
    } catch (error) {
        console.error("[verifyWorkerPhoneController] Error:", error);
        return res.status(500).json({ success: false, message: "Verification failed: " + error.message });
    }
};

// Retrieves the public client-side Firebase configurations securely from process.env
const getFirebaseConfigController = async (req, res) => {
    try {
        return res.json({
            success: true,
            config: {
                apiKey: process.env.VITE_FIREBASE_API_KEY || "",
                authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
                projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
                storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
                messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
                appId: process.env.VITE_FIREBASE_APP_ID || "",
                measurementId: process.env.VITE_FIREBASE_MESAURE_ID || ""
            }
        });
    } catch (error) {
        console.error('[getFirebaseConfigController]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// Dynamically writes incoming config parameters into git-ignored server-side .env configurations,
// hot-reloads process.env parameters dynamically, and re-establishes database connections.
const syncAdminConfigController = async (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        const dotenv = require('dotenv');
        const mongoose = require('mongoose');

        const { mongo, firebase, cloudinary, gemini } = req.body;

        if (!mongo || !firebase) {
            return res.status(400).json({ success: false, message: 'mongo and firebase parameters are required' });
        }

        // Formulate environment variables content
        const envString = `# RapidFix Auto-Generated Environment Variables - ${new Date().toLocaleDateString()}
# Strictly secure - Do NOT share on GitHub

# MongoDB Configuration
MONGODB_URL=${mongo.uri || "mongodb://localhost:27017/rapid_fix_db"}
MONGODB_DB_NAME=${mongo.dbName || "rapid_fix_db"}
MONGODB_MAX_POOL_SIZE=${mongo.maxPoolSize || 10}
MONGODB_TIMEOUT=${mongo.timeout || 5000}

# Firebase Client Configuration
VITE_FIREBASE_API_KEY=${firebase.apiKey || ""}
VITE_FIREBASE_AUTH_DOMAIN=${firebase.authDomain || ""}
VITE_FIREBASE_PROJECT_ID=${firebase.projectId || ""}
VITE_FIREBASE_STORAGE_BUCKET=${firebase.storageBucket || ""}
VITE_FIREBASE_MESSAGING_SENDER_ID=${firebase.messagingSenderId || ""}
VITE_FIREBASE_APP_ID=${firebase.appId || ""}
VITE_FIREBASE_MESAURE_ID=${firebase.measurementId || ""}

# Cloudinary Storage Configuration
CLOUD_NAME=${cloudinary?.cloudName || ""}
CLOUD_API_KEY=${cloudinary?.apiKey || ""}
CLOUD_API_SECRET=${cloudinary?.apiSecret || ""}

# Gemini AI Configuration
GEMINI_API_KEY=${gemini?.apiKey || ""}
`;

        // Paths to save
        const backendEnvPath = path.resolve(__dirname, '../.env');
        const frontendEnvPath = path.resolve(__dirname, '../../frontend/.env');

        // Write backend env
        fs.writeFileSync(backendEnvPath, envString, 'utf-8');

        // Write frontend env if directory exists
        const frontendDir = path.resolve(__dirname, '../../frontend');
        if (fs.existsSync(frontendDir)) {
            fs.writeFileSync(frontendEnvPath, envString, 'utf-8');
        }

        // Dynamically reload/update in-memory process.env
        const parsedEnv = dotenv.parse(envString);
        for (const k in parsedEnv) {
            process.env[k] = parsedEnv[k];
        }

        // Map process.env.MONGODB_URL to parsed MONGODB_URL
        process.env.MONGODB_URL = parsedEnv.MONGODB_URL;

        // Re-trigger Mongoose dynamic database connection
        let dbStatus = "Idle";
        try {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.disconnect();
            }
            
            let dbUri = process.env.MONGODB_URL;
            const dbName = process.env.MONGODB_DB_NAME || "rapid_fix_db";
            
            if (dbUri) {
                const urlWithoutProtocol = dbUri.replace(/^mongodb(\+srv)?:\/\//, "");
                const hasPath = urlWithoutProtocol.includes("/");
                if (!hasPath) {
                    dbUri = `${dbUri.replace(/\/$/, "")}/${dbName}`;
                } else {
                    const pathParts = urlWithoutProtocol.split("/");
                    const dbPart = pathParts[1] ? pathParts[1].split("?")[0] : "";
                    if (!dbPart) {
                        dbUri = dbUri.replace(/\/?(\?.*)?$/, `/${dbName}$1`);
                    }
                }
            } else {
                dbUri = `mongodb://localhost:27017/${dbName}`;
            }

            await mongoose.connect(dbUri);
            dbStatus = `Connected successfully to database: "${mongoose.connection.name}"`;
            console.log(`[DATABASE] Dynamically re-connected to database: "${mongoose.connection.name}"`);
        } catch (dbErr) {
            dbStatus = "Failed to connect: " + dbErr.message;
            console.error("[DATABASE] Dynamic re-connection error:", dbErr.message);
        }

        // Dynamic hot-reload of Cloudinary configuration
        try {
            const cloudinarySDK = require('../config/cloudinary.js');
            cloudinarySDK.config({
                cloud_name: process.env.CLOUD_NAME,
                api_key: process.env.CLOUD_API_KEY,
                api_secret: process.env.CLOUD_API_SECRET
            });
            console.log("[CLOUDINARY] Dynamically re-configured Cloudinary SDK credentials.");
        } catch (cloudErr) {
            console.error("[CLOUDINARY] Dynamic re-configuration warning:", cloudErr.message);
        }

        return res.json({
            success: true,
            message: 'Configurations synced and reloaded successfully.',
            dbStatus
        });
    } catch (error) {
        console.error('[syncAdminConfigController]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// Permanently deletes a user or worker account, along with all associated problems/addresses,
// preserving only ratings/reviews.
// Requires confirmation of matching role@name in request body.
const deleteAccountController = async (req, res) => {
    try {
        const { sub, role } = req.user; // from authMiddleware
        const { confirmation } = req.body;

        if (!confirmation) {
            return res.status(400).json({ success: false, message: "Confirmation text is required." });
        }

        const Address = require("../model/address.model");
        const Problem = require("../model/problem.model");
        const Worker = require("../model/workers.model");
        const User = require("../model/user.model");

        let account = null;
        if (role === "worker") {
            account = await Worker.findById(sub);
        } else {
            account = await User.findById(sub);
        }

        if (!account) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        // Enforce role@name verification
        const expectedConfirmation = `${role}@${account.name}`;
        if (confirmation.trim() !== expectedConfirmation) {
            return res.status(400).json({
                success: false,
                message: `Confirmation text mismatch. Please type exactly: "${expectedConfirmation}" to proceed.`
            });
        }

        // Delete from Firebase Auth using Admin SDK if firebaseUid is present
        if (account.firebaseUid) {
            try {
                const { deleteFirebaseUser } = require("../middleware/firebaseAdmin.middleware");
                await deleteFirebaseUser(account.firebaseUid);
            } catch (fbAdminErr) {
                console.warn("[deleteAccountController] Firebase Admin SDK deleteUser failed (likely due to unconfigured admin service credentials):", fbAdminErr.message);
            }
        }

        if (role === "worker") {
            // Dissociate worker from active assignments and revert problem status to pending
            await Problem.updateMany(
                { assigned_worker: sub },
                { $set: { assigned_worker: null, status: "pending" } }
            );
            // Dissociate worker from resolved fields if any (preserving the problem record)
            await Problem.updateMany(
                { resolved_worker: sub },
                { $set: { resolved_worker: null } }
            );
            // Remove from worker collection
            await Worker.findByIdAndDelete(sub);
        } else {
            // Delete all user addresses
            await Address.deleteMany({ belong_to: sub });
            
            // Delete all problems raised by this user
            await Problem.deleteMany({ userId: sub });
            
            // Remove from user collection
            await User.findByIdAndDelete(sub);
        }

        return res.json({
            success: true,
            message: "Your account and all associated data have been permanently deleted."
        });
    } catch (error) {
        console.error('[deleteAccountController]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

// Retrieve the active backend environment configuration (excluding/masking if needed, or returning directly as requested)
const getAdminConfigController = async (req, res) => {
    try {
        return res.json({
            success: true,
            config: {
                mongo: {
                    uri: process.env.MONGODB_URL || "",
                    dbName: process.env.MONGODB_DB_NAME || "rapid_fix_db",
                    maxPoolSize: Number(process.env.MONGODB_MAX_POOL_SIZE) || 10,
                    timeout: Number(process.env.MONGODB_TIMEOUT) || 5000,
                },
                firebase: {
                    apiKey: process.env.VITE_FIREBASE_API_KEY || "",
                    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
                    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
                    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
                    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
                    appId: process.env.VITE_FIREBASE_APP_ID || "",
                    measurementId: process.env.VITE_FIREBASE_MESAURE_ID || "",
                },
                cloudinary: {
                    cloudName: process.env.CLOUD_NAME || "",
                    apiKey: process.env.CLOUD_API_KEY || "",
                    apiSecret: process.env.CLOUD_API_SECRET || "",
                },
                gemini: {
                    apiKey: process.env.GEMINI_API_KEY || "",
                }
            }
        });
    } catch (error) {
        console.error('[getAdminConfigController]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
};

module.exports = {
    sendOtpController,
    verifyOtpController,
    completeProfileController,
    meController,
    firebaseAuthController,
    firebaseCompleteProfileController,
    updateProfileController,
    getFirebaseConfigController,
    syncAdminConfigController,
    getAdminConfigController,
    deleteAccountController,
    verifyWorkerPhoneController,
};
