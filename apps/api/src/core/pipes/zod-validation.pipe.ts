import {
  PipeTransform,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new UnprocessableEntityException({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: formatZodErrors(result.error),
      });
    }

    return result.data;
  }
}

function formatZodErrors(error: ZodError): string[] {
  return error.errors.map((e) => {
    const field = e.path.join('.');
    return field ? `${field}: ${e.message}` : e.message;
  });
}
