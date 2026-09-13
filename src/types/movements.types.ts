export type Movements = {
    id: number,
    id_process: number,
    date?: string,
    title: string,
    description: string
}

export type CreateMovements = Omit<Movements, "id">;
export type UpdateMovements = Partial<CreateMovements>;