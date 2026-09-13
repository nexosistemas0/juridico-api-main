import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import {
  bodyValidationUpdate,
  bodyValidationCreate,
} from "./process.squema.js";
import * as yup from "yup";
import { YupErrors } from "../../middlewares/yupError.js";

export const idParamSchema = yup.object({
  id: yup
    .number()
    .typeError("ID deve ser um número")
    .integer("ID deve ser um número inteiro")
    .positive("ID deve ser positivo")
    .required("ID é obrigatório"),
});

export const removeValidator: RequestHandler = async (req, res, next) => {
  try {
    const validatedId = await idParamSchema.validate(req.params, {
      abortEarly: false,
    });
    req.params.id = String(validatedId.id);
    next();
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: YupErrors(err),
      });
    }
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ errors: ["Dados inválidos"] });
  }
};

export const createValidator: RequestHandler = async (req, res, next) => {
  try {
    const validatedBody = await bodyValidationCreate.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });
    req.body = validatedBody;
    next();
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: YupErrors(err),
      });
    }
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ errors: ["Dados inválidos"] });
  }
};

// costumer.validator.ts
export const updateValidator: RequestHandler = async (req, res, next) => {
  try {
    const validatedId = await idParamSchema.validate(req.params, {
      abortEarly: false,
    });

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: ["O corpo da requisição não pode estar vazio"],
      });
    }

    const validatedBody = await bodyValidationUpdate.validate(req.body, {
      stripUnknown: true,
      abortEarly: false,
    });

    if (!validatedBody || Object.keys(validatedBody).length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: ["O corpo da requisição não pode estar vazio"],
      });
    }

    req.params.id = String(validatedId.id);
    req.body = validatedBody;
    next();
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: YupErrors(err),
      });
    }
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ errors: ["Dados inválidos"] });
  }
};
