export type Role = "user" | "worker";

export interface AuthUser {
    _id: string;
    name: string;
    phone: string;
    email?: string;
    age?: number;
    gender?: string;
    experience?: number;
    located_address?: string;
    preferred_areas?: string[];
    photo?: string;
    verificationStatus?: boolean;
    isPhoneVerified?: boolean;
    firebaseUid?: string;
}

export interface AuthContextType {
    token: string | null;
    role: string | null;
    user: AuthUser | null;

    login : (
        token: string,
        role: Role,
        user: AuthUser
    ) => void;

    logout: ()=> void;
}

