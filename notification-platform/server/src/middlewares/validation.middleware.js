const ValidationError = require('../shared/errors/validation-error');

const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const formattedErrors = result.error.errors.map((err) => ({
        field: err.path.slice(1).join('.'),
        message: err.message,
      }));
      throw new ValidationError('Input validation failed', formattedErrors);
    }

    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query;
    if (result.data.params) req.params = result.data.params;

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = validate;
