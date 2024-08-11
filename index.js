const express = require('express');
const { limiter } = require('./middleware');
const { getProfileLinkedIn } = require('./utility/scraper');
const { generateRoast } = require('./utility/gemini-ai');
const requestIp = require('request-ip');
var cors = require('cors')
require('dotenv').config()

// add port
const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(requestIp.mw())
app.use(cors())

app.get('/', (req, res) => {
  res.send('Welcome to Roast API!');
});

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
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.listen(port, () => {
  console.log(`Starting app listening on port ${port}`);
});
