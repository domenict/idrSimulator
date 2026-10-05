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