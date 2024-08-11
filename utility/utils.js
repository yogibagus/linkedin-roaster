const UAParser = require('ua-parser-js');

// function to parse the user agent
function parseUserAgent(userAgent) {
    const parser = new UAParser();
    return parser.setUA(userAgent).getResult();
}

module.exports = {
    parseUserAgent
};