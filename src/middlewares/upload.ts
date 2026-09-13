import multer from "multer";

export const upload = multer({
  storage: multer.memoryStorage(), // mantém o arquivo em memória como Buffer, não grava em disco
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, ajuste conforme necessário
});