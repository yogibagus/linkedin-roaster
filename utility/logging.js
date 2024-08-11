

// create log to mongodb
const { DbModel } = require('../db/database');

// Create log
async function createLog(username, user_agent, scrape_data, prompt, lang, platform, result, ip) {
    const log = new DbModel({ username, user_agent, scrape_data, prompt, lang, platform, result, ip });
    await log.save();
}

// get log with filter and pagination
async function getLogs(filter, page, limit) {
    const logs = await DbModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(page * limit)
        .limit(limit);
    return logs;
}

// get log count with filter
async function getLogCount(filter) {
    const count = await DbModel.countDocuments(filter);
    return count;
}


module.exports = {
    createLog,
    getLogs,
    getLogCount
};