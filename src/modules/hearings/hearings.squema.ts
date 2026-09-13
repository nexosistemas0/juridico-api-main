import * as types from "../../types/hearings.types.js";
import * as yup from "yup";

export const bodyValidationCreate: yup.ObjectSchema<types.CreateHearing> = yup.object().shape({
    id_process: yup.number().required(),
    type: yup.string().required().min(2).max(100),
    date: yup.string(),
    hour: yup.string(),
    place: yup.string().required().min(2).max(100),
    room: yup.string().required().min(2).max(100),
    meeting_link: yup.string().required().min(2).max(100),
    guidelines: yup.string().required().min(2).max(100),
});

export const bodyValidationUpdate: yup.ObjectSchema<types.UpdateHearing> = yup.object().shape({
    id_process: yup.number(),
    type: yup.string().min(2).max(100),
    date: yup.string(),
    hour: yup.string().min(2).max(100),
    place: yup.string().min(2).max(100),
    room: yup.string().min(2).max(100),
    meeting_link: yup.string().min(2).max(100),
    guidelines: yup.string().min(2).max(100),
});


