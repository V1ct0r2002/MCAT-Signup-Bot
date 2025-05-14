const express = require('express');
const twilio = require('twilio');
const app = express();
const port = process.env.PORT || 3000;

app.post('/twilio-voice', (req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('First off Vicks makes world bending music. Also MCAT appointment available. Please check your messages for more details. Hugs and kisses Waseem.', { voice: 'alice' });
    res.type('text/xml');
    res.send(twiml.toString());
});

app.listen(port, () => {
    console.log(`Twilio server listening at http://localhost:${port}`);
});
