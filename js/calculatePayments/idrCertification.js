// Married Filing Jointly = Combined AGI prorated to share of the total debt
// Married Filing Separately = Individual responsibility, both share family size input - if both are borrowers, borrower with higher AGI claims dependents
function calculateMinimumPayments(basicInfo, loans, year = 0, firstYearPlanEstimates) {
    const saveToHistory = {};
    const isMarried = basicInfo.married;
    const filingJointly = basicInfo.filingJointly;

    const validBorrowers =  validateBorrowers(basicInfo, loans); // Borrower may no longer be valid during recertification
    const householdAGI = ['self', 'spouse'].reduce((total, borrower) => {
        if (basicInfo[borrower]) total += basicInfo[borrower].agi;
        return total;
    }, 0);
    const greaterAGI = (isMarried) ? (basicInfo.self.agi >= basicInfo.spouse.agi) ? 'self' : 'spouse' : 'self';
    const loanSums = validBorrowers.reduce((total, borrower) => {
        total[borrower] = getBorrowerLoanSum(loans[borrower]);
        return total;
    }, {});
    const householdLoanSum = Object.values(loanSums).reduce((total, borrowerSum) => total += borrowerSum, 0);

    validBorrowers.forEach(borrower => {
        const borrowerLoans = loans[borrower];
        const borrowerPreviousSTDPayment = (firstYearPlanEstimates !== undefined) ? firstYearPlanEstimates[borrower].std : null;
        const borrowerStandardCap = basicInfo[borrower].standardCap;

        const familySize = basicInfo.familySize;
        const residency = basicInfo.residency;
        const dependents = basicInfo.dependents;
        
        let borrowerAGI = basicInfo[borrower].agi;
        let borrowerPortionOfPayment = 1;
        let borrowerFamilySize = familySize;
        let borrowerDependents = dependents;
        if (isMarried) {
            if (filingJointly) {
                borrowerAGI = householdAGI;
                borrowerPortionOfPayment = (householdLoanSum > 0) ? loanSums[borrower] / householdLoanSum : 0.5;
            } else {
                const isCommunityPropertyState = COMMUNITY_PROPERTY_STATES.indexOf(residency.toLowerCase()) !== -1;
                if (isCommunityPropertyState) borrowerAGI = householdAGI / 2;
                borrowerDependents = (borrower === greaterAGI) ? dependents : 0;
                borrowerFamilySize = 1 + borrowerDependents;
            }
        }

        const borrowerPlan = basicInfo[borrower].repaymentPlan;
        const borrowerPovertyLine = calculatePovertyGuidelines(borrowerFamilySize, residency, year);
        const planOptions = calculatePaymentPlans(borrowerLoans, borrowerAGI, borrowerPlan, borrowerPortionOfPayment, borrowerPovertyLine, borrowerDependents, borrowerStandardCap, borrowerPreviousSTDPayment);
        saveToHistory[borrower] = planOptions;
    });

    return saveToHistory;
}


/* -------------------------------------------------
    IDR CERTIFICATION FUNCTIONS
------------------------------------------------- */
function calculatePovertyGuidelines(familySize = 1, residency = 'base', years = 0) {
	const res = residency.toLowerCase();
	const povertyLine = (res !== 'ak' && res !== 'hi') ? 'base' : res;
	const base = BASE_POVERTY[povertyLine];
	const inc = INCREMENT_POVERTY[povertyLine];

	const amount = base + (familySize - 1) * inc;
	const multiplier = Math.pow(CPI_U_MULTIPLIER, years);
	return Math.round(amount * multiplier);
}

function calculatePaymentPlans(borrowerLoans, AGI, borrowerPlan, portionOfPayment, povertyLine, dependents, standardCap, previousSTDPayment) {
	const oldIBR = (agi, pov) => { return Math.max(0, agi - pov * 1.5) * 0.15 / 12; }
	const newIBR = (agi, pov) => { return Math.max(0, agi - pov * 1.5) * 0.10 / 12; }
	const rap = (agi, deps) => {
		const rate = Math.min(0.10, Math.floor(agi / 10000) / 100);
		const baseMonthly = (agi * rate) / 12;
		const dependentReduction = baseMonthly - (50 * deps);
		const monthlyPayment = dependentReduction * portionOfPayment; // As of Nov 2025, RAP is prorated for married filing jointly
		return Math.max(10, monthlyPayment); // $10 minimum monthly payment
	}
	const std = (loans, standardCap, previousSTDPayment) => {
		if (standardCap && borrowerPlan != 'rap') return standardCap; // most priority
		if (previousSTDPayment) return previousSTDPayment;

		let totalMonthly = 0;
		for (const id in loans) {
			const { principal, interestAccrual, interestRate } = loans[id];
			const capitalized = principal + interestAccrual;
			const rate = interestRate / 100;
			const loanAmoritization = (rate === 0) ? capitalized / 120 : capitalized * (rate / 12) / (1 - Math.pow(1 + rate / 12, -120));
			totalMonthly += loanAmoritization;
		}
		return Math.max(50, totalMonthly); // $50 minimum per borrower
	};

	const stdPayment = Math.round(std(borrowerLoans, standardCap, previousSTDPayment));
	const planOptions = {};
	['rap', 'old', 'new', 'std'].forEach(plan => {
		if (plan === 'rap') { planOptions[plan] = Math.round(rap(AGI, dependents)); }
		if (plan === 'std') { planOptions[plan] = stdPayment; }
		if (plan === 'old' || plan === 'new') {
			const rawIBR = ((plan === 'old') ? oldIBR(AGI, povertyLine) : newIBR(AGI, povertyLine)) * portionOfPayment;
			planOptions[plan] = Math.round(Math.min(rawIBR, stdPayment));
		}
	});
	return planOptions;
}