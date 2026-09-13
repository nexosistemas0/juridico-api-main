export type Documents = {
    id: number,
    id_process: number,
    name: string,
    file: File,
    status: string,
    date_sed: Date,
    date_ass: Date
};

export type CreateDocument = Omit<Documents, "id">;
export type UpdateDocument = Partial<CreateDocument>;