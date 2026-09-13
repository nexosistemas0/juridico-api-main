import * as yup from "yup";

import { CreateProcessInput, UpdateProcessInput } from "../../types/process.types.js";

export const bodyValidationCreate: yup.ObjectSchema<CreateProcessInput> = yup.object().shape({
  process_num: yup.string().required(),
  title: yup.string().required(),
    id_costumer: yup.number().required().integer(),
    id_lawyer: yup.number().required().integer(),
    status: yup.string().required(),
    area: yup.string().required(),
    last_update: yup.date().required(),
    court: yup.string().required(),
    observations: yup.string().required(),
});

export const bodyValidationUpdate: yup.ObjectSchema<UpdateProcessInput> = yup.object().shape({
  process_num: yup.string().optional(),
  title: yup.string().optional(),
    id_costumer: yup.number().integer().optional(),
    id_lawyer: yup.number().integer().optional(),
    status: yup.string().optional(),
    area: yup.string().optional(),
    last_update: yup.date().optional(),
    court: yup.string().optional(),
    observations: yup.string().optional(),
}); 