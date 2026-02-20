let lastOutput = null;

/* -------------------------------------------------
    MAIN
------------------------------------------------- */
function formatOutput(rawOutput) {
    const data = structuredClone(rawOutput);
    lastOutput = data;

    const borrowers = Object.keys(data.loans);
    let output = ``;
    switch (borrowers.length) {
        case 1: 
            output = singleBorrower(borrowers, data);
            break;
        case 2: 
            output = dualBorrowers(borrowers, data);
            break;
    }

    console.log(`SIMULATED OUTPUT: ${new Date()}`);
    console.log(data);
    return output;
}

/* -------------------------------------------------
    BORROWER(S) HANDLING
------------------------------------------------- */
function singleBorrower(borrowers, data) {
    const borrower = borrowers[0];
    let output = `<h3>SUMMARY</h3>`;

    const borrowerTotals = structuredClone(data.simulation.totals[borrower]);
    const borrowerFirstYearEstimates = data.firstYearPlanEstimates[borrower];
    const borrowerRepaymentOrder = data.repaymentOrders[borrower];
    const borrowerBlurb = getBorrowerBlurb(borrower, borrowerTotals, borrowerFirstYearEstimates, borrowerRepaymentOrder);
    output += borrowerBlurb;

    output += `\n<h3>STATISTICS</h3>`;
    const borrowerStatistics = singleBorrowerStatistics(borrower, data);
    return output + borrowerStatistics;
}

function dualBorrowers(borrowers, data) {
    let output = `<h3>SUMMARY</h3>`;

    let borrowerNumber = 1;
    borrowers.forEach(borrower => {
        const borrowerTotals = structuredClone(data.simulation.totals[borrower]);
        const borrowerFirstYearEstimates = data.firstYearPlanEstimates[borrower];
        const borrowerRepaymentOrder = data.repaymentOrders[borrower];
        const borrowerBlurb = getBorrowerBlurb(borrower, borrowerTotals, borrowerFirstYearEstimates, borrowerRepaymentOrder);
        output += borrowerBlurb;

        const sameYearForgiveness = data.simulation.totals.sameYearForgiveness;
        if (sameYearForgiveness && borrowerNumber === borrowers.length) {
            const sameYearForgivenessBlurb = getSameYearForgivenessBlurb();
            output += ` ${sameYearForgivenessBlurb}`;
        }

        borrowerNumber++;
    });

    output += `\n<h3>STATISTICS</h3>`;
    const borrowerStatistics = dualBorrowerStatistics(borrowers, data);
    return output + borrowerStatistics;
}

function getBorrowerBlurb(borrower, borrowerTotals, borrowerFirstYearEstimates, borrowerRepaymentOrder) {
    const { agi, 
            annualGrowth,
            federalTaxes, 
            forgiveness, 
            irsEstimate, 
            minimumPayments,
            overPayments,
            paymentDuration, 
            repaymentPlan,
            pslfEligible, 
            remainingBalance,
            startingBalance,
            status,
            totalAccruedInterest,
            totalInterestWaived,
            totalPayments,
            totalPrincipalMatch 
    } = borrowerTotals;
    const firstYearMinimumPayment = borrowerFirstYearEstimates[repaymentPlan];

    const statusBlurb = getStatusBlurb(borrower, status, paymentDuration);
    const paymentBlurb = getPaymentBlurb(borrower, agi, annualGrowth, repaymentPlan, firstYearMinimumPayment, startingBalance, totalPayments, totalAccruedInterest, totalInterestWaived, totalPrincipalMatch);
    const nextStepsBlurb = (status === 'paid') ?  
        getPaymentStrategyBlurb(borrower, borrowerRepaymentOrder) : 
        getForgivenessBlurb(borrower, federalTaxes, forgiveness, irsEstimate, pslfEligible, remainingBalance);
    return `<p>${statusBlurb} ${paymentBlurb}` + `${(nextStepsBlurb) ? nextStepsBlurb : ''}</p>`;
}

/* -------------------------------------------------
    STATISTICS OUTPUT
------------------------------------------------- */
const statistics = {
    'Projected Status': 'status',
    'Loan Term': 'paymentDuration',
    'Initial Balance': 'startingBalance',
    'Interest Accrual': 'totalAccruedInterest',
    'Monthly Dues': 'minimumPayments',
    'Overpayments': 'overpayments',
    'Principal Match': 'totalPrincipalMatch',
    'Forgiven Amount': 'remainingBalance',
    'Estimated Taxes': 'federalTaxes',
    'Total Payment': 'totalPayments'
}
const requiredStatistics = ['status', 'paymentDuration', 'startingBalance', 'totalAccruedInterest', 'minimumPayments', 'totalPayments'];

function singleBorrowerStatistics(borrower, data) {
    const borrowerTotals = data.simulation.totals[borrower];
    const statisticKeys = Object.keys(statistics);
    let output = ``;

    for (let i = 0; i < statisticKeys.length; i++) {
        const statisticName = statisticKeys[i];
        const key = statistics[statisticName];
        let value = borrowerTotals[key];

        if (value || requiredStatistics.indexOf(key) !== -1) {
            if (key === 'status') (value === 'paid') ? value = 'Paid in Full' : value = 'Forgiveness';
            if (key === 'paymentDuration') value = getYearMonthFormat(value);
            if (key !== 'status' && key !== 'paymentDuration') value = value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

            output += `<b>${statisticName.toUpperCase()}:</b>${value}`;
            if (i < statisticKeys.length - 1) output += '\n';
        }
    }

    return output;
}

