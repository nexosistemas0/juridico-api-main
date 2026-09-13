import * as types from "../../types/movements.types.js";
import * as yup from "yup";


export const bodyValidationCreate: yup.ObjectSchema<types.CreateMovements> = yup.object().shape({
    id_process: yup.number().integer().required(),
    date: yup.string(),
    title: yup.string().required(),
    description: yup.string().strict().required()
});

export const bodyValidationUpdate: yup.ObjectSchema<types.UpdateMovements> = yup.object().shape({
    id_process: yup.number().integer(),
    date: yup.string(),
    title: yup.string(),
    description: yup.string().strict()   
})
