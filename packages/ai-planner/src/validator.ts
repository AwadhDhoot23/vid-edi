import { z } from 'zod';
import { ALLOWED_OPERATION_TYPES, type EditOperation, type EditOperationType } from '@vid-edi/shared-types';

export const EditOperationSchema = z.object({
  id: z.string().min(1),
  type: z.enum(ALLOWED_OPERATION_TYPES as [EditOperationType, ...EditOperationType[]]),
  target: z.object({
    clipId: z.string().min(1),
    trackId: z.string().min(1),
  }),
  sourceRange: z
    .object({
      start: z.number().min(0),
      end: z.number().min(0),
    })
    .refine((data) => data.start < data.end, {
      message: 'sourceRange.start must be strictly less than sourceRange.end',
    })
    .optional(),
  params: z.record(z.unknown()).default({}),
  reason: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(['proposed', 'accepted', 'rejected', 'modified']).default('proposed'),
});

export const EditPlanArraySchema = z.array(EditOperationSchema);

export interface ValidationSuccess {
  success: true;
  data: EditOperation[];
}

export interface ValidationFailure {
  success: false;
  errors: string[];
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validates raw AI proposals against the strict security allowlist and timeline constraints.
 */
export function validateEditPlan(
  rawInput: unknown,
  mediaDuration?: number
): ValidationResult {
  const parseResult = EditPlanArraySchema.safeParse(rawInput);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.errors.map(
      (err) => `${err.path.join('.')}: ${err.message}`
    );
    return { success: false, errors: errorMessages };
  }

  const operations = parseResult.data;
  const semanticErrors: string[] = [];

  for (const op of operations) {
    if (op.sourceRange && mediaDuration !== undefined) {
      if (op.sourceRange.end > mediaDuration) {
        semanticErrors.push(
          `Operation ${op.id}: sourceRange end (${op.sourceRange.end}s) exceeds media duration (${mediaDuration}s)`
        );
      }
    }
  }

  // Check for duplicate or conflicting overlapping operations
  for (let i = 0; i < operations.length; i++) {
    for (let j = i + 1; j < operations.length; j++) {
      const opA = operations[i];
      const opB = operations[j];
      if (
        opA &&
        opB &&
        opA.target.clipId === opB.target.clipId &&
        opA.sourceRange &&
        opB.sourceRange
      ) {
        const overlaps =
          Math.max(opA.sourceRange.start, opB.sourceRange.start) <
          Math.min(opA.sourceRange.end, opB.sourceRange.end);
        if (overlaps) {
          semanticErrors.push(
            `Operations ${opA.id} and ${opB.id} have overlapping source ranges on clip ${opA.target.clipId}`
          );
        }
      }
    }
  }

  if (semanticErrors.length > 0) {
    return { success: false, errors: semanticErrors };
  }

  return { success: true, data: operations };
}
