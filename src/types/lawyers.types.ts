
export type Lawyers = {
    id: number;
    id_user: number;
    oab: string;
    position: string;
    whatsapp: string;
    photo: string;
};

export type CreateLawyersInput = Omit<Lawyers, "id">;
export type UpdateLawyersInput = Partial<CreateLawyersInput>;