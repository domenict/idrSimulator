function capitalizeString(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1, str.length);
}

function getRandomNumber(max) {
    const min = 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBorrowerDescriptors(borrower) {
    const pronoun = (borrower === 'self') ? 'you' : 'your spouse';
    const possessiveAdj = (borrower === 'self') ? 'your' : 'your spouse\'s';
    const possessivePronoun = (borrower === 'self') ? 'your' : 'their';
    return {pronoun, possessiveAdj, possessivePronoun};
}

function getEndDate(totalMonths) {
    const date = new Date();
    date.setMonth(date.getMonth() + totalMonths);

    const options = { month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-US', options) // "February 2031"
}

function convertToUSD(num) {
    return Math.floor(num + 0.49).toLocaleString('en-US', { style: 'currency', currency: 'USD' }).split(".")[0];
}
