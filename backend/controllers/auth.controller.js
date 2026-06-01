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
            });
        }

        if (role === "worker") {
            const {
                name,
                age,
                experience,
                preferred_areas,
                located_address,
                photo,
            } = req.body;

            if (!name || !age || experience === undefined || !located_address || !photo || !preferred_areas) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required worker fields: name, age, experience, located_address, preferred_areas, and photo are compulsory.",
                });
            }

            const parsedAreas = Array.isArray(preferred_areas)
                ? preferred_areas
                : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);

            const uploadedPhotoUrl = await uploadWorkerPhoto(photo);

            account = await Worker.create({
                name,
                age: Number(age),
                experience: Number(experience),
                preferred_areas: parsedAreas,
                located_address,
                photo: uploadedPhotoUrl,
                phone,
                authProvider: "twilio",
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
            ? (w) => w && w.name && w.age && w.experience !== undefined && w.located_address && w.photo && w.preferred_areas?.length > 0 && w.phone
            : (u) => u && u.name && u.age && u.gender && u.phone;

        // If all profile fields provided in body, upsert the account
        if (standardRole === "worker") {
            const { experience, preferred_areas, located_address, photo } = req.body;
            if (name && age && experience !== undefined && located_address && photo && preferred_areas && phone) {
                const parsedAreas = Array.isArray(preferred_areas)
                    ? preferred_areas
                    : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);

                const uploadedPhotoUrl = await uploadWorkerPhoto(photo);

                if (account) {
                    account.firebaseUid = firebaseUser.uid;
                    account.authProvider = 'firebase';
                    if (!account.name) account.name = name;
                    if (!account.age) account.age = Number(age);
                    if (account.experience === undefined) account.experience = Number(experience);
                    if (!account.located_address) account.located_address = located_address;
                    account.photo = uploadedPhotoUrl || account.photo || photo;
                    if (!account.preferred_areas || account.preferred_areas.length === 0) account.preferred_areas = parsedAreas;
                    if (!account.phone) account.phone = phone;
                    if (!account.email && resolvedEmail) account.email = resolvedEmail;
                    await account.save();
                } else {
                    account = await Worker.create({
                        name,
                        age: Number(age),
                        experience: Number(experience),
                        located_address,
                        photo: uploadedPhotoUrl,
                        preferred_areas: parsedAreas,
                        phone,
                        email: resolvedEmail || '',
                        firebaseUid: firebaseUser.uid,
                        authProvider: 'firebase',
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
                    });
                }
            }
        }

        // If account exists and profile is complete, issue token
        if (account && isProfileComplete(account)) {
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

        // Profile incomplete — return setup token and what we know from Firebase
        const setupToken = generateSetupToken({
            role: standardRole,
            firebaseUid: firebaseUser.uid,
            email: resolvedEmail,
            needsProfile: true,
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
        const { firebaseUid, email, role = "user" } = req.user; // from requireSetupToken middleware
        const standardRole = role === "worker" ? "worker" : "user";

        if (standardRole === "worker") {
            const { name, age, experience, located_address, preferred_areas, photo, phone } = req.body;
            if (!name || !age || experience === undefined || !located_address || !photo || !preferred_areas || !phone) {
                return res.status(400).json({ success: false, message: 'All worker fields are required: name, age, experience, located_address, preferred_areas, photo and phone are compulsory.' });
            }

            const parsedAreas = Array.isArray(preferred_areas)
                ? preferred_areas
                : String(preferred_areas).split(",").map(a => a.trim()).filter(Boolean);

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
                account.experience = Number(experience);
                account.located_address = located_address;
                account.photo = uploadedPhotoUrl || account.photo || photo;
                account.preferred_areas = parsedAreas;
                account.phone = phone;
                if (!account.email && email) account.email = email;
                await account.save();
            } else {
                account = await Worker.create({
                    name,
                    age: Number(age),
                    experience: Number(experience),
                    located_address,
                    photo: uploadedPhotoUrl,
                    preferred_areas: parsedAreas,
                    phone,
                    email: email || '',
                    firebaseUid,
                    authProvider: 'firebase',
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
        const { sub } = req.user;
        const { name, age, gender, phone, email } = req.body;

        const user = await User.findById(sub);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (name !== undefined) user.name = name;
        if (age !== undefined) user.age = Number(age);
        if (gender !== undefined) user.gender = gender;
        if (phone !== undefined) user.phone = phone;
        if (email !== undefined) user.email = email;

        await user.save();

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            user,
        });
    } catch (error) {
        console.error('[updateProfileController]', error);
        return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
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

        const { mongo, firebase, cloudinary } = req.body;

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
};
