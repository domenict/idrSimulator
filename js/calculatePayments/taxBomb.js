function getBorrowerTaxBomb(basicInfo, balance, borrowers, borrower, year, sameYearForgiveness, previousBorrowerBalance) {
    const married = basicInfo.married;
    const filingJointly = basicInfo.filingJointly;
    const filingType = (filingJointly) ? 'married' : 'single';
    const filingBorrowers = basicInfo.filingJointly ? borrowers : [borrower];
    const agi = filingBorrowers.reduce((total, borrower) => {
        total += basicInfo[borrower].agi; //agi already scaled with annualGrowth during monthly payment simulation
        return total;
    }, 0);
    const dependents = basicInfo.dependents;

    const deductionType = (() => {
        if (filingJointly) return STANDARD_DEDUCTIONS.MARRIED;
        if (!married && dependents > 0) return STANDARD_DEDUCTIONS.HOH;
        return STANDARD_DEDUCTIONS.SINGLE; // Covers single and MFS for simplicity
    })();

    const growthFactor = Math.pow(CPI_U_MULTIPLIER, year);
    const deduction = deductionType * growthFactor;

    let start = Math.max(0, agi - deduction);
    if (sameYearForgiveness) start += previousBorrowerBalance;
    const end = start + balance;

    const brackets = INCOME_BRACKETS[filingType];
    return calculateBrackets(brackets, start, end, growthFactor);
}

function calculateBrackets(brackets, start, end, growthFactor = 1) {
    let total = 0;
    for (const bracket of brackets) {
        const min = bracket.min * growthFactor;
        const max = bracket.max * growthFactor;
        const rate = bracket.rate; 

        if (start >= max || end <= min) continue;

        const overlapMin = Math.max(start, min);
        const overlapMax = Math.min(end, max);
        if (overlapMax > overlapMin) {
            total += (overlapMax - overlapMin) * rate;
        }
    }
    return total;
}
