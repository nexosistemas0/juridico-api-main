import {
  CreateUserInput,
  UpdateUserInput,
} from "../../types/user.types.js";
import * as yup from "yup"



export const bodyValidationCreate:  yup.ObjectSchema<CreateUserInput> = yup.object().shape({
    name: yup.string().required(),
    email: yup.string().email().required(),
    phone: yup.string().required(),
    password: yup.string().required()
});

export const bodyValidationUpdate: yup.ObjectSchema<UpdateUserInput> = yup.object().shape({
    name: yup.string(),
    email: yup.string().email(),
    phone: yup.string(),
    password: yup.string().required()
})

