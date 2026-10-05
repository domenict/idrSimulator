function getPlanHeaderArray() {
    return [ {'rap':'RAP'}, {'old':'OLD IBR'}, {'new':`NEW IBR<br>or PAYE`}, {'std':`STANDARD<br>(10 YEAR)`} ];
}

function getPlanHeader(borrowers) {
    const planHeaderArr = getPlanHeaderArray();
    const planHeaderKeys = planHeaderArr.flatMap(obj => Object.keys(obj));
    
    let headers = ``;
    for (let i = 0; i < planHeaderKeys.length; i++) {
        const header = planHeaderArr[i][planHeaderKeys[i]];
        headers += `<th scope="col">${header}</th>`;
    }

    return `` + 
    `<thead>
        <tr>
            ${(borrowers.length > 1) ? `<th scope="col">BORROWER</th>`: ``}
            ${headers}
        </tr>
    </thead>`;
}

function getMonthlyPaymentsTable(borrowers, data) {
    const firstYearPlanEstimates = structuredClone(data.firstYearPlanEstimates);

    return `` +
    `<div class="result-table-wrapper">
        <table class="result-table result-monthlyPayment-table">
            ${getPlanHeader(borrowers)}
            <tbody>
                ${getBorrowerMonthlyPaymentRows(borrowers, firstYearPlanEstimates)}
            </tbody>
        </table>
    </div>`;
}

function getBorrowerMonthlyPaymentRows(borrowers, firstYearPlanEstimates) {
    const planHeaderArr = getPlanHeaderArray();
    const planHeaderKeys = planHeaderArr.flatMap(obj => Object.keys(obj));

    let output = ``;
    borrowers.forEach(borrower => {
        if (borrowers.length > 1) {
            output += `
                <tr>
                    <th scope="row">${borrower.toUpperCase()}</th>
            `;
        }

        for (let i = 0; i < planHeaderKeys.length; i++) {
            const plan = planHeaderKeys[i];
            const header = planHeaderArr[i][plan].replace(/<br\s*\/?>/gi, '\n');
            const amount = convertToUSD(firstYearPlanEstimates[borrower][plan]);
            output += `<td data-label="${header}">${amount}</td>`;
        }
    });
    
    return output;
}