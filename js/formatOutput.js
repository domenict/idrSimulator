let lastRawOutput = null;

/* -------------------------------------------------
    MAIN
------------------------------------------------- */
function formatOutput(rawOutput) {
    const data = structuredClone(rawOutput);
    lastRawOutput = data;
    console.log(`SIMULATED OUTPUT: ${new Date()}`);
    console.log(data);

    const borrowers = Object.keys(data.loans);
    const output = getGUIResult(borrowers, data);

    const formattedOutput = html_beautify(output, {
        indent_size: 4,
        indent_level: 3,
        indent_char: ' ',
        max_preserve_newlines: 0,
        preserve_newlines: false,
        wrap_line_length: 0
    });
    return formattedOutput;
}


/* -------------------------------------------------
    BORROWER(S) HANDLING
------------------------------------------------- */
function getGUIResult(borrowers, data) {
    let output = `<h3>SUMMARY</h3>`;

    let pslfBorrowers = 0;
    borrowers.forEach(borrower => {
        const borrowerTotals = structuredClone(data.simulation.totals[borrower]);
        const borrowerFirstYearEstimates = data.firstYearPlanEstimates[borrower];
        const borrowerRepaymentOrder = data.repaymentOrders[borrower];

        const borrowerBlurb = getBorrowerBlurbs(borrower, borrowerTotals, borrowerFirstYearEstimates, borrowerRepaymentOrder);
        output += borrowerBlurb;
        if (data.simulation.totals[borrower].pslfEligible) pslfBorrowers++;
    });

    const sameYearForgiveness = data.simulation.totals.sameYearForgiveness;
    if (sameYearForgiveness && !pslfBorrowers) output += `<p>${getSameYearForgivenessBlurb()}</p>`;

    output += `<h3>STATISTICS</h3>`;
    const borrowerStatisticsTable = getBorrowerStatisticsTable(borrowers, data);
    output += borrowerStatisticsTable;

    output += `<h3>MONTHLY PAYMENT</h3>`;
    const monthlyPaymentsTable = getMonthlyPaymentsTable(borrowers, data);
    output += monthlyPaymentsTable;

    return output;
}

function getBorrowerBlurbs(borrower, borrowerTotals, borrowerFirstYearEstimates, borrowerRepaymentOrder) {
    const { federalTaxes, 
            minimumPayments,
            overpayments,
            paymentDuration, 
            repaymentPlan,
            pslfEligible, 
            remainingBalance,
            status,
            totalAccruedInterest
    } = borrowerTotals;
    const firstYearMinimumPayment = borrowerFirstYearEstimates[repaymentPlan];

    const statusBlurb = getStatusBlurb(borrower, status, paymentDuration);
    const totalsBlurb = getTotalsBlurb(borrower, borrowerRepaymentOrder, status, minimumPayments, overpayments, totalAccruedInterest);
    const monthlyPaymentBlurb = getMonthlyPaymentBlurb(borrower, repaymentPlan, firstYearMinimumPayment);
    const forgivenessBlurb = (status !== 'paid') ?  getForgivenessBlurb(borrower, remainingBalance, federalTaxes, pslfEligible) : null;
    
    let output = `<p>${statusBlurb} ${totalsBlurb} ${monthlyPaymentBlurb}`;
    output += `${(forgivenessBlurb)         ? ' ' + forgivenessBlurb : ''}`;
    return output += `</p>`;
}


/* -------------------------------------------------
    STATISTICS TABLE
------------------------------------------------- */
const statistics = {
    'Loan Status': 'status',
    'Term End': 'paymentDuration',
    'Initial Balance': 'startingBalance',
    'Interest Accrual': 'totalAccruedInterest',
    'Minimum Payments': 'minimumPayments',
    'Overpayments': 'overpayments',
    'Principal Match': 'totalPrincipalMatch',
    'Interest Waived': 'totalInterestWaived',
    'Forgiven Amount': 'remainingBalance',
    'Estimated Taxes': 'federalTaxes',
    'Total Payment': 'totalPayments'
}
const requiredStatistics = ['status', 'paymentDuration', 'startingBalance', 'totalAccruedInterest', 'minimumPayments', 'totalPayments'];

function getBorrowerStatisticsTable(borrowers, data) {
    const totals = data.simulation.totals;
    const members = structuredClone(borrowers);
    if (members.length > 1) members.push('family');

    const multiMemberHeader = `` +
    `<thead>
        <tr>
            <th scope="col">METRIC</th>
            <th scope="col">SELF</th>
            <th scope="col">SPOUSE</th>
            <th scope="col">FAMILY</th>
        </tr>
    </thead>`;
    
    return `` +
    `<div class="result-table-wrapper">
        <table class="result-table result-statistics-table">
            ${(members.length > 1) ? multiMemberHeader : ''}
            <tbody>
                ${getBorrowerStatisticsRows(members, totals)}
            </tbody>
        </table>
    </div>`;
}

