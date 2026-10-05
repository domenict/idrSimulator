let lastRawData = null;
let lastFormattedOutput = null;

function getGUIResult(borrowers, data) {
    let output = `<h3 class="results-summary-h3">SUMMARY</h3>`;

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

/* -------------------------------------------------
    MAIN
------------------------------------------------- */
function formatOutput(rawData) {
    const data = structuredClone(rawData);
    lastRawData = data;
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
    lastFormattedOutput = formattedOutput;

    return formattedOutput;
}