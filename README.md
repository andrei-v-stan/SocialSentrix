<div align="center">

  <img src="/docs/SocialSentrix.png" alt="logo" width="250" height="auto" />
  <h1>SocialSentrix</h1>
<hr>
<p>
  <a href="https://github.com/andrei-v-stan/SocialSentrix/graphs/contributors">
    <img src="https://img.shields.io/github/contributors/andrei-v-stan/SocialSentrix" alt="contributors" />
  </a>
  <a href="https://github.com/andrei-v-stan/SocialSentrix">
    <img src="https://img.shields.io/github/last-commit/andrei-v-stan/SocialSentrix" alt="last update" />
  </a>
  <a href="https://github.com/andrei-v-stan/SocialSentrix/issues/">
    <img src="https://img.shields.io/github/issues/andrei-v-stan/SocialSentrix" alt="open issues" />
  </a>
</p>

<p>
  <a href="https://github.com/andrei-v-stan/SocialSentrix/network/members">
    <img src="https://img.shields.io/github/forks/andrei-v-stan/SocialSentrix" alt="forks" />
  </a>
  <a href="https://github.com/andrei-v-stan/SocialSentrix/stargazers">
    <img src="https://img.shields.io/github/stars/andrei-v-stan/SocialSentrix" alt="stars" />
  </a>
  <a href="https://github.com/andrei-v-stan/SocialSentrix/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/andrei-v-stan/SocialSentrix?color=2A9D8F" alt="license" />
  </a>
</p>
<br>
<p>
  <a href="https://www.uaic.ro/">
    <img src="https://img.shields.io/badge/project-academic-green" alt="uaic" />
  </a>
  <a href="https://www.info.uaic.ro/">
    <img src="https://img.shields.io/badge/infoiasi-FII-blue" alt="fii" />
  </a>
  <a href="https://profs.info.uaic.ro/sabin.buraga/">
    <img src="https://img.shields.io/badge/prof-advisor-red" alt="BuragaSabin" />
  </a>
  <a href="https://andrei-v-stan.github.io/">
    <img src="https://img.shields.io/badge/student-dev-yellow" alt="StanAndrei" />
  </a>
</p>
<br>
<h4>
   <a href="https://www.canva.com/design/DAGsFpqjoSw/-Ucwy6orAVHRp-gC4pML6A/edit">Canva Presentation</a>
<span> · </span>
<a href="https://raw.githack.com/andrei-v-stan/SocialSentrix/main/docs/SocialSentrix.mp4">Video Presentation</a>
<span> · </span>
   <a href="https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/SocialSentrix.pdf">Thesis</a>
</h4>

</div>

<hr>

## 📔 Table of Contents <br>

- ### [🪄 About the Project](#-about-the-project-1)
  - #### [📷 Screenshots](#-screenshots-1)
  - #### [📐 Architecture](#-architecture-1)
  - #### [👾 Tech Stack](#-tech-stack-1)
  - #### [🎯 Features](#-features-1)
  - #### [🔑 Environment Variables](#-environment-variables-1)

<br>

- ### [🧰 Getting Started](#-getting-started-1)
  - #### [🗳️ Prerequisites](#️-prerequisites-1)
  - #### [🔧 Run Locally](#-run-locally-1)
  - #### [⚙️ Deployment Mode](#️-deployment-mode-1)

<br>

- #### [💿 Usage](#-usage-1)
- #### [🎥 Tutorial](#-tutorial-1)
- #### [🗂️ Contributing](#️-contributing-1)
- #### [🗓️ Roadmap](#️-roadmap-1)
- #### [🖋️ License](#️-license-1)
- #### [📧 Contact](#-contact-1)
- #### [🔖 Acknowledgements](#-acknowledgements-1)


<br>

## 🪄 About the Project

**SocialSentrix** is a full-stack web application that analyzes and visualizes social media reputation across multiple platforms and user profiles. It calculates custom SETIC scores (Sentiment, Engagement, Trustworthiness, Influence, Consistency) and supports real-time visualizations of user activity, reputation trends, and cross-platform comparisons. Built as part of a Master's thesis at FII-UAIC.

