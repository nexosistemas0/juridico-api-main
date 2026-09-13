import { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import * as validation from "./notifications.squema.js"; // ajuste pro nome real do seu arquivo
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
    if (!req.body) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: ["O arquivo é obrigatório"],
      });
    }

    const validatedBody = await validation.notificationCreateSchema.validate(req.body, {
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

export const updateValidator: RequestHandler = async (req, res, next) => {
  try {
    const validatedId = await idParamSchema.validate(req.params, {
      abortEarly: false,
    });

    const hasBody = req.body && Object.keys(req.body).length > 0;
    const hasFile = Boolean(req.file);

    if (!hasBody && !hasFile) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        message: "Erro de validação",
        errors: ["Envie ao menos um campo ou um novo arquivo para atualizar"],
      });
    }

    const validatedBody = await validation.notificationUpdateSchema.validate(req.body ?? {}, {
      stripUnknown: true,
      abortEarly: false,
    });

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