function getBorrowerStatisticsRows(members, totals) {
    let output = ``;
    const statisticKeys = Object.keys(statistics);
    for (let i = 0; i < statisticKeys.length; i++) {
        const statisticName = statisticKeys[i];

        const memberTotals = {};
        let nonZeroTotals = 0;
        for (let j = 0; j < members.length; j++) {
            const member = members[j];
            const key = (member === 'family') ? 'family' + capitalizeString(statistics[statisticName]) : statistics[statisticName];
            if (member === 'family' && (key === 'familyStatus' || key === 'familyPaymentDuration')) {
                memberTotals[member] = "N/A";
                continue;
            }

            let value = (member === 'family') ? totals[key] : totals[member][key];
            if (value > 0 ) nonZeroTotals++;
            if (key === 'status') (value === 'paid') ? value = 'Paid in Full' : value = 'Forgiveness';
            if (key === 'paymentDuration') value = getEndDate(value);
            if (key !== 'status' && key !== 'paymentDuration') value = convertToUSD(value);

            memberTotals[member] = value;
        }
        if (!nonZeroTotals && requiredStatistics.indexOf(statistics[statisticName]) === -1) continue;

        output += `
            <tr>
                <th scope="row">${statisticName.toUpperCase()}</th>
        `;
        for (const member in memberTotals) {
            const value = memberTotals[member];
            output += `<td data-label="${member.toUpperCase()}">${value}</td>`;
        }
        output += `</tr>`;
    }
    return output;
}


/* -------------------------------------------------
    MONTHLY PAYMENT TABLE
------------------------------------------------- */
function getMonthlyPaymentsTable(borrowers, data) {
    const firstYearPlanEstimates = structuredClone(data.firstYearPlanEstimates);
    borrowers.forEach(borrower => delete firstYearPlanEstimates[borrower].std); // We want the capitalized standard plan for this only

    const planHeader = `` + 
    `<thead>
        <tr>
            ${(borrowers.length > 1) ? `<th scope="col">BORROWER</th>`: ``}
            <th scope="col">RAP</th>
            <th scope="col">OLD IBR</th>
            <th scope="col">NEW IBR</th>
            <th scope="col">STANDARD<br>(10 YEAR)</th>
        </tr>
    </thead>`;

    return `` +
    `<div class="result-table-wrapper">
        <table class="result-table result-monthlyPayment-table">
            ${planHeader}
            <tbody>
                ${getBorrowerMonthlyPaymentRows(borrowers, firstYearPlanEstimates)}
            </tbody>
        </table>
    </div>`;
}

function getBorrowerMonthlyPaymentRows(borrowers, firstYearPlanEstimates) {
    const order = ['rap','old','new','stdCapitalized'];
    const planHeaders = ['RAP','OLD IBR','NEW IBR','STD (10 YR)']

    let output = ``;
    borrowers.forEach(borrower => {
        if (borrowers.length > 1) {
            output += `
                <tr>
                    <th scope="row">${borrower.toUpperCase()}</th>
            `;
        }

        for (let i = 0; i < order.length; i++) {
            const plan = order[i];
            const planHeader = planHeaders[i];
            const amount = convertToUSD(firstYearPlanEstimates[borrower][plan]);
            output += `<td data-label="${planHeader}">${amount}</td>`;
        }
    });
    
    return output;
}