<br>

### 📷 Screenshots

<figure align="center">
  <img src="/docs/screenshots/General App (Multi-Profile Example).png" alt="App Search & Display Exampple">
  <figcaption>Multi-profile & multi-platform parallel search and graph generation (number of upvotes / likes per month). </figcaption>
</figure><br><br><br>

<figure align="center">
  <img src="/docs/screenshots/Data Display (Multi-Profile Example).png" alt="Multi-profile graph">
  <figcaption>Cross-platform & multi-profile acitvity comparison and post display (number of posts per day).</figcaption>
</figure><br><br><br>

<figure align="center">
  <img src="/docs/screenshots/SETIC Percentages (Reddit Example).png" alt="SETIC breakdown">
  <figcaption>General SETIC reputation analysis for the reddit user "u/Reddit".</figcaption>
</figure><br><br><br>

<figure align="center">
  <img src="/docs/screenshots/Sentiment & Engagement (Reddit Example).png" alt="SETIC breakdown">
  <figcaption>SETIC reputation analysis data display for the reddit user "u/Reddit".</figcaption>
</figure>

<br>

### 📐 Architecture

<table>
  <tr><td width="50%">

  ##### ***<center> General System Overview </center>***
  <a href="/docs/diagrams/">
    <img src="/docs/Diagram - Application Flow.gif" alt="Main System Architecture" />
  </a>

  </td></tr>
  <tr><td width="50%">

  ##### ***<center> Component Flows </center>***
  <a href="/docs/diagrams/other/">
    <img src="/docs/Diagram - Other Flows.gif" alt="MongoDB Database Schema" />
  </a>

  </td></tr>
</table>

<br>

### 👾 Tech Stack

##### **Frontend / Client**
[![HTML][HTML-ui]][HTML-url] [![CSS][CSS-ui]][CSS-url] [![JavaScript][JavaScript-ui]][JavaScript-url] [![Tailwind CSS][TailwindCSS-ui]][TailwindCSS-url] [![EsLint][EsLint-ui]][EsLint-url] [![ShadCN][ShadCN-ui]][ShadCN-url] 
[![React][React-ui]][React-url] [![React Router][ReactRouter-ui]][ReactRouter-url] [![Vite][Vite-ui]][Vite-url]  [![Recharts][Recharts-ui]][Recharts-url]

##### **Backend / Server** 
[![Node][Node-ui]][Node-url] [![Express][Express-ui]][Express-url] [![Nodemon][Nodemon-ui]][Nodemon-url] [![MongoDB][MongoDB-ui]][MongoDB-url] 
[![Nodemailer][Nodemailer-ui]][Nodemailer-url] [![CORS][CORS-ui]][CORS-url] [![Puppeteer][Puppeteer-ui]][Puppeteer-url] [![Vader Sentiment][VaderSentiment-ui]][VaderSentiment-url] [![GeoIP][GeoIP-ui]][GeoIP-url] [![DotEnv][DotEnv-ui]][DotEnv-url] 

##### **DevOps**
[![Github][Github-ui]][Github-url] [![Google Cloud Platform][GoogleCloudPlatform-ui]][GoogleCloudPlatform-url] [![Postman][Postman-ui]][Postman-url] [![Visual Studio Code][VisualStudioCode-ui]][VisualStudioCode-url] [![Git][Git-ui]][Git-url]

<br>

### 🎯 Features

- Analyze social media profiles (Reddit, Bluesky, more upcoming...)
- Calculate SETIC reputation scores
- Cross-platform & multi-profile comparison
- Dynamic visualizations with zoom/drag
- Date range filtering and granularity controls
- Secure login system with session validation
- MongoDB persistence and data normalization

<br>

### 🔑 Environment Variables

Client `.env` example:
```env
VITE_HOST_ADDR=localhost
VITE_PORT_API=4000
VITE_PORT_APP=5173
VITE_API_PATH=api
```

