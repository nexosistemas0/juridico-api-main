import * as yup from "yup";
import { CreateDocument, UpdateDocument } from "../../types/documents.types.js";

export const bodyValidationCreate: yup.ObjectSchema<Omit<CreateDocument, "file">> = yup.object().shape({
  id_process: yup.number().required().integer(),
  name: yup.string().required().min(2).max(100),
  status: yup.string().required().min(2).max(100),
  date_sed: yup.date().required(),
  date_ass: yup.date().required(),
});

export const bodyValidationUpdate: yup.ObjectSchema<Omit<UpdateDocument, "file">> = yup.object().shape({
  id_process: yup.number().integer(),
  name: yup.string().min(2).max(100),
  status: yup.string().min(2).max(100),
  date_sed: yup.date(),
  date_ass: yup.date(),
});