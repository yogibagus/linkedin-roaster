const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 4, // limit each IP to 4 requests per windowMs
  skipSuccessfulRequests: false,
  message: {
    error: 'Too many requests from this IP. Please try again later.',
    message: 'Limit is 4 requests per 10 minutes',
    code: 429,
  },
  keyGenerator: function (req) {
    return req.ip; 
  },
  handler: (request, response, next, options) => {
		if (request.rateLimit.used === request.rateLimit.limit + 1) {
			console.log("Reached Limit IP:", request.ip)
		}
		response.status(options.statusCode).send(options.message)
	},
});

module.exports = {
  limiter,
};