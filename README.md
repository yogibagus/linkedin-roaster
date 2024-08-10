
# LinkedIn Roaster

An API Service that can roast your linkedIn Profile using Gemini AI Service and build with Express.js


## Features

- Scrape LinkedIn Profile
- Generate text via Gemini AI
- Dinamic language roaster via prompt
- Dinamic platform via prompt


## Run Locally

Note: this app using li_at cookie session, you have to creaate linkedin account or login to linkedin first, then take the li_at cookie to be able to use it.

Clone the project

```bash
  git clone https://github.com/yogibagus/linkedin-roaster
```

Go to the project directory

```bash
  cd linkedin-roaster
```

Install dependencies

```bash
  npm install
```

Change .env variable value

```bash
  GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
  LI_AT_COOKIE=<YOUR_LI_AT>
```

Start the server

```bash
  node index.js
```


## API Reference

#### Roast Linked Profile

```http
  POST /api/roast/linkedin
```
Use json request body

| Parameter | Type     | Description                |
| :-------- | :------- | :------------------------- |
| `username` | `string` | **Required**. LinkedIn username|



## License

[MIT](https://choosealicense.com/licenses/mit/)

