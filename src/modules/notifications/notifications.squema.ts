import * as types from "../../types/notification.types.js";
import * as yup from "yup";

export const notificationSchema: yup.ObjectSchema<types.Notification> = yup.object({
    id: yup.number().required(),
    id_user: yup.number().required(),
    title: yup.string().required(),
    description: yup.string().required(),
    date: yup.string().required(),
    read: yup.boolean().required(),
});

export const notificationCreateSchema: yup.ObjectSchema<types.NotificationCreate> = yup.object({
    id_user: yup.number().required(),
    title: yup.string().required(),
    description: yup.string().required(),
    date: yup.string().required(),
    read: yup.boolean().required(),
});

export const notificationUpdateSchema: yup.ObjectSchema<types.NotificationUpdate> = yup.object({
    id_user: yup.number(),
    title: yup.string(),
    description: yup.string(),
    date: yup.string(),
    read: yup.boolean(),
});



