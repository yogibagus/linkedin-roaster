const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many requests from this IP. Please try again later.',
      message : 'Limit is 5 requests per 15 minutes',
      code: 429 
    },
    keyGenerator: function (req) {
      return req.ip;
    }
  });
  
  module.exports = {
    limiter
  };