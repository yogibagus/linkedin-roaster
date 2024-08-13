const axios = require('axios');
const cheerio = require('cheerio');
// const fs = require('fs');
const { DbCookieListModel } = require('../db/database');
require('dotenv').config()

// LinkedIn li_at cookie - replace with your actual value (required for scraping)
const liAtCookie = process.env.LI_AT_COOKIE;

var headers = {
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Priority": "u=1, i",
    "Sec-Ch-Ua": '"Not)A;Brand";v="99", "Brave";v="127", "Chromium";v="127"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": "macOS",
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Gpc": "1",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
    "X-Li-Lang": "en_US",
    "X-Li-Page-Instance": "urn:li:page:d_flagship3_profile_view_base;vjTMYdRWTe+rXl9E7H2hQw==",
    "X-Li-Track": '{"clientVersion":"1.13.21486","mpVersion":"1.13.21486","osName":"web","timezoneOffset":7,"timezone":"Asia/Jakarta","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":2,"displayWidth":2894,"displayHeight":924}',
    "X-Restli-Protocol-Version": "2.0.0",
    // 'Cookie': `li_at=${liAtCookie}`,
    "Referrer-Policy": "strict-origin-when-cross-origin"
  }

// username splitter
function extractUsername(profileUrl) {
    return profileUrl.split("/").pop();
}

// global variable, selected cookie
let selectedCookie = [];

// Function to get cookie but not same with the previous cookie
async function getCookie() {
    // get all cookie
    const allCookie = await DbCookieListModel.find();
    // check if selectedCookie is empty
    if (selectedCookie.length === 0) {
        // select random cookie
        selectedCookie = allCookie[Math.floor(Math.random() * allCookie.length)];
    } else {
        // select random cookie
        let tempCookie = allCookie[Math.floor(Math.random() * allCookie.length)];
        // check if the selected cookie is the same with the previous cookie
        if (selectedCookie.cookie === tempCookie.cookie) {
            // select random cookie again
            selectedCookie = allCookie[Math.floor(Math.random() * allCookie.length)];
        } else {
            // select the new cookie
            selectedCookie = tempCookie;
        }
    }
    // return the selected cookie
    return selectedCookie;
}


// Function to fetch LinkedIn profile data
async function getProfileLinkedIn(profileUrl) {
    console.log('Fetching LinkedIn profile data...');
    // get the cookie
    await getCookie();

    // using cookie
    console.log('Using cookie id:', selectedCookie._id);
    try {
        // Fetch the LinkedIn profile page
        const { data } = await axios.get(profileUrl, {
            headers: {
                ...headers,
                'Cookie': `li_at=${selectedCookie.cookie}` 
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
        // fs.writeFile('parsedData.json', JSON.stringify(jsonData, null, 2), (err) => {
        //     if (err) {
        //         console.error('Error writing to file:', err);
        //         return res.status(500).json({ error: 'Error writing to file' });
        //     }
        // });

        // Extract the relevant profile information
        const extractedData = extractorData(jsonData, extractUsername(profileUrl));
        return extractedData;
    } catch (error) {
        // console.error('Error fetching/parsing LinkedIn data:', error);
        throw error.message;
    }
}

// Function to extract relevant profile information
// you can check the raw data structure in the parsedData.json file
function extractorData(jsonData, username) {
    let profileInfo = {};
    if (jsonData.included) {
        for (const item of jsonData.included) {
            if (item.defaultLocalizedNameWithoutCountryName != undefined) {
                var name = item.defaultLocalizedNameWithoutCountryName
            }
            if (item.publicIdentifier == username) {
                profileInfo.publicIdentifier = item.publicIdentifier || null;
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