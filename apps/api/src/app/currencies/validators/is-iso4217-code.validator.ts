import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { isValidISO4217Code } from '../constants/iso-4217-codes';

/**
 * Custom validator decorator to check if a string is a valid ISO 4217 currency code
 */
export function IsISO4217Code(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isISO4217Code',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: string) {
          if (typeof value !== 'string') {
            return false;
          }
          return isValidISO4217Code(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid ISO 4217 currency code (e.g., USD, EUR, CHF)`;
        },
      },
    });
  };
}
