const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
require('dotenv').config()

// LinkedIn li_at cookie - replace with your actual value (required for scraping)
const liAtCookie = process.env.LI_AT_COOKIE;

// utility.js
// Function to fetch LinkedIn profile data
async function getProfileLinkedIn(profileUrl) {
    console.log('Fetching LinkedIn profile data...');
    try {
        // Fetch the LinkedIn profile page
        const { data } = await axios.get(profileUrl, {
            headers: {
                'Cookie': `li_at=${liAtCookie}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        // Find the last code element with an ID starting with "bpr-guid"
        const lastCodeElement = $('code[id^="bpr-guid"]').last();

        // Check if the code element is found
        if (!lastCodeElement.length) {
            throw new Error('No LinkedIn profile data found');
        }

        console.log('Successfully fetched LinkedIn profile data');

        // Parse the JSON data from the code element
        const jsonData = JSON.parse(lastCodeElement.text());

        // Write the parsed data to a JSON file
        fs.writeFile('parsedData.json', JSON.stringify(jsonData, null, 2), (err) => {
            if (err) {
                console.error('Error writing to file:', err);
                return res.status(500).json({ error: 'Error writing to file' });
            }
        });

        // Extract the relevant profile information
        const extractedData = extractorData(jsonData);
        return extractedData;
    } catch (error) {
        console.error('Error fetching/parsing LinkedIn data:', error);
        throw error;
    }
}

// Function to extract relevant profile information
// you can check the raw data structure in the parsedData.json file
function extractorData(jsonData) {
    let profileInfo = {};
    if (jsonData.included) {
        for (const item of jsonData.included) {
            if (item.defaultLocalizedNameWithoutCountryName != undefined) {
                var name = item.defaultLocalizedNameWithoutCountryName
            }
            // Check for the entity type "com.linkedin.voyager.dash.identity.profile.Profile"
            if (item.$type === 'com.linkedin.voyager.dash.identity.profile.Profile') {
                profileInfo.publicIdentifier = item.publicIdentifier || null;
                profileInfo.multiLocaleHeadline = item.multiLocaleHeadline || [];
                profileInfo.headline = item.headline || null;
                profileInfo.defaultLocalizedNameWithoutCountryName = name || null;
            }
        }
    }

    // Check if profile information is empty
    if (Object.keys(profileInfo).length === 0) {
        return null;
    }

    return profileInfo;
}

module.exports = {
    getProfileLinkedIn,
    extractorData
};