Server `.env` example:
```env
VITE_API_URL='http://localhost:8080'
VITE_FRONTEND_URL='http://localhost:5173'

REDDIT_CLIENT_ID='aliquamiaculislacusvel'
REDDIT_CLIENT_SECRET=' tempusconvallisduiconsectetur'
REDDIT_REDIRECT_URI='http://localhost:8080/api/reddit/auth/callback'

MONGO_URI='mongodb+srv://socialsentrix:socialsentrixcluster@rutrummauris.nlhqeqa.mongodb.net/'
MONGO_DB='Users'
MONGO_COLLECTION_ACCOUNTS='accounts'
MONGO_COLLECTION_PROFILES='profiles'
MONGO_COLLECTION_PENDING_CONFIRMATIONS='pending'
MONGO_COLLECTION_PENDING_REQUESTS='requests'

EMAIL_HOST='socialsentrix@gmail.com'
EMAIL_PASS='lore ipsu dolo sito'

```

<br><br>

## 🧰 Getting Started

<br>

### 🗳️ Prerequisites
Ensure Node.js is installed:
```bash
node -v
npm -v
```
⚠️ And remember to change server .env MONGO_URI in case cluster is inactive.

### 🔧 Run Locally

```bash
git clone https://github.com/andrei-v-stan/SocialSentrix.git
cd SocialSentrix
npm install --force --prefix client && npm install --force --prefix server
npm run dev --prefix server #seperate terminals
npm run dev --prefix client #seperate terminals
```

### ⚙️ Deployment Mode
```bash
git clone -b deployment https://github.com/andrei-v-stan/SocialSentrix.git
cd SocialSentrix
npm install --force --prefix client && npm install --force --prefix server
npm run build --prefix client
npm run start --prefix server
```

<br>

## 💿 Usage

