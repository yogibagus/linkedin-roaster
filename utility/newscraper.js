const axios = require('axios');
const fs = require('fs');
require('dotenv').config()
const { DbCookieListModel } = require('../db/database');

//LinkedIn Scraper Library

// global variable, selected cookie
var selectedCookie = [];

// Select in order the cookie from the database
async function getCookie() {
    if (selectedCookie.length == 0) {
        selectedCookie = await DbCookieListModel.findOne().sort({ order: 1 });
    } else {
        selectedCookie = await DbCookieListModel.findOne({ order: selectedCookie.order + 1 });
        if (!selectedCookie) {
            selectedCookie = await DbCookieListModel.findOne().sort({ order: 1 });
        }
    }
    console.log("Selected order id:", selectedCookie.order);
    return selectedCookie;
}

// Set headers
const headers = {
    'authority': 'www.linkedin.com',
    'accept': 'application/vnd.linkedin.normalized+json+2.1',
    'accept-language': 'en-GB,en;q=0.9,en-US;q=0.8,id;q=0.7',
    'cookie': selectedCookie.cookie,
    'csrf-token': selectedCookie.crsf,
    'referer': 'https://www.linkedin.com/',
    'sec-ch-ua': '"Not A(Brand";v="99", "Microsoft Edge";v="121", "Chromium";v="121"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
    'x-li-lang': 'in_ID',
    'x-li-page-instance': 'urn:li:page:d_flagship3_profile_view_base_skills_details;TttQY4DTS7uz+mSndtcOhQ==',
    'x-li-pem-metadata': 'Voyager - Profile=view-skills-details',
    'x-li-track': '{"clientVersion":"1.13.21104","mpVersion":"1.13.21104","osName":"web","timezoneOffset":8,"timezone":"Asia/Singapore","deviceFormFactor":"DESKTOP","mpName":"voyager-web","displayDensity":1,"displayWidth":1920,"displayHeight":1080}',
    'x-restli-protocol-version': '2.0.0'
};

// function to extract fsd_profile id
function getFsdProfileId(data) {
    try {
        const elements = data.data.data.identityDashProfilesByMemberIdentity;

        // Check if elements exists and has at least one element
        if (elements && elements['*elements'] && elements['*elements'].length > 0) {
            const fsdProfile = elements['*elements'][0];
            const fsdProfileId = fsdProfile.split(':')[3];
            return fsdProfileId;
        } else {
            // Handle the case where elements is empty or undefined
            console.warn("No FSD profile found. 'elements' is empty or undefined.");
            return null; // Or return an appropriate default value
        }

    } catch (error) {
        // Handle any errors that occur during the process
        console.error("Error getting FSD Profile ID:", error);
        return null; // Or throw the error for higher-level handling
    }
}

// Function to hit request to LinkedIn API
async function getLinkedInData(username) {
    try {
        // get cookie and wait until updated then set headers
        await getCookie().then(() => {
            headers.cookie = selectedCookie.cookie;
            headers['csrf-token'] = selectedCookie.crsf;
        });

        const apiUrl = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(vanityName:${username})&queryId=voyagerIdentityDashProfiles.4d9e161cdf3cf64b1c9a7a7c1fc94cff`

        let config = {
            method: 'get',
            url: apiUrl,
            headers: headers,
            maxBodyLength: Infinity,
        };

        const { data } = await axios(config);

        // create json file name 
        // const fileName = 'linkedin-profile.json';
        // fs.writeFileSync(fileName, JSON.stringify(data, null, 2));

        // extract profile data
        let profileData = {};
        if (data.included) {
            for (const item of data.included) {
                if (item.defaultLocalizedNameWithoutCountryName != undefined) {
                    var name = item.defaultLocalizedNameWithoutCountryName
                }
                if (item.publicIdentifier == username) {
                    profileData.publicIdentifier = item.publicIdentifier || null;
                    profileData.headline = item.headline || null;
                    profileData.defaultLocalizedNameWithoutCountryName = name || null;
                }
            }
        }

        profileData.fsdProfileId = getFsdProfileId(data);
        // check if fsdProfileId is null
        if (!profileData.fsdProfileId) {
            return null;
        }

        var expData = await getExperienceData(profileData.fsdProfileId);
        profileData.experience = expData;

        return profileData;

    } catch (error) {
        console.error('Error hitting LinkedIn API:', error.message);
        throw "Max redirect limit reached";
    }
}

function extractComponentData(obj) {
    const data = [];

    function traverse(obj) {
        if (typeof obj !== 'object' || obj === null) {
            return;
        }

        for (const key in obj) {
            // Extract entityComponent data
            if (key === 'entityComponent' && obj[key]) {
                data.push({
                    title: obj[key]?.titleV2?.text?.text || null, // Provide default value if not exist
                    subtitle: obj[key]?.subtitle?.text || null
                });
            }
            // Extract textComponent data
            else if (key === 'textComponent' && obj[key]) {
                data.push({
                    text: obj[key]?.text?.text || null // Provide default value if not exist
                });
            } else {
                traverse(obj[key]);
            }
        }
    }

    traverse(obj);
    return data;
}

// fumction to get experience data
async function getExperienceData(fsdProfileId) {
    try {
        const apiUrl = `https://www.linkedin.com/voyager/api/graphql?includeWebMetadata=true&variables=(profileUrn:urn%3Ali%3Afsd_profile%3A${fsdProfileId},sectionType:experience)&queryId=voyagerIdentityDashProfileCards.5302d6e837609ca5d40cb87e83491184`;

        let config = {
            method: 'get',
            url: apiUrl,
            headers: headers,
            maxBodyLength: Infinity,
        };

        const { data } = await axios(config);
        const experienceData = extractComponentData(data);
        return experienceData;

    } catch (error) {
        console.error('Error hitting LinkedIn API:', error.message);
        throw "Max redirect limit reached";
    }
}

module.exports = { getLinkedInData };