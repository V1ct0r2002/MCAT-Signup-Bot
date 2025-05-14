require('dotenv').config();
const express = require('express');
const queries = require('../classes/query.js');
const Bot = require('../classes/bot.js');
const secrets = require('../classes/secrets.js');

const app = express();
const port = 3000;

const bot = new Bot(queries);

// Initialize and start the bot
async function initializeBot() {
  const accountSid = secrets.TWILIO_ACCOUNT_SID;
  const authToken = secrets.TWILIO_AUTH_TOKEN;
  const client = require("twilio")(accountSid, authToken);

  const both_intro = "Alberto is fully functional. Updating as I go.";
  const call_intro = "Alberto is fully functional. Updating as I go.";
  const text_intro = "Alberto is fully functional. Updating as I go.";
  let introducedCustomers = secrets.introducedCustomers;

  console.log("Introduced customers at start", introducedCustomers);

  for (const query of secrets.queries) {
    let phone_intros = {
      call: [],
      text: [],
      both: [],
    };

    for (const callPhone of query.call_phones) {
      if (!introducedCustomers.includes(callPhone)) {
        phone_intros.call.push(callPhone);
      }
    }

    for (const textPhone of query.text_phones) {
      if (!introducedCustomers.includes(textPhone)) {
        if (phone_intros.call.includes(textPhone)) {
          phone_intros.both.push(textPhone);
          phone_intros.call = phone_intros.call.filter((p) => p !== textPhone);
        } else {
          phone_intros.text.push(textPhone);
        }
      }
    }

    console.log("Phone intros:");
    console.log("Call:", phone_intros.call);
    console.log("Text:", phone_intros.text);
    console.log("Both:", phone_intros.both);

    for (const number of phone_intros.call) {
      introducedCustomers.push(number);
      sendText(call_intro, number);
    }
    for (const number of phone_intros.text) {
      introducedCustomers.push(number);
      sendText(text_intro, number);
    }
    for (const number of phone_intros.both) {
      introducedCustomers.push(number);
      sendText(both_intro, number);
    }
  }

  console.log("Introduced customers at end", introducedCustomers);
  console.log("*** REMEMBER TO UPDATE INTRODUCED CUSTOMERS IN SECRETS.JS ***");

  function sendText(msg, number) {
    client.messages.create({
      body: msg,
      from: secrets.twilio_number,
      to: number,
    }).then(message => console.log(`Message sent to ${number}: ${message.sid}`))
      .catch(error => console.error(`Failed to send message to ${number}:`, error));
  }

  await bot.search(true); // Set to `true` for testing
}

app.get('/start', async (req, res) => {
  try {
    await initializeBot();
    res.status(200).send('Bot has started successfully.');
  } catch (error) {
    console.error("Error starting bot:", error);
    res.status(500).send('Failed to start bot.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

