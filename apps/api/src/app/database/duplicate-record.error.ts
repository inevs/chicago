import { ConflictException } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';

/** Prisma error code for a violated unique constraint. */
const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Thrown by repositories when a write violates a unique constraint
 * (e.g. a concurrent request inserted the same key after a pre-check).
 * Keeps services independent of ORM-specific error types.
 */
export class DuplicateRecordError extends Error {
  constructor(message = 'Record already exists') {
    super(message);
    this.name = 'DuplicateRecordError';
  }
}

/**
 * Runs the given database operation and translates a unique-constraint
 * violation into a DuplicateRecordError. All other errors are rethrown unchanged.
 */
export async function translateDuplicateError<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    ) {
      throw new DuplicateRecordError();
    }
    throw error;
  }
}

/**
 * Promise rejection handler for services: maps a DuplicateRecordError to a
 * ConflictException with the given message and rethrows all other errors.
 */
export function rethrowDuplicateAsConflict(
  message: string
): (error: unknown) => never {
  return (error: unknown) => {
    if (error instanceof DuplicateRecordError) {
      throw new ConflictException(message);
    }
    throw error;
  };
}
