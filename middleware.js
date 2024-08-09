const rateLimit = require('express-rate-limit');
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    skipSuccessfulRequests: false,
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