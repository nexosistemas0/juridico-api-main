// config/yupLocale.ts
import { setLocale } from "yup";

setLocale({
  mixed: {
    required: "${path} é obrigatório",
    notType: "${path} tem um tipo inválido",
  },
  string: {
    min: "${path} deve ter no mínimo ${min} caracteres",
    max: "${path} deve ter no máximo ${max} caracteres",
    email: "${path} deve ser um e-mail válido",
    length: "${path} deve ter exatamente ${length} caracteres",
  },
  number: {
    min: "${path} deve ser no mínimo ${min}",
    max: "${path} deve ser no máximo ${max}",
    positive: "${path} deve ser um número positivo",
    integer: "${path} deve ser um número inteiro",
  },
  date: {
    min: "${path} deve ser depois de ${min}",
    max: "${path} deve ser antes de ${max}",
  },
});