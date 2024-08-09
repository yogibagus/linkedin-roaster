const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const express = require('express');

const app = express();
app.use(express.json());

// LinkedIn li_at cookie - replace with your actual value
const liAtCookie = 'AQEDARRb7HIBehtWAAABkTW092cAAAGRWcF7Z1YAHovxsQLTKFrhdtNEiPMwyEsIzOWcP4_f7osijTBkZBbtQDMuH3rphSds3Zix7NJK02f16gktO4WJaTLoYlNHU3r65vjmn5z0dZR-y3KizSLmfsDQ'; 

// Google Generative AI setup
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY); // Access API key as environment variable

const safetySetting = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySetting });

async function getProfileLinkedIn(profileUrl) {
  try {
    const { data } = await axios.get(profileUrl, {
      headers: {
        'Cookie': `li_at=${liAtCookie}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    const lastCodeElement = $('code[id^="bpr-guid"]').last();

    if (!lastCodeElement.length) {
      throw new Error('No LinkedIn profile data found'); 
    }

    const jsonData = JSON.parse(lastCodeElement.text());
    return jsonData;
  } catch (error) {
    console.error('Error fetching/parsing LinkedIn data:', error);
    throw error; 
  }
}

async function generateRoast(profileInfo) {
  try {
    const prompt = `Roasting this LinkedIn profile in Indonesian slang (Jaksel gaul) within 100 words: ${JSON.stringify(
      profileInfo
    )}. Don't forget to mention the profile name.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error) {
    console.error('Error generating roast:', error);
    throw error; 
  }
}

app.post('/scrape', async (req, res) => {
  const { profileUrl } = req.body;

  if (!profileUrl) {
    return res.status(400).json({ error: 'Profile URL is required' });
  }

  try {
    const jsonData = await getProfileLinkedIn(profileUrl);
    let profileInfo = {};

    if (jsonData.included) {
      for (const item of jsonData.included) {
        if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Profile') {
          profileInfo = {
            publicIdentifier: item.publicIdentifier || null,
            headline: item.headline || item.multiLocaleHeadline?.[0]?.localizedHeadline || null,
            name: item.defaultLocalizedNameWithoutCountryName || null,
          };
          break; 
        }
      }
    }

    if (Object.keys(profileInfo).length === 0) {
      return res.status(404).json({ error: 'Profile information not found' });
    }

    const roast = await generateRoast(profileInfo);
    res.json({ roast });
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});