For a detailed description, see Chapter 5 of the [SocialSentrix thesis](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/SocialSentrix.pdf#page=72)


## 🎥 Tutorial
- [Platform Registration & Login](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/videos/Platform%20Registration%20&%20Login.mp4)
- [Session Management & Request](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/videos/Session%20Management%20&%20Request.mp4)
- [Profile Authentification](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/videos/Profile%20Auth.mp4)
- [Social Media Profile Submission](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/videos/Profile%20Submission.mp4)
- [Graph Categories & SETIC](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/videos/Graph%20Categories%20&%20SETIC.mp4)
- [All Graph Features](https://cdn.jsdelivr.net/gh/andrei-v-stan/SocialSentrix@main/docs/videos/Graph%20Features.mp4)


## 🗂️ Contributing
<a href="https://github.com/andrei-v-stan/SocialSentrix/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=andrei-v-stan/SocialSentrix" />
</a>

## 🗓️ Roadmap

- [x] Reddit crawler
- [x] SETIC scoring system
- [x] Data visualizations
- [x] Multi-profile comparison
- [x] Login system
- [x] MongoDB integration
- [ ] Add Twitter support
- [ ] Export charts & reports
- [ ] Public profile links


## 📬 FAQ
**_TBD_**


## 🖋️ License
**&nbsp; Distributed under the MIT License. [See LICENSE](https://github.com/andrei-v-stan/SocialSentrix/blob/main/LICENSE)**

## 📧 Contact
&nbsp; **Email:** **socialsentrix@gmail.com**
&nbsp; **Stan Andrei:** **[GitHub](https://github.com/andrei-v-stan) | [LinkedIn](https://www.linkedin.com/in/andrei-v-stan/) | [Email](mailto:andreivstan27@gmail.com)**

## 🔖 Acknowledgements
**&nbsp; [Awesome README](https://github.com/matiassingers/awesome-readme) | [Shields.io](https://shields.io/) | [Emoji Cheat Sheet](https://github.com/ikatyang/emoji-cheat-sheet/blob/master/README.md#travel--places) | [Markdown Hacks](https://www.markdownguide.org/hacks/)**


<!-- MARKDOWN -->
[HTML-ui]: https://img.shields.io/badge/HTML-%23E34F26.svg?logo=html5&logoColor=white
[HTML-url]: https://www.w3schools.com/html/
[CSS-ui]: https://img.shields.io/badge/CSS-1572B6?logo=css3&logoColor=fff
[CSS-url]: https://www.w3schools.com/css/
[JavaScript-ui]: https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=000
[JavaScript-url]: https://www.w3schools.com/js/
[React-ui]: https://img.shields.io/badge/React-%2320232a.svg?logo=react&logoColor=%2361DAFB
[React-url]: https://reactjs.org/
[ReactRouter-ui]: https://img.shields.io/badge/React_Router-CA4245?logo=react-router&logoColor=white
[ReactRouter-url]: https://reactrouter.com/
[Vite-ui]: https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=fff
[Vite-url]: https://vite.dev/
[ESLint-ui]: https://img.shields.io/badge/ESLint-3A33D1?logo=eslint
[ESLint-url]: https://eslint.org/
[TailwindCSS-ui]: https://img.shields.io/badge/Tailwind%20CSS-%2338B2AC.svg?logo=tailwind-css&logoColor=white
[TailwindCSS-url]: https://tailwindcss.com/
[ShadCN-ui]: https://img.shields.io/badge/shadcn%2Fui-000?logo=shadcnui&logoColor=fff
[ShadCN-url]: https://ui.shadcn.com/

[Recharts-ui]: https://img.shields.io/badge/Recharts-51b0f0?&logo=GrapheneOS&logoColor=white
[Recharts-url]: https://recharts.github.io/


[Node-ui]: https://img.shields.io/badge/Node.js-6DA55F?logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[Express-ui]: https://img.shields.io/badge/Express.js-%23404d59.svg?logo=express&logoColor=%2361DAFB
[Express-url]: https://expressjs.com/
[Nodemon-ui]: https://img.shields.io/badge/Nodemon-76D04B?logo=nodemon&logoColor=fff
[Nodemon-url]: https://nodemon.io/
[MongoDB-ui]: https://img.shields.io/badge/MongoDB-%234ea94b.svg?logo=mongodb&logoColor=white
[MongoDB-url]: https://www.mongodb.com/

[Nodemailer-ui]: https://img.shields.io/badge/%F0%9F%93%A7%20Nodemailer-0e9ccd?style=plastic
[Nodemailer-url]: https://nodemailer.com/
[CORS-ui]: https://img.shields.io/badge/%F0%9F%94%90CORS-6c767e?style=plastic
[CORS-url]: https://github.com/expressjs/cors
[Puppeteer-ui]: https://img.shields.io/badge/%F0%9F%A4%96%20Puppeteer-02d9a3?style=plastic
[Puppeteer-url]: https://pptr.dev/
[VaderSentiment-ui]: https://img.shields.io/badge/%F0%9F%8E%AD%20Vader%20Sentiment-a1488c?style=plastic
[VaderSentiment-url]: https://github.com/cjhutto/vaderSentiment
[GeoIP-ui]: https://img.shields.io/badge/%F0%9F%8C%90%20GeoIP-486aa1?style=plastic
[GeoIP-url]: https://github.com/geoip-lite/node-geoip
[DotEnv-ui]: https://img.shields.io/badge/%F0%9F%94%91%20Dotenv-9da8a6?style=plastic
[DotEnv-url]: https://www.npmjs.com/package/dotenv

[GitHub-ui]: https://img.shields.io/badge/GitHub-%23121011.svg?logo=github&logoColor=white
[GitHub-url]: https://github.com/
[Git-ui]: https://img.shields.io/badge/Git-F05032?logo=git&logoColor=fff
[Git-url]: https://git-scm.com/
[GoogleCloudPlatform-ui]: https://img.shields.io/badge/Google%20Cloud-%234285F4.svg?logo=google-cloud&logoColor=white
[GoogleCloudPlatform-url]: https://cloud.google.com/
[Postman-ui]: https://img.shields.io/badge/Postman-FF6C37?logo=postman&logoColor=white
[Postman-url]: https://www.postman.com/
[VisualStudioCode-ui]: https://custom-icon-badges.demolab.com/badge/Visual%20Studio%20Code-0078d7.svg?logo=vsc&logoColor=white
[VisualStudioCode-url]: https://code.visualstudio.com/