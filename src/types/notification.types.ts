export type Notification = {
    id: number;
    id_user: number;
    title: string;
    description: string;
    date: string;
    read: boolean;
}

export type NotificationCreate = Omit<Notification, "id">
export type NotificationUpdate = Partial<NotificationCreate>;
