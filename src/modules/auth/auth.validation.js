'use strict';

const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  token: Joi.string().hex().length(64).required(),
  newPassword: Joi.string().min(8).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const inviteUserSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'finance_officer', 'hr').required(),
});

/**
 * Middleware factory — validates req.body against a Joi schema.
 * Throws 400 with field-level details on failure.
 */
function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const AppError = require('../../shared/utils/AppError');
      const details = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return next(new AppError('The request contains invalid fields.', 400, 'VALIDATION_ERROR', details));
    }

    req.body = value; // Replace with sanitised value
    next();
  };
}

module.exports = {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshSchema,
  inviteUserSchema,
  validate,
};
