const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 2, // limit each IP to 2 requests per windowMs
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many requests from this IP. Please try again after an hour',
    message: 'Limit is 2 requests per hour',
    code: 429,
  },
  keyGenerator: function (req) {
    return req.clientIp
  },
  handler: (request, response, next, options) => {
		if (request.rateLimit.used === request.rateLimit.limit + 1) {
			console.log("Reached Limit IP:", request.clientIp)
		}
		response.status(options.statusCode).send(options.message)
	},
});

module.exports = {
  limiter,
};