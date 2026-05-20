/**
 * Joi validation middleware.
 * Validates req.body against the given schema.
 * Returns 422 with a structured error on failure.
 */
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(422).json({
        status: 422,
        error: 'Validation Error',
        message: error.details.map((d) => d.message).join(', '),
      });
    }
    next();
  };
}

module.exports = validate;
