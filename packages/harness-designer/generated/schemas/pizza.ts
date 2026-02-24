import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const crustTypeEnum = z.enum([
  'thin',
  'thick',
  'stuffed',
]);

// =============================================================================
// Pizza schemas
// =============================================================================

export const pizzaCreateSchema = z.object({
  pizzaName: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  toppings: z.array(z.string()).optional(),
  crustType: crustTypeEnum.optional(),
}).describe('pizza-shop/PizzaCreate');

export type PizzaCreate = z.infer<typeof pizzaCreateSchema>;
