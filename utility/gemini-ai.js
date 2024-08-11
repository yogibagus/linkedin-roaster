const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { createLog } = require('./logging');
const { parseUserAgent } = require('./utils');

// Google Generative AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); // Access API key as environment variable

// Safety settings for the generative model
const safetySetting = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Get the generative model
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySetting });

// array platform
var arrPlatform = [
    "instagram",
    "linkedin",
    "tiktok",
    "twitter",
    "facebook"
];

// array language
var arrLanguage = [
    "indonesian",
    "english",
    "javanese",
    "sundanese",
    "balinese"
];

// function to check if the platform is valid from the array
function isValidPlatform(platform) {
    return arrPlatform.some((p) => p === platform);
}

// function to check if the language is valid
function isValidLanguage(lang) {
    return arrLanguage.some((l) => l === lang);
}

// generate text using the generative model
async function generateText(prompt) {
    try {
        const result = await model.generateContent(prompt);
        console.log('Roast generated successfully');
        return result.response.text();
    } catch (error) {
        console.error('Error generating roast:', error);
        throw error;
    }
}

// Function to generate a roast based on the profile information
async function generateRoast(req, profileInfo, lang, platform) {
    console.log('Generating text roast ...');
    try {
        // Construct the prompt for the generative model
        // check lang in array arrLanguage
        if (!isValidLanguage(lang)) {
            return "Language is not valid";
        }

        // check platform in array arrPlatform
        if (!isValidPlatform(platform)) {
            return "Platform is not valid";
        }

        const prompt = `Roasting this ${platform} profile in ${lang} within 100 words with this data: ${JSON.stringify(
            profileInfo
        )} and use slang according to language`;

        console.log('Prompt:', prompt);
        console.log("Lang:", lang);

        result = await generateText(prompt);

        // Log the generated roast
        await createLog(profileInfo.publicIdentifier, parseUserAgent(req.headers['user-agent']), profileInfo, prompt, lang, platform, result, req.clientIp);
        
        console.log("Roasting result:", result)
        return result;
    } catch (error) {
        console.error('Error generating roast:', error);
        throw error;
    }
}


module.exports = {
    generateRoast
};
