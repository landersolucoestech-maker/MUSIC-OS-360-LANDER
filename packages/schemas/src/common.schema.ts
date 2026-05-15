import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const isoDateSchema = z.string().datetime({ offset: true });

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Telefone inválido");

export const cpfSchema = z
  .string()
  .regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/, "CPF inválido");

export const cnpjSchema = z
  .string()
  .regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/, "CNPJ inválido");

export const isrcSchema = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]{3}\d{7}$/, "ISRC inválido (ex: BRUM71400520)");

export const iswcSchema = z
  .string()
  .regex(/^T-\d{9}-\d$/, "ISWC inválido (ex: T-123456789-0)");

export const monetarySchema = z
  .number()
  .finite()
  .multipleOf(0.01, "Valor monetário deve ter no máximo 2 casas decimais");

export const nonEmptyString = z.string().min(1, "Campo obrigatório");
