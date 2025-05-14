const Query = require("../classes/query.js");
const puppeteer = require("puppeteer");
const secrets = require("./secrets.js");

const accountSid = secrets.TWILIO_ACCOUNT_SID;
const authToken = secrets.TWILIO_AUTH_TOKEN;
const client = require("twilio")(accountSid, authToken);

const login_url = "https://auth.aamc.org/account/#/login?goto=https:%2F%2Fmcat.aamc.org%2Fmrs";
const mcatSignupUrl = "https://mcat.aamc.org/mrs/#/dashboard/16418907";

/**
 * Bot that takes in queries to search for and keeps searching for availabilities.
 */
class Bot {
  /**
   * Initialize a Bot with basic parameters for searching MCAT locations.
   * @param {Query[]} queries queries to search for.
   */
  constructor(queries) {
    this.queries = queries;
    this.months = ["April", "May", "June", "July", "August", "September"];
    this.masterPhone = secrets.my_phone;
  }

  /**
   * Log in and search the MCAT website for specific locations and dates.
   * @param {boolean} testing set to true if want to test on local computer, false if on EC2.
   */
  search = async (testing = false) => {
    try {
      console.log("MCAT Bot started running.");
      this.sendText("MCAT Bot has started running.", this.masterPhone);

      // Launch new browser launch new browser 
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-browser-side-navigation',
          '--mute-audio',
          '--disable-infobars'
        ],
        protocolTimeout: 600_000 // Set protocol timeout to 10 minutes
      });
      this.page = await this.browser.newPage();

      await this.page.setRequestInterception(true);
      this.page.on('request', (request) => {
        if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
          request.abort();
        } else {
          request.continue(); 
        } 
      });

      // If on EC2 instance, give more wiggle room w/ timeout
      if (!testing) {
        this.page.setDefaultTimeout(600_000);  // Increased timeout to 10 minutes
      }

      // Navigate to login and login
      console.log("Navigating to login page...");
      await this.page.goto(login_url, { timeout: 600_000 });
      await Promise.all([
        this.page.waitForSelector('input[name="IDToken1"]', { timeout: 600_000 }),
        this.page.waitForSelector('input[name="IDToken2"]', { timeout: 600_000 }),
        this.page.waitForSelector('button[id="login-btn"]', { timeout: 600_000 }),
        this.timeout(5_000),
      ]);
      console.log("Filling in login credentials...");
      await this.page.type('input[name="IDToken1"]', secrets.username);
      await this.page.type('input[name="IDToken2"]', secrets.password);
      console.log("Clicking login button...");
      await Promise.all([
        this.page.click('button[id="login-btn"]'),
        this.page.waitForNavigation({ timeout: 600_000 }),
      ]);

      // Give some time for the page to load after login
      console.log("Waiting for dashboard to load...");
      await this.timeout(5000); // Wait for 5 seconds for the page to load

      // Verify login by checking a reliable element
      try {
        await this.page.waitForSelector("span.mat-mdc-focus-indicator", { timeout: 600_000 });
      } catch (error) {
        throw new Error("Failed to load dashboard");
      }

      console.log("Dashboard loaded successfully.");

      // Click through to schedule query
      console.log("Clicking on Schedule an Exam...");
      try {
        await this.page.evaluate(() => {
          const link = Array.from(document.querySelectorAll("span.mdc-button__label"))
            .find(el => el.textContent.trim() === "Schedule an Exam");
          if (link) {
            link.click();
            console.log("Clicked on Schedule an Exam button.");
          } else {
            throw new Error("Schedule an Exam button not found");
          } 
        });
        await this.timeout(4000); // Wait for 4 seconds to see if the navigation happens
      } catch (error) {
        throw new Error("Failed to click on Schedule an Exam");
      }

      // Wait for the Policy Agreement page and click "AGREE"
      console.log("Waiting for Policy Agreement page...");
      try {
        await this.page.waitForSelector('input#nextButton', { timeout: 600_000 });
        console.log("Clicking AGREE button...");
        await this.page.click('input#nextButton');
      } catch (error) {
        throw new Error("Failed to load Policy Agreement page");
      }

      // Wait for the test center search page
      console.log("Waiting for test center search page...");
      try {
        await this.page.waitForSelector('input[name="testCentersNearAddress"]', { timeout: 600_000 });
        await this.page.waitForSelector('input#addressSearch', { timeout: 600_000 });
      } catch (error) {
        throw new Error("Failed to load test center search page");
      }

      // Start the loop for searching specific queries
      await this.loopSearch(0);
    } catch (error) {
      console.error("Error during search process:", error);
      this.sendText(`Error: ${error.message}`, this.masterPhone);
      await this.browser.close();
      process.exit(1);
    }
  };

  /**
   * Fills in address and date, and searches for test centers.
   * @param {Query} query specific query to search.
   */
  searchSpecificQuery = async (query) => {
    try {
      // fill in address
      await this.page.$eval(
        'input[name="testCentersNearAddress"]',
        (el, address) => (el.value = address),
        query.address
      );

      // fill in date
      await this.fillInDate(query);

      // navigate
      await Promise.all([
        this.page.click("input#addressSearch"),
        this.page.waitForNavigation({ timeout: 600_000 }),
      ]);

      await Promise.all([
        this.page.waitForSelector(`tbody tr td.searchByDateApptCol span`, { timeout: 600_000 }),
        this.page.waitForSelector('img[id="calendarIcon"]', { timeout: 600_000 }),
        this.page.waitForSelector('input[id="addressSearch"]', { timeout: 600_000 }),
        this.page.waitForSelector('input[name="testCentersNearAddress"]', { timeout: 600_000 }),
      ]);
    } catch (error) {
      throw new Error(`Failed to search specific query: ${error.message}`);
    }
  };

  fillInDate = async (query) => {
    try {
      await this.page.click('img[id="calendarIcon"]');
      await this.page.waitForSelector("span.ui-datepicker-month", { timeout: 600_000 });
      const targetMonthInd = this.months.indexOf(query.month);
      const monthElt = await this.page.$("span.ui-datepicker-month");
      const currMonth = await monthElt.evaluate((el) => el.textContent);
      let currMonthInd = this.months.indexOf(currMonth);

      while (currMonthInd < targetMonthInd) {
        // select next month button
        await this.page.click("a.ui-datepicker-next.ui-corner-all");
        await this.timeout(1_000);
        currMonthInd += 1;
      }

      await this.page.$$eval(
        "a.ui-state-default",
        (elts, day) => {
          for (const elt of elts) {
            if (elt.textContent === " " + day) {
              elt.click();
              break;
            }
          }
        },
        query.day
      );
    } catch (error) {
      throw new Error(`Failed to fill in date: ${error.message}`);
    }
  };

  /**
   * Makes a basic location/date query and sends a text with the results.
   */
  checkWorking = async (iterations) => {
    const allPhones = new Set();
    this.queries.forEach(query => {
      query.text_phones.forEach(phone => allPhones.add(phone));
    });

    allPhones.forEach(phone => {
      this.sendText(`Alberto has searched ${iterations} times. Continuing with queries.`, phone);
    });
  };

  /**
   * Returns if a specific center has appointments available.
   * @param {number} startIndex Starting index of centers to check.
   * @param {number} count Number of centers to check.
   * @returns if any of the centers in the specified range are available.
   */
  isSpecificCenterAvailable = async (startIndex, count) => {
    try {
      for (let i = startIndex; i < startIndex + count; i++) {
        const isAvailable = await this.page.evaluate((i) => {
          const arr = Array.from(
            document.querySelectorAll(
              `tr#testCenter_${i} td.searchByDateApptCol span`
            )
          ).slice(1);

          for (let i = 0; i < arr.length; i++) {
            const elt = arr[i];
            if (elt.id.slice(0, 4) === "hour") {
              return true;
            }
          }
          return false;
        }, i);
        if (isAvailable) {
          return true;
        }
      }
      return false;
    } catch (error) {
      throw new Error(`Failed to check specific center availability: ${error.message}`);
    }
  };

  /**
   * Keeps searching for bot's location and dates, for centers.
   * Texts and calls the bot's phone number if one is available.
   * @param {int} counter How many times this loop has iterated.
   */
  loopSearch = async (counter) => {
    console.log(`Loop iteration: ${counter}`);
    for (const query of this.queries) {
      try {
        // if already notified within last 60 seconds, don't search again
        const currTime = new Date();
        if (this.getTimeDifferenceInSeconds(currTime, new Date(query.time)) < 60) {
          continue;
        }

        await this.searchSpecificQuery(query);
        for (let i = 0; i < 12; i++) { // Check the first 12 locations
          const isAvailable = await this.isSpecificCenterAvailable(i, 1);
          if (isAvailable) {
            for (const phone of query.text_phones) {
              this.sendText(
                `👁⃤ SPOT FOUND BROUGHT TO U BY ALBERTO NEAR ${query.address} ON ${query.month} ${query.day} FOR TEST CENTER ${i + 1}.`,
                phone
              );
            }
            for (const phone of query.call_phones) {
              this.call(phone);
            }
            // Break the loop after simulating the first available spot
            break;
          }
        }
      } catch (error) {
        console.error("Error during loop search:", error);
        for (const phone of query.text_phones) {
          this.sendText(
            `I'm going retarded: ${error.message}`,
            phone
          );
        }
        await this.browser.close();
        process.exit(1);
      }
    }

    // every 2000 loops, do a test to ensure that it's working
    if (counter % 2_000 === 0) {
      await this.checkWorking(counter);
    }

    // re-call this function in two seconds
    setTimeout(() => {
      this.loopSearch(counter + 1);
    }, 2_000);
  };

  /**
   * This function takes in two Date objects and
   *    returns the time difference between them in seconds.
   * @param {Date} date1 The first Date object to compare.
   * @param {Date} date2 The second Date object to compare.
   * @returns A number representing the time difference
   *    between date1 and date2 in seconds.
   */
  getTimeDifferenceInSeconds = (date1, date2) => {
    // Ensure date1 and date2 are Date objects
    if (!(date1 instanceof Date)) {
      date1 = new Date(date1);
    }
    if (!(date2 instanceof Date)) {
      date2 = new Date(date2);
    }

    const difference = Math.abs(date1.getTime() - date2.getTime());
    const seconds = Math.floor(difference / 1_000);
    return seconds;
  };

  /**
   * Sends a text to a phone number.
   * @param {string} msg Message to be texted.
   * @param {string} number Phone number for text to be sent to.
   */
  sendText = (msg, number) => {
    console.log(`Preparing to send text to ${number} with message: ${msg}`);
    if (!number) {
      console.error(`Invalid phone number: ${number}`);
      return;
    }
    client.messages.create({
      body: msg,
      from: secrets.twilio_number,
      to: number,
    })
      .then(message => console.log(`Message sent to ${number}: ${message.sid}`))
      .catch(error => console.error(`Failed to send message to ${number}:`, error));
  };

  /**
   * Calls a phone number.
   * @param {string} number Phone number to be called.
   */
  call = (number) => {
    console.log(`Preparing to call ${number}`);
    if (!number) {
      console.error(`Invalid phone number: ${number}`);
      return;
    }
    client.calls.create({
      url: "http://demo.twilio.com/docs/voice.xml",
      from: secrets.twilio_number,
      to: number,
    })
      .then(call => console.log(`Call initiated to ${number}: ${call.sid}`))
      .catch(error => console.error(`Failed to initiate call to ${number}:`, error));
  };

  /**
   * Creates a Promise with a specified resolve time.
   * @param {int} ms how long the Promise should take to resolve.
   * @returns A Promise that resolves in the specified ms
   */
  timeout = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };
}

module.exports = Bot;

