function dualBorrowerStatistics(borrowers, data) {
    const totals = data.simulation.totals;
    const members = structuredClone(borrowers);
    members.push('family');

    const statisticKeys = Object.keys(statistics);
    let output = ``;
    for (let i = 0; i < statisticKeys.length; i++) {
        const statisticName = statisticKeys[i];

        const memberTotals = {};
        let nonZeroTotals = 0;
        for (let j = 0; j < members.length; j++) {
            const member = members[j];
            const key = (member === 'family') ? 'family' + capitalizeString(statistics[statisticName]) : statistics[statisticName];
            if (member === 'family' && (key === 'familyStatus' || key === 'familyPaymentDuration')) continue;

            let value = (member === 'family') ? totals[key] : totals[member][key];
            if (value > 0 ) nonZeroTotals++;
            if (key === 'status') (value === 'paid') ? value = 'Paid in Full' : value = 'Forgiveness';
            if (key === 'paymentDuration') value = getYearMonthFormat(value);
            if (key !== 'status' && key !== 'paymentDuration') value = value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

            memberTotals[member] = value;
        }
        if (!nonZeroTotals && requiredStatistics.indexOf(statistics[statisticName]) === -1) continue;

        const doubleSpace = `&nbsp;&nbsp;`;
        const tab = `&nbsp;&nbsp;&nbsp;&nbsp;`;
        output += `<h4>${doubleSpace}${statisticName.toUpperCase()}</h4>`;
        for (const member in memberTotals) {
            const value = memberTotals[member];
            output += `${tab + doubleSpace}<b>${member.toUpperCase()}:</b>${value}\n`;
        }
    }

    return output;
}

/* -------------------------------------------------
    DYNAMIC SNIPPITS
------------------------------------------------- */
function getStatusBlurb(borrower, status, paymentDuration) {
    const { pronoun, possessiveAdj, possessivePronoun } = getBorrowerDescriptors(borrower);
    const outputs = {
        1: `${capitalizeString(possessiveAdj)} loans are expected to be ${(status === 'paid') ? 'paid in full' : 'forgiven'} in ${paymentDuration} months.`,
        2: `The estimated payment schedule for ${possessiveAdj} loans is ${(status === 'paid') ? 'full payment' : 'forgiveness'} in ${paymentDuration} months.`,
        3: `${capitalizeString(pronoun)} ${(borrower === 'self') ? 'are' : 'is'} projected to have ${(status === 'paid') ? 'no outstanding loans' : possessivePronoun + ' loans forgiven'} in ${paymentDuration} months.`,
        4: `${capitalizeString(pronoun)} ${(borrower === 'self') ? 'are' : 'is'} on track ${(status === 'paid') ? 'to satisfy ' + possessivePronoun + ' balance': 'for forgiveness'} in ${paymentDuration} months.`
    }

    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

function getPaymentBlurb(borrower, agi, annualGrowth, repaymentPlan, firstYearMinimumPayment, startingBalance, totalPayments, totalAccruedInterest, totalInterestWaived, totalPrincipalMatch) {
    const { pronoun, possessiveAdj, possessivePronoun } = getBorrowerDescriptors(borrower);
    const planMap = { 'rap': 'RAP', 'old': 'old IBR', 'new': 'new IBR' };
    const planName = planMap[repaymentPlan];

    const withGrowthOutputs = {
        1: ``,
        2: ``,
        3: ``,
        4: ``,
    }
    const noGrowthOutputs = {
        1: ``,
        2: ``,
        3: ``,
        4: ``,
    }

    const outputs = (annualGrowth) ? withGrowthOutputs : noGrowthOutputs;
    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

function getPaymentStrategyBlurb(borrower, borrowerRepaymentOrder) {
    if (borrowerRepaymentOrder.length <= 1) return;
    const { pronoun, possessiveAdj, possessivePronoun } = getBorrowerDescriptors(borrower);

    const outputs = {
        1: '',
        2: '',
        3: '',
        4: '',
    }

    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

function getForgivenessBlurb(borrower, federalTaxes, forgiveness, irsEstimate, pslfEligible, remainingBalance) {
    const { pronoun, possessiveAdj, possessivePronoun } = getBorrowerDescriptors(borrower);

    const outputs = {
        1: '',
        2: '',
        3: '',
        4: '',
    }

    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

function getSameYearForgivenessBlurb() {
    const outputs = {
        1: '',
        2: '',
        3: '',
        4: '',
    }

    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

/* -------------------------------------------------
    HELPER FUNCTIONS
------------------------------------------------- */
function capitalizeString(str) {
    return str.slice(0, 1).toUpperCase() + str.slice(1, str.length);
}

function getRandomNumber(max) {
    const min = 1;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getBorrowerDescriptors(borrower) {
    const possessiveAdj = (borrower === 'self') ? 'your' : 'your spouse\'s';
    const pronoun = (borrower === 'self') ? 'you' : 'your spouse';
    const possessivePronoun = (borrower === 'self') ? 'your' : 'their';
    return {pronoun, possessiveAdj, possessivePronoun};
}

function getYearMonthFormat(totalMonths) {
    const years = Math.floor(totalMonths/12);
    const months = totalMonths - Math.floor(totalMonths/12) * 12;

    let output = '';
    if (years) output += years + ' years ';
    output += months + ' months';
    if (months === 1) output = output.slice(0,-1);

    return output;
}
