const express = require('express');
const { limiter } = require('./middleware');
const { getProfileLinkedIn } = require('./utility/scraper');
const { generateRoast } = require('./utility/gemini-ai');
const requestIp = require('request-ip');
const { getLogs, getLogCount, getLogByJobId } = require('./utility/logging');
const { roastQueue } = require('./db/redis');
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
app.post('/api/roast/queue', limiter, async (req, res) => {
  const { username, lang } = req.body;

  if (!lang) {
    return res.status(400).json({ error: 'Language is required' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Profile URL is required' });
  }

  const checkUsername = validateUsername(username);
  if (checkUsername.error){
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


// Worker function
const worker = async () => {
  roastQueue.process(async (job) => {
    const { username, lang } = job.data;
    const profileUrl = "https://www.linkedin.com/in/" + username;

    try {
      console.log('Start processing job:', job.id);
      // Delay for 5 to 10 seconds to prevent ban from LinkedIn
      await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 5000));
      const data = await getProfileLinkedIn(profileUrl);
      if (!data) {
        throw new Error('Profile not found');
      }

      const result = await generateRoast(job.id, data, lang, 'linkedin');

      console.log('Job completed:', job.id, 'Queue job waiting:', await roastQueue.getWaitingCount())

      return result;

    } catch (error) {
      console.error('Error processing job:', error);
      throw new Error(error);
    }
  });
};

// Start worker
worker();

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
      const log = await getLogByJobId(jobId);
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
    }else if (jobStatus === 'failed') {
      return res.json({ status: jobStatus, error: job.failedReason });
    }
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Gagal mengambil status job' });
  }
});


// =========== OLD CODE ===========

// LinkedIn profile scraping endpoint
app.post('/api/roast/linkedin', limiter, async (req, res) => {
  console.log("Starting scraping...");
  const { username } = req.body;
  const { lang } = req.body;

  if (!lang) {
    return res.status(400).json({ error: 'Language is required' });
  }

  if (!username) {
    return res.status(400).json({ error: 'Profile URL is required' });
  }

  const profileUrl = "https://www.linkedin.com/in/" + username;

  try {
    const data = await getProfileLinkedIn(profileUrl);
    if (!data) {
      return res.status(404).json({ error: 'We’re currently experiencing high traffic on our servers. This might be causing the profile not to be found or accessed. Please try again later. Thank you for your patience!' });
    }

    const response = await generateRoast(req, data, lang, 'linkedin');

    res.json({ response });
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'We’re currently experiencing high traffic on our servers' });
  }
});

// Api get 5 latest roast
app.get('/api/roast/history', async (req, res) => {
  console.log("Getting logs...");
  // use params to get page and limit
  const currentPage = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 5;

  // get logs with pagination
  const logs = await getLogs({}, currentPage, limit);
  const totalItems = await getLogCount({});
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
