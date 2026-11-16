export function validateBody(schema) {
  return function validateRequestBody(req, res, next) {
    req.body = schema.parse(req.body)
    next()
  }
}

export function validateQuery(schema) {
  return function validateRequestQuery(req, res, next) {
    req.validatedQuery = schema.parse(req.query)
    next()
  }
}

export function validateParams(schema) {
  return function validateRequestParams(req, res, next) {
    req.validatedParams = schema.parse(req.params)
    next()
  }
}
