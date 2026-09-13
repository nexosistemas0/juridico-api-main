import * as yup from "yup";

import { CreateLawyersInput, UpdateLawyersInput } from "../../types/lawyers.types.js";

export const bodyValidationCreate: yup.ObjectSchema<CreateLawyersInput> = yup.object().shape({
  id_user: yup.number().required().integer(),
  oab: yup.string().required(),
  position: yup.string().required(),
  whatsapp: yup.string().required(),
  photo: yup.string().required(),
});

export const bodyValidationUpdate: yup.ObjectSchema<UpdateLawyersInput> = yup.object().shape({
  id_user: yup.number().integer(),
  oab: yup.string().optional(),
  position: yup.string().optional(),
  whatsapp: yup.string().optional(),
  photo: yup.string().optional(),
});
