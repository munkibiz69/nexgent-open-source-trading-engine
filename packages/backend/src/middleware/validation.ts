import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '@/shared/errors/index.js';

/**
 * Validation middleware factory
 * 
 * Validates request body, query, and params against a Zod schema.
 * Automatically detects if the schema is for the full request object (containing body/query/params keys)
 * or just the body (flat object).
 * 
 * @param schema - Zod schema to validate against
 */
export const validate = (schema: AnyZodObject) => 
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check if schema matches the request structure (has body/query/params keys)
      // We check 'shape' property which exists on ZodObject
      const shape = schema.shape;
      const isRequestSchema = 'body' in shape || 'query' in shape || 'params' in shape;

      if (isRequestSchema) {
        // Validate full request object
        await schema.parseAsync({
          body: req.body,
          query: req.query,
          params: req.params,
        });
      } else {
        // Validate just body
        req.body = await schema.parseAsync(req.body);
      }
      
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return next(new ValidationError('Validation failed', { errors: details }));
      }
      return next(error);
    }
  };
