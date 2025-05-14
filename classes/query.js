/**
 * A specific MCAT search query of address, date, centers, phones.
 */
class Query {
    /**
     * Create an MCAT search query.
     * @param {string} address address to query for.
     * @param {string} month month to query for.
     * @param {string} day day to query for.
     * @param {int[]} centers centers to check for.
     * @param {string[]} text_phones phones to text.
     * @param {string[]} call_phones phones to call.
     */
    constructor(address, month, day, centers, text_phones, call_phones) {
        this.address = address;
        this.month = month;
        this.day = day;
        this.centers = centers;
        this.text_phones = text_phones;
        this.call_phones = call_phones;
        this.time = Date.now();
    }

    updateNotification() { 
        this.time = Date.now();
    }
}

const queries = [
    new Query(
        "152 Forecastle Rd", // Address to find nearby test centers
        "September", // Month to query for
        "14", // Day to query for
        Array.from({ length: 12 }, (_, i) => i), // Center indices to check for (0 to 11)
        ["+16476367403", "+19055195465", "+16479196080"], // Phone numbers to text
        ["+16476367403", "+19055195465", "+16479196080"] // Phone numbers to call
    ),
    new Query(
        "152 Forecastle Rd", // Address to find nearby test centers
        "September", // Month to query for
        "13", // Day to query for
        Array.from({ length: 12 }, (_, i) => i), // Center indices to check for (0 to 11)
        ["+16476367403", "+19055195465", "+16479196080"], // Phone numbers to text
        ["+16476367403", "+19055195465", "+16479196080"] // Phone numbers to call
    ),
    
];

module.exports = queries;


//`👁⃤ SPOT FOUND BROUGHT TO U BY ALBERTO NEAR ${query.address} ON ${query.month} ${query.day} FOR TEST CENTER ${i + 1}.`,