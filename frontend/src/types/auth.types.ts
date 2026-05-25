export type Role = "user" | "worker";

export interface AuthUser {
    _id: string;
    name: string;
    phone: string;
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

