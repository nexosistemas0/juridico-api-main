import * as yup from "yup";
import {CreateCostumersInput, UpdateCostumersInput} from "../../types/costumers.types.js";


export const bodyValidationCreate:  yup.ObjectSchema<CreateCostumersInput> = yup.object().shape({
    id_user: yup.number().required().integer(),
    cpf: yup.string().required(),
    date: yup.date().required(),
    address: yup.string().required()
});

export const bodyValidationUpdate: yup.ObjectSchema<UpdateCostumersInput> = yup.object().shape({
    id_user: yup.number().integer(),
    cpf: yup.string(),
    date: yup.date(),
    address: yup.string()
});
