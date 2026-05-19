
export interface user {

    _id: string;

    name: string;
    age: number;
    gender?: string

    stored_addresses: string[];

    defaultAddress: string;

    email: string;
    phone: string;

    firebaseUid: string;
} 