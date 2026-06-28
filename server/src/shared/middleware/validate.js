'use strict';

const AppError = require('../utils/AppError');

/**
 * Middleware factory: validate(schema, target)
 *
 * Validates req[target] against the given Joi schema.
 * On success: replaces req[target] with the sanitised, coerced value.
 * On failure: calls next() with a 422 AppError containing field-level details.
 *
 * @param {object} schema  - Joi schema object
 * @param {string} target  - 'body' | 'params' | 'query' (default: 'body')
 *
 * Usage:
 *   router.post('/register', validate(schemas.register), registerController);
 *   router.get('/:id',       validate(schemas.idParam, 'params'), getById);
 */
function validate(schema, target = 'body') {
  return function validateMiddleware(req, res, next) {
    const { error, value } = schema.validate(req[target], {
      abortEarly:   false,   // Collect all errors, not just the first
      stripUnknown: true,    // Remove fields not in the schema
      convert:      true,    // Coerce types (e.g. string '3' → number 3)
    });

    if (error) {
      const details = error.details.map((d) => ({
        field:   d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));

      return next(AppError.validation('Validation failed', details));
    }

    // Replace with the sanitised + coerced value
    req[target] = value;
    next();
  };
}

module.exports = validate;
