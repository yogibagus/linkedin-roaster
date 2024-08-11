const UAParser = require('ua-parser-js');

// function to parse the user agent
function parseUserAgent(userAgent) {
    const parser = new UAParser();
    return parser.setUA(userAgent).getResult();
}

// date format dd-mm-yyyy hh:mm:ss
function formatDate(date) {
    return `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}

module.exports = {
    parseUserAgent
};