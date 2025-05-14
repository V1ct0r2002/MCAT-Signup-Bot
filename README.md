# 🧠 MCAT Signup Automation Bot

This project is an automated bot that monitors the AAMC MCAT registration website and notifies users instantly via SMS or phone call when exam slots matching their preferences become available.

---

## 🚀 Features

- **High-Frequency Scanning**: Checks the AAMC site every few seconds using Puppeteer.
- **Real-Time Alerts**: Uses the Twilio API to notify users via SMS and voice.
- **Hourly Progress Updates**: Sends an SMS update every hour to inform the user how many search iterations have occurred and whether any slots have been found.
- **Deployable**: Built to run on an AWS EC2 instance for 24/7 uptime.
- **Modular Design**: Scripts split into logical files for querying, scraping, and triggering notifications.

---

## 🛠️ Tech Stack

- **JavaScript (Node.js)**
- **Puppeteer** (Web Scraping)
- **Twilio API** (SMS/Voice)
- **AWS EC2** (Deployment)

---

## 📁 File Overview

| File            | Description |
|------------------|-------------|
| `bot.js`         | Core Puppeteer bot that scrapes exam availability and triggers alerts. |
| `query.js`       | Defines user preferences like test location, date, and radius. |
| `secrets.js`     | Stores sensitive API keys and phone numbers (Twilio credentials). |
| `server.js`      | Optional: lightweight Express server for health checks or future expansion. |
| `intro.js`       | Introductory Twilio message logic (e.g., first-time greeting or voice intro). |
| `run_bot.js`     | Entry point for running the bot, combines query and bot logic. |

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/V1ct0r2002/MCAT-Signup-Bot.git
cd MCAT-Signup-Bot
```

### 2. Install Dependencies

```bash
npm install

```
### 3. Configure Secrets

You can either create a .env file OR edit secrets.js directly.

Option A: Edit secrets.js

```js

module.exports = {
  TWILIO_SID: 'your_account_sid',
  TWILIO_AUTH: 'your_auth_token',
  TWILIO_NUMBER: '+1xxxxxxxxxx',
  USER_NUMBER: '+1xxxxxxxxxx',
};
```

Option B: Use .env File

```env

TWILIO_SID=your_account_sid
TWILIO_AUTH=your_auth_token
TWILIO_NUMBER=+1xxxxxxxxxx
USER_NUMBER=+1xxxxxxxxxx
```

💡 Be sure to install dotenv and include require('dotenv').config(); at the top of your main script if you choose the .env method.

### 4. Run the Bot

```bash

node run_bot.js

```

You’ll start seeing log updates in your terminal. The bot will also send:

- An SMS/voice alert/call when a spot is found.
- An hourly update message reporting search progress and total attempts so far.





