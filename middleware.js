const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: false,
  message: {
    error: 'Your request limit is exceeded! Please wait for an hour.',
    message: 'Limit is 5 requests per hour',
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