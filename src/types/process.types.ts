export type Process = {
    id: number;
    process_num: string;
    title: string; 
    id_costumer: number;
    id_lawyer: number;
    status: string;
    area: string;
    last_update: Date;
    court: string;
    observations: string;
}

export type CreateProcessInput = Omit<Process, "id" | "last_update">;
export type UpdateProcessInput = Partial<CreateProcessInput>;