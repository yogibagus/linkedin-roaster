const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const { createLog } = require('./logging');

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
async function generateRoast(jobId, profileInfo, lang, platform, type) {
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

        var languageStyle = "slang";
        if (type === "advicing") {
            languageStyle = "formal";
        }
            

        const prompt = `${type} this ${platform} profile especially in the job experience section in ${lang} with this data: ${JSON.stringify(
            profileInfo
        )}, use ${languageStyle} according to language, talk about the company, job, and experience and maximal 100 words.`;

        // console.log('Prompt:', prompt);
        console.log("Lang:", lang);
        console.log("Type:", type);

        result = await generateText(prompt);

        // Log the generated roast
        await createLog(jobId, profileInfo.publicIdentifier, profileInfo, prompt, lang, type, platform, result);
        
        // console.log("Roasting result:", result)
        console.log(`${type} process completed`);
        return result;
    } catch (error) {
        // console.error('Error generating roast:', error);
        throw error.message;
    }
}


module.exports = {
    generateRoast
};
