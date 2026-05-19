import type { Address } from "./address";


export type ProblemStatus = 
        | "unresolved"
        | "pending" 
        | "resolved";

export interface Problem {

    _id: string;

    userId: string;

    picture?: string;
    video?: string;

    name: string;
    description: string;

    address: Address;

    status: ProblemStatus

    assigned_worker?: string;  //id not string exactly

    urgency: boolean;

    createdAt: string;
    updatedAt: string;
}
