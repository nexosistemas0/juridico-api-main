export interface Costumers {
    id: number,
    id_user: number,
    cpf: string,
    date: Date,
    address: string
}

export type CreateCostumersInput = Omit<Costumers, "id">; 
export type UpdateCostumersInput = Partial<CreateCostumersInput>;