/* -------------------------------------------------
    DYNAMIC SNIPPITS
------------------------------------------------- */
function getRandomOutput(outputs) {
    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

function getStatusBlurb(borrower, status, paymentDuration) {
    const { pronoun, possessiveAdj, possessivePronoun } = getBorrowerDescriptors(borrower);
    const outputs = {
        1: `${capitalizeString(possessiveAdj)} loans are expected to be ${(status === 'paid') ? 'paid in full' : 'forgiven'} in ${paymentDuration} months.`,
        2: `The estimated payment schedule for ${possessiveAdj} loans is ${(status === 'paid') ? 'full payment' : 'forgiveness'} in ${paymentDuration} months.`,
        3: `${capitalizeString(pronoun)} ${(borrower === 'self') ? 'are' : 'is'} projected to have ${(status === 'paid') ? 'no outstanding loans' : possessivePronoun + ' loans forgiven'} in ${paymentDuration} months.`,
        4: `${capitalizeString(pronoun)} ${(borrower === 'self') ? 'are' : 'is'} on track ${(status === 'paid') ? 'to satisfy ' + possessivePronoun + ' balance': 'for forgiveness'} in ${paymentDuration} months.`
    }
    return getRandomOutput(outputs);
}

function getTotalsBlurb(borrower, borrowerRepaymentOrder, status, minimumPaymentsRAW, overpaymentsRAW, totalAccruedInterestRAW) {
    const { pronoun, possessiveAdj, possessivePronoun} = getBorrowerDescriptors(borrower);
    const totalAccruedInterest = convertToUSD(totalAccruedInterestRAW);
    const totalPayments = convertToUSD(minimumPaymentsRAW + overpaymentsRAW);
    const paid = (status) === 'paid';
    const pluralLoans = (borrowerRepaymentOrder.length > 1) ? 's' : '';

    const outputs = {
        1: `By the end of the repayment term, ${totalAccruedInterest} of interest will have accrued after ${totalPayments} of payments.`,
        2: `By the time ${possessiveAdj} loan${pluralLoans} are ${(paid) ? 'paid' : 'forgiven'}, the total cost of borrowing will include ${totalAccruedInterest} in interest and ${totalPayments} in payments.`,
        3: `Over the life of ${possessivePronoun} loan${pluralLoans}, ${pronoun} will accrue a total of ${totalAccruedInterest} in interest after making ${totalPayments} in payments.`,
        4: `This repayment strategy involves ${totalPayments} in payments which includes ${totalAccruedInterest} of cumulative interest.`
    }
    return getRandomOutput(outputs);
}

function getMonthlyPaymentBlurb(borrower, repaymentPlanRAW, firstYearMinimumPaymentRAW) {
    const { possessiveAdj, possessivePronoun, } = getBorrowerDescriptors(borrower);
    const repaymentPlan = (repaymentPlanRAW === 'rap') ? 'RAP' : (repaymentPlanRAW === 'old') ? 'Old IBR' : 'New IBR';
    const firstYearMinimumPayment = convertToUSD(firstYearMinimumPaymentRAW);

    const outputs = {
        1: `${capitalizeString(possessivePronoun)} monthly payment in ${repaymentPlan} is calculated to be ${firstYearMinimumPayment} per month.`,
        2: `${capitalizeString(possessiveAdj)} monthly payments in ${repaymentPlan} will be approximately ${firstYearMinimumPayment} per month.`,
        3: `Repayment in ${repaymentPlan} will begin at roughly ${firstYearMinimumPayment} per month.`,
        4: `${(borrower === 'spouse') ? 'They should expect' : 'Expect'} to see monthly payments of roughly ${firstYearMinimumPayment} per month on ${repaymentPlan}.`
    }
    return getRandomOutput(outputs);
}

function getForgivenessBlurb(borrower, remainingBalanceRAW, federalTaxesRAW, pslfEligible) {
    const { pronoun, possessiveAdj } = getBorrowerDescriptors(borrower);
    const remainingBalance = convertToUSD(remainingBalanceRAW);
    const federalTaxes = convertToUSD(federalTaxesRAW);

    const outputsPSLF = {
        1: `Afterwards, the remaining balance of ${remainingBalance} will be forgiven from PSLF.'`,
        2: `After repayment is complete, ${remainingBalance} will be fully forgiven under PSLF.`,
        3: `Following ${possessiveAdj} final payment, the remaining ${remainingBalance} will be fully discharged through PSLF, leaving ${pronoun} with no further obligation.`,
        4: `At the conclusion of the repayment term, PSLF requirements will be met and ${possessiveAdj} ${remainingBalance} balance will be forgiven in full.`
    }
    const outputsTaxed = {
        1: `Afterwards, the remaining balance of ${remainingBalance} will incur an estimated ${federalTaxes} in federal taxes, plus any applicable state-level taxes.`,
        2: `After repayment is complete, the remaining balance of ${remainingBalance} will be taxed roughly ${federalTaxes} excluding any potential state taxes.`,
        3: `Following ${possessiveAdj} final payment, the remaining ${remainingBalance} balance will trigger an estimated ${federalTaxes} in federal tax responsibility with additional liability if ${possessiveAdj} state taxes student loan forgiveness.`,
        4: `At the conclusion of the repayment term, a predicted ${federalTaxes} of taxes from the ${remainingBalance} remaining balance should be anticipated assuming state taxes do not apply.`
    }
    const outputs = (pslfEligible) ? outputsPSLF : outputsTaxed; 

    return getRandomOutput(outputs);
}

function getSameYearForgivenessBlurb() {
    const outputs = {
        1: `Please be aware that both borrowers are expected to be forgiven within the same year which can add to your tax burden.`,
        2: `It is important to note that both balances are expected to be forgiven within the same year resulting in potentially higher taxes.`,
        3: `Be advised that both balances may be forgiven the same year leading to compounded tax impact the following year.`,
        4: `Keep in mind that both borrowers may be cleared of liability in the same year and cause a larger-than-expected tax bill the following tax season.`
    }
    return getRandomOutput(outputs);
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
