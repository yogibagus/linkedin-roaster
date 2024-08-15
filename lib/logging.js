

// create log to mongodb
const { DbModel } = require('../db/database');

// Create log
async function createLog(job_id, username, scrape_data, prompt, lang, type, platform, result) {
    const log = new DbModel({ job_id, username, scrape_data, prompt, lang, type, platform, result });
    await log.save();
}

// get log by job_id and type
async function getLogByJobId(job_id, type) {
    const log = await  DbModel.findOne({ job_id , type });
    return log;
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
    getLogCount,
    getLogByJobId
};