function validateBorrowers(basicInfo, loans) {
    const borrowers_BASE = Object.keys(loans);
    const validBorrowers = structuredClone(borrowers_BASE);

    borrowers_BASE.forEach(borrower => { 
        const noLoans = Object.keys(loans[borrower]).length === 0;
        const noBalance = getBorrowerLoanSum(loans[borrower]) === 0;
        const noRemainingPayments = getRemainingPayments(basicInfo, borrower) === 0;
        if (noLoans || noBalance || noRemainingPayments) {
            validBorrowers.splice(validBorrowers.indexOf(borrower), 1);
        }
    });

    return (validBorrowers.length > 0) ? validBorrowers : null;
}

function getBorrowerLoanSum(borrowerLoans) {
    let total = 0;
    const keys = Object.keys(borrowerLoans);
    for (let i = 0; i < keys.length; i++) {
        const principal = borrowerLoans[keys[i]].principal;
        const interestAccrual = borrowerLoans[keys[i]].interestAccrual;
        total += principal + interestAccrual;
    }
    return total;
}

function getRemainingPayments(basicInfo, borrower) {
    const planMap = ["old", 300, "new", 240, "rap", 360];
    const planIndex = planMap.indexOf(basicInfo[borrower].repaymentPlan) + 1;
    const pslfEligible = basicInfo[borrower].pslfEligible;
    const planMax = (pslfEligible) ? 120 : planMap[planIndex];
    return planMax - basicInfo[borrower].qualifiedPayments;
}
