const express = require('express');
const { limiterQueue, limiterAdvice } = require('./middleware');
const { generateRoast } = require('./lib/gemini-ai');
const requestIp = require('request-ip');
const { getLogs, getLogCount, getLogByJobId } = require('./lib/logging');
const { roastQueue, adviceQueue } = require('./db/redis');
const { getLinkedInData } = require('./lib/newscraper');
var cors = require('cors')
require('dotenv').config()

// add port
const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(requestIp.mw())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Welcome to LinkedIn Roast API');
});

app.get('/api', (req, res) => {
  return res.json({ message: 'Welcome to LinkedIn Roast API' });
});


// Function to validate username
function validateUsername(username) {
  // Regular expression to match a general URL pattern
  const urlPattern = /^(https?:\/\/)?([a-z\d-]+)\.([a-z\d.-]+)([\/\w.-]*)*\/?$/i;

  // Regular expression to match only alphabets and dashes
  const validUsernamePattern = /^[a-z0-9-]+$/i;

  // Check if the username matches the URL pattern
  if (urlPattern.test(username)) {
    return {
      status: "error",
      error: 'Please provide a valid username that is not a URL'
    }
  }

  // Check if the username contains only alphabets and dashes
  if (!validUsernamePattern.test(username)) {
    return {
      status: "error",
      error: 'Username can only contain alphabets and dashes'
    }
  }

  // If all checks pass
  return true;
}


// Queue endpoint
app.post('/api/roast/queue', limiterQueue, async (req, res) => {
  const { username, lang } = req.body;

  if (!lang) {
    return res.status(400).json({ error: 'Language is required' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Profile URL is required' });
  }

  const checkUsername = validateUsername(username);
  if (checkUsername.error) {
    return res.status(400).json({ error: checkUsername.error });
  }

  // log request
  console.log('Incoming request:', { username, lang, ip: req.clientIp });

  try {
    // Add job to queue
    const job = await roastQueue.add({ username, lang });

    // Send response with job id
    res.status(202).json({
      message: 'Request added to queue',
      jobId: job.id
    });

  } catch (error) {
    console.error('Error adding job to queue:', error);
    res.status(500).json({ error: 'Failed to add job to queue' });
  }
});

// Queue advice endpoint
app.post('/api/advice/queue', limiterAdvice, async (req, res) => {
  const { jobId } = req.body;

  if (!jobId) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Add job to queue
    const job = await adviceQueue.add({ jobId });

    // Send response with job id
    res.status(202).json({
      message: 'Request advice added to queue',
      jobId: job.id
    });

  } catch (error) {
    console.error('Error adding job to queue:', error);
    res.status(500).json({ error: 'Failed to add job to queue' });
  }
});


// Worker function
const workerRoast = async () => {
  roastQueue.process(async (job) => {
    const { username, lang } = job.data;
    try {
      // Delay for 5 to 10 seconds to prevent ban from LinkedIn
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000));
      console.log('Start processing job:', job.id);

      const data = await getLinkedInData(username);
      if (!data) {
        throw new Error('Profile not found');
      }

      const result = await generateRoast(job.id, data, lang, 'linkedin', 'roasting');

      console.log('Job completed:', job.id, ' Queue job waiting:', await roastQueue.getWaitingCount())

      return result;

    } catch (error) {
      console.error('Error processing job:', error);
      throw new Error(error);
    }
  });
};

// Start workerRoast
workerRoast();

// Endpoint for checking job status
app.get('/api/roast/queue/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await roastQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job tidak ditemukan' });
    }

    // Ambil status job, jika sukses ambil data di database
    const jobStatus = await job.getState();
    if (jobStatus === 'completed') {
      const log = await getLogByJobId(jobId, 'roasting');
      // pick only specific fields
      response = {
        username: log.username,
        lang: log.lang,
        result: log.result,
        createdAt: log.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
      }
      return res.json({ status: jobStatus, response });
    } else if (jobStatus === 'waiting' || jobStatus === 'active') {
      // return pendig count
      const waitingCount = await roastQueue.getWaitingCount();
      return res.json({ status: jobStatus, waitingCount });
    } else if (jobStatus === 'failed') {
      return res.json({ status: jobStatus, error: job.failedReason });
    }
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Gagal mengambil status job' });
  }
});

// Worker function for advice
const workerAdvice = async () => {
  adviceQueue.process(async (job) => {
    const { jobId } = job.data;
    try {
      console.log('Start processing advice job:', job.id);

      // Delay for 5 to 10 seconds to prevent ban from LinkedIn
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000));

      const log = await getLogByJobId(jobId, 'roasting');
      if (!log) {
        throw new Error('Log not found');
      }

      const result = await generateRoast(job.id, log.scrape_data, log.lang, 'linkedin', 'advicing');

      console.log('Advice job completed:', job.id, ' Queue job waiting:', await adviceQueue.getWaitingCount())

      return result;

    } catch (error) {
      console.error('Error processing advice job:', error);
      throw new Error(error);
    }
  });
};

// Start workerAdvice
workerAdvice();

// Endpoint for get advice by job id
app.get('/api/advice/queue/:jobId', async (req, res) => {
  const { jobId } = req.params;
  try {
    const job = await adviceQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Ambil status job, jika sukses ambil data di database
    const jobStatus = await job.getState();
    if (jobStatus === 'completed') {
      const log = await getLogByJobId(jobId, 'advicing');
      // pick only specific fields
      response = {
        username: log.username,
        lang: log.lang,
        result: log.result,
        createdAt: log.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
      }
      return res.json({ status: jobStatus, response });
    } else if (jobStatus === 'waiting' || jobStatus === 'active') {
      // return pendig count
      const waitingCount = await adviceQueue.getWaitingCount();
      return res.json({ status: jobStatus, waitingCount });
    } else if (jobStatus === 'failed') {
      return res.json({ status: jobStatus, error: job.failedReason });
    }
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to get job status' });
  }
}
);

// Api get 5 latest roast
app.get('/api/roast/history', async (req, res) => {
  console.log("Getting logs...");
  // use params to get page and limit
  const currentPage = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 5;
  const type = req.query.type || 'roasting';

  // params validation
  if (currentPage < 0 || limit < 1) {
    return res.status(400).json({ error: 'Invalid page or limit' });
  }

  var params = {
    type: type
  }

  // get logs with pagination
  const logs = await getLogs({}, currentPage, limit);
  const totalItems = await getLogCount(params);
  const totalPage = Math.ceil(totalItems / limit);

  // only get specific fields
  const items = logs.map(log => {
    return {
      username: log.username,
      lang: log.lang,
      result: log.result,
      createdAt: log.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' })
    }
  });

  // Create data object
  const data = {
    items,
    totalItems,
    currentPage,
    totalPage
  }

  res.json({ data });
});

app.listen(port, () => {
  console.log(`Starting app listening on port ${port}`);
});
