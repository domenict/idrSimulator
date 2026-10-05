function simulateRepayment(basicInfo_BASE, loans_BASE, repaymentOrders_BASE, firstYearPlanEstimates_BASE) {
    const basicInfo = structuredClone(basicInfo_BASE);
    const loans = structuredClone(loans_BASE);
    const repaymentOrders = structuredClone(repaymentOrders_BASE);
    const firstYearPlanEstimates = structuredClone(firstYearPlanEstimates_BASE);
    const borrowers = Object.keys(loans_BASE); 

    // Borrower baselines
    const borrowerOverpayments = {};
    const initialBorrowerLoanSums = {};
    borrowers.forEach(borrower => {
        // Apply interest reduction
        const interestReduction = basicInfo[borrower].interestReduction;
        if (interestReduction) {
            for (const loanID in loans[borrower]) {
                const rate = loans[borrower][loanID].interestRate;
                loans[borrower][loanID].interestRate = Math.max(0, rate - 0.25);
            }
        }

        // Distribute minimum payments
        const borrowerLoanSum = getBorrowerLoanSum(loans[borrower]);
        initialBorrowerLoanSums[borrower] = borrowerLoanSum;
        const borrowerPlan = basicInfo[borrower].repaymentPlan
        const borrowerMonthlyPayment = firstYearPlanEstimates[borrower][borrowerPlan];
        distributeMinimumPayment(loans[borrower], borrowerLoanSum, borrowerMonthlyPayment);

        // Overpayment to income ratio
        const borrowerOverPayment = basicInfo[borrower].monthlyOverpayment;
        const borrowerAGI = basicInfo[borrower].agi;
        borrowerOverpayments[borrower] = {
            'monthlyOverpayment': borrowerOverPayment,
            'ratio': (borrowerAGI > 0) ? borrowerOverPayment / borrowerAGI : 0,
            'toAddToPool': 0,
        }
    });


    // Explicit creation of the JSON structure.
    // Totals are modified throughout simulation. 
    // Monthly template is copied and modified each month into simulatedPayments.
    const repaymentSimulation = {
        'basicInfo': structuredClone(basicInfo_BASE),
        'loans': structuredClone(loans_BASE),
        'repaymentOrders': structuredClone(repaymentOrders_BASE),
        'firstYearPlanEstimates': structuredClone(firstYearPlanEstimates_BASE),
    };
    repaymentSimulation.simulation = { 
        'totals': {
            'familyFederalTaxes':  0,
            'familyMinimumPayments': 0,
            'familyOverpayments': 0,
            'familyPaymentDuration': 0,
            'familyRemainingBalance': 0,
            'familyStartingBalance': borrowers.reduce((total, borrower) => total += initialBorrowerLoanSums[borrower], 0),
            'familyTotalAccruedInterest': 0,
            'familyTotalInterestWaived': 0,
            'familyTotalPayments': 0,
            'familyTotalPrincipalMatch': 0,
            'sameYearForgiveness': false
        }, 
        'monthlyStatistics': {}
    };
    borrowers.forEach(borrower => {
        const borrowerTotals = {
            'agi': basicInfo[borrower].agi,
            'annualGrowth': basicInfo[borrower].annualGrowth,
            'federalTaxes': 0,
            'minimumPayments': 0,
            'overpayments': 0,
            'paymentDuration': 0,
            'pslfEligible': basicInfo[borrower].pslfEligible,
            'remainingBalance': 0,
            'repaymentPlan': basicInfo[borrower].repaymentPlan,
            'startingBalance': initialBorrowerLoanSums[borrower],
            'status': 'unpaid',
            'totalAccruedInterest': 0,
            'totalInterestWaived': 0,
            'totalPayments': 0,
            'totalPrincipalMatch': 0
        }
        repaymentSimulation.simulation.totals[borrower] = borrowerTotals;
    });

    let initialFamilyMinimumPayment = 0;
    let initialFamilyRemainingBalance = 0;
    const monthlyTemplate = {
        'familyMinimumPayment': 0,
        'familyRemainingBalance': 0,
        'familyTotalAccruedInterest': 0,
        'familyTotalInterestWaived': 0,
        'familyTotalOverpayment': 0,
        'familyTotalPayments': 0,
        'familyTotalPrincipalMatch': 0,
        'remainingLoans': structuredClone(loans)
    }
    borrowers.forEach(borrower => {
        const borrowerMonthly = {
            'agi': basicInfo[borrower].agi,
            'interestWaived': 0,
            'minimumPayment': 0,
            'monthlyInterest': 0,
            'monthlyOverpayment': 0,
            'principalMatch': 0,
            'remainingBalance': 0,
            'totalAccruedInterest': 0,
            'totalPayments': 0,
            'totalInterestWaived': 0,
            'totalPrincipalMatch': 0
        }
        monthlyTemplate[borrower] = borrowerMonthly;
        initialFamilyMinimumPayment += borrowerMonthly.minimumPayment;
        initialFamilyRemainingBalance += borrowerMonthly.remainingBalance;
    });
    repaymentSimulation.simulation.monthlyStatistics['0'] = structuredClone(monthlyTemplate);
    repaymentSimulation.simulation.monthlyStatistics['0'].familyMinimumPayment = initialFamilyMinimumPayment;
    repaymentSimulation.simulation.monthlyStatistics['0'].familyRemainingBalance = initialFamilyRemainingBalance;


    /* -------------------- MONTHLY REPAYMENT LOOP -------------------- */
    let year = 0;
    let month = 0;
    let borrowersProcessed = 0;
    let remainingPayments = borrowers.reduce((max, borrower) => Math.max(max, getRemainingPayments(basicInfo, borrower)), 0);

    const simulation = repaymentSimulation.simulation;
    const totals = simulation.totals;
    const monthlyStatistics = simulation.monthlyStatistics;
    while (remainingPayments && borrowersProcessed !== borrowers.length) {
        month++;
        monthlyStatistics[month] = structuredClone(monthlyTemplate);
        const thisMonthSimulation = monthlyStatistics[month];

        // Anually recertify IDR - updates borrower income, overpayments and redistributes new monthly payments
        borrowers.forEach(borrower => { borrowerOverpayments[borrower].monthlyOverpayment = basicInfo[borrower].monthlyOverpayment});
        if (month > 12 && month % 12 === 1 ) {
            year++;
            borrowers.forEach(borrower => {
                const income = basicInfo[borrower].agi;
                const growth = basicInfo[borrower].annualGrowth / 100 + 1;
                const newAGI = income * growth; 
                basicInfo[borrower].agi = newAGI;
                
                const currentOverpayment = borrowerOverpayments[borrower].monthlyOverpayment;
                const overpaymentRatio = borrowerOverpayments[borrower].ratio;
                const newBorrowerMonthlyOverpayment = Math.max(newAGI * overpaymentRatio, currentOverpayment);
                borrowerOverpayments[borrower].monthlyOverpayment = newBorrowerMonthlyOverpayment;
                basicInfo[borrower].monthlyOverpayment = newBorrowerMonthlyOverpayment;
            });

            // This may return less borrowers than borrowers in loans - pain in full borrowers are filtered by the function
            // Do not want to remove borrower keys in the loans object as it is used throughout the loop to document totals
            const recertifiedBorrowers = calculateMinimumPayments(basicInfo, loans, year, firstYearPlanEstimates);
            Object.keys(recertifiedBorrowers).forEach(borrower => {
                const monthlyPayment = recertifiedBorrowers[borrower][basicInfo[borrower].repaymentPlan];
                const borrowerLoanSum = getBorrowerLoanSum(loans[borrower]);
                distributeMinimumPayment(loans[borrower], borrowerLoanSum, monthlyPayment);
            })
        }

        // Apply interest and minimum payments first
        // Initial state required for RAP
        const initialLoanState = {};
        borrowers.forEach(borrower => {
            if (loans[borrower].length === 0) return;
            initialLoanState[borrower] = structuredClone(loans[borrower]);

            const borrowerAccrual = applyInterestAccrual(loans[borrower]);
            thisMonthSimulation[borrower].monthlyInterest = borrowerAccrual;

            const borrowerMinPayment = applyMinimumPayment(loans[borrower]);
            thisMonthSimulation[borrower].minimumPayment = borrowerMinPayment;
        });

        // RAP subsidy (interest waive/principal match) must be applied before overpayments
        borrowers.forEach(borrower => {
            if (initialLoanState[borrower].length === 0 || basicInfo[borrower].repaymentPlan !== 'rap') return;

            const waivedInterest = rapWaiveInterest(initialLoanState[borrower], loans[borrower]);
            thisMonthSimulation[borrower].interestWaived = waivedInterest;
            thisMonthSimulation[borrower].monthlyInterest -= waivedInterest;

            const minimumPayment = thisMonthSimulation[borrower].minimumPayment
            const principalMatch = rapPrincipalMatch(initialLoanState[borrower], loans[borrower], minimumPayment);
            thisMonthSimulation[borrower].principalMatch = principalMatch;
        });

        // Determine borrower overpayment pooling contribution if their loan sum is less than their overpayment
        // Required for all eligible borrowers at start of simulation
        borrowers.forEach(borrower => {
            const borrowerOverpayment = borrowerOverpayments[borrower].monthlyOverpayment;
            const borrowerLoanSum = getBorrowerLoanSum(loans[borrower]);
            if (borrowerLoanSum < borrowerOverpayment) borrowerOverpayments[borrower].toAddToPool = borrowerOverpayment - borrowerLoanSum;
        });

        // Overpayments - update overpayment amount if pooling is enabled and borrowers have added to the pool
        thisMonthSimulation.overpayedLoans = [];
        borrowers.forEach(borrower => {
            if (loans[borrower].length === 0) return;
            
            const poolOverpaymentsEnabled = basicInfo.poolOverpayments;
            const baseOverpayment = borrowerOverpayments[borrower].monthlyOverpayment;
            const poolContribution = borrowers.reduce((sum, b) => sum + (borrowerOverpayments[b].toAddToPool || 0), 0);
            const totalOverpayment = poolOverpaymentsEnabled ? (baseOverpayment + poolContribution) : baseOverpayment;
            let remainingOverpayment = totalOverpayment;

            while(repaymentOrders[borrower].length > 0 && remainingOverpayment >= 0.01) {
                const loanObject = repaymentOrders[borrower][0];
                const loanID = loanObject.id;
                const loan = loans[borrower][loanID];

                if (loan === undefined || totals[borrower].status !== 'unpaid') {
                    repaymentOrders[borrower].shift();
                    continue;
                }

                let remainingBalance = makePayment(remainingOverpayment, loan);
                thisMonthSimulation.overpayedLoans.push(loanObject);
                if (loan.principal === 0 && loan.interestAccrual === 0) {
                    deleteLoan(loans[borrower], loanID);
                    repaymentOrders[borrower].shift();
                }
                remainingOverpayment = (remainingBalance >= 0.01) ? remainingBalance : 0;
            }

            let appliedOverpayment = (remainingOverpayment >= 0.01) ? totalOverpayment - remainingOverpayment : totalOverpayment;
            thisMonthSimulation[borrower].monthlyOverpayment = appliedOverpayment;
        });

        // Update totals - globals first as monthly references snapshots from global
        borrowers.forEach(borrower => {
            const borrowerMinimumPayment    = thisMonthSimulation[borrower].minimumPayment;
            const borrowerOverpayment       = thisMonthSimulation[borrower].monthlyOverpayment;
            const borrowerMonthlyInterest   = thisMonthSimulation[borrower].monthlyInterest;
            const borrowerInterestWaived    = thisMonthSimulation[borrower].interestWaived;
            const borrowerPrincipalMatch    = thisMonthSimulation[borrower].principalMatch;
            const borrowerRemainingBalance  = getBorrowerLoanSum(loans[borrower]);

            // Global Borrower
            totals[borrower].minimumPayments        += borrowerMinimumPayment;
            totals[borrower].overpayments           += borrowerOverpayment;
            totals[borrower].totalAccruedInterest   += borrowerMonthlyInterest;
            totals[borrower].totalInterestWaived    += borrowerInterestWaived;
            totals[borrower].totalPayments          += borrowerMinimumPayment + borrowerOverpayment;
            totals[borrower].totalPrincipalMatch    += borrowerPrincipalMatch;

            // Monthly Borrower
            thisMonthSimulation[borrower].agi                   = basicInfo[borrower].agi;
            thisMonthSimulation[borrower].remainingBalance      = borrowerRemainingBalance;
            thisMonthSimulation[borrower].totalAccruedInterest  = totals[borrower].totalAccruedInterest;
            thisMonthSimulation[borrower].totalInterestWaived   = totals[borrower].totalInterestWaived;
            thisMonthSimulation[borrower].totalPayments         = totals[borrower].totalPayments;
            thisMonthSimulation[borrower].totalPrincipalMatch   = totals[borrower].totalPrincipalMatch;
            
            // Monthly Family
            thisMonthSimulation.familyMinimumPayment        += borrowerMinimumPayment;
            thisMonthSimulation.familyRemainingBalance      += borrowerRemainingBalance;
            thisMonthSimulation.familyTotalAccruedInterest  += totals[borrower].totalAccruedInterest;
            thisMonthSimulation.familyTotalInterestWaived   += totals[borrower].totalInterestWaived;
            thisMonthSimulation.familyTotalOverpayment      += borrowerOverpayment;
            thisMonthSimulation.familyTotalPayments         += totals[borrower].totalPayments;
            thisMonthSimulation.familyTotalPrincipalMatch   += totals[borrower].totalPrincipalMatch;

            // Handle borrowers finished with repayment
            if (totals[borrower].status === 'unpaid') {
                const paid = borrowerRemainingBalance === 0;
                const forgiven = month === getRemainingPayments(basicInfo, borrower);

                if (paid || forgiven) {
                    totals[borrower].status = (paid) ? 'paid' : 'forgiven';
                    totals[borrower].paymentDuration = month;

                    // Required to clear borrower loans/repayment orders to not affect family sums used during recertification
                    // Do not want to remove borrower as that will mess up totals/overpayment processing
                    while(repaymentOrders[borrower].length > 0) { 
                        repaymentOrders[borrower].pop(); 
                    }
                    const borrowerLoanKeys = Object.keys(loans[borrower]);
                    borrowerLoanKeys.forEach(key => { delete loans[borrower][key]; });
                    borrowersProcessed++;
                }
            }
        });
        thisMonthSimulation.remainingLoans = structuredClone(loans);
        
        remainingPayments--;
    }


    /* -------------------- TAX BOMB & GLOBAL TOTALS-------------------- */
    let previousBorrowerBalance = 0;
    let previousBorrowerForgivenessYear = 0;
    borrowers.forEach(borrower => {
        const forgivenessMonth = Math.min(month, getRemainingPayments(basicInfo, borrower));
        const forgivenessYear = Math.floor(forgivenessMonth / 12);
        const remainingBalance = monthlyStatistics[forgivenessMonth][borrower].remainingBalance;

        // Tax Bomb
        const sameYearForgiveness = forgivenessYear === previousBorrowerForgivenessYear && totals[borrower].status === 'forgiven';
        const taxBomb = getBorrowerTaxBomb(basicInfo, remainingBalance, borrowers, borrower, forgivenessYear, sameYearForgiveness, previousBorrowerBalance);
        const taxedForgiveness = (basicInfo[borrower].pslfEligible) ? 0 : taxBomb;
        previousBorrowerBalance = remainingBalance;
        previousBorrowerForgivenessYear = forgivenessYear;

        // Global Borrower Totals
        totals[borrower].agi                = basicInfo[borrower].agi;
        totals[borrower].federalTaxes       = taxedForgiveness;
        totals[borrower].remainingBalance   = remainingBalance;
        totals[borrower].totalPayments      += taxedForgiveness;

        // Global Family Totals
        const borrowerMinimumPayments       = totals[borrower].minimumPayments;
        const borrowerOverpayments          = totals[borrower].overpayments;
        totals.sameYearForgiveness          = sameYearForgiveness;
        totals.familyPaymentDuration        = month;
        totals.familyFederalTaxes           += taxedForgiveness;
        totals.familyMinimumPayments        += borrowerMinimumPayments;
        totals.familyOverpayments           += borrowerOverpayments;
        totals.familyTotalPayments          += totals[borrower].totalPayments;
        totals.familyRemainingBalance       += totals[borrower].remainingBalance;
        totals.familyTotalAccruedInterest   += totals[borrower].totalAccruedInterest;
        totals.familyTotalInterestWaived    += totals[borrower].totalInterestWaived;
        totals.familyTotalPrincipalMatch    += totals[borrower].totalPrincipalMatch;
    });
    
    return repaymentSimulation;
}

/* -------------------------------------------------
    SIMULATE REPAYMENT FUNCTIONS
------------------------------------------------- */
function distributeMinimumPayment(borrowerLoans, borrowerLoanSum, paymentToDisperse, loanPayoff = false) {
	let remainingToDisperse = paymentToDisperse;
	let lastID;
	for (const loanID in borrowerLoans) {
		const loan = borrowerLoans[loanID];
		const loanBalance = loan.principal + loan.interestAccrual;
		const portionToDisperse = (borrowerLoanSum > 0) ? (loanBalance / borrowerLoanSum * paymentToDisperse) : 0;

		const currentMinPayment = (loan.minPayment) ? (loan.minPayment) : 0;
		loan.minPayment = (loanPayoff) ? (currentMinPayment + portionToDisperse) : portionToDisperse;
		remainingToDisperse -= portionToDisperse;
		lastID = loanID;
	}
	if (remainingToDisperse && lastID) {
		borrowerLoans[lastID].minPayment += remainingToDisperse;
	}
}

function applyInterestAccrual(loans) {
	let accruedInterest = 0;
	for (const loanID in loans) {
		const loan = loans[loanID];
		const principal = loan.principal;
		const rate = loan.interestRate / 100;

		const newAccrual = principal * rate / 12;
		loan.interestAccrual += newAccrual;
		accruedInterest += newAccrual;
	}
	return accruedInterest;
}

function applyMinimumPayment(loans) {
	const minimumPayments = {};
	for (const loanID in loans) {
		minimumPayments[loanID] = loans[loanID].minPayment;
	}
	const totalMinPayment = makeMultiplePayments(minimumPayments, loans);
	return totalMinPayment;
}

function makeMultiplePayments(payments, loans) {
	let totalPayment = 0;
	for (const loanID in payments) {
		let loan = loans[loanID];
		if (loan === undefined) continue;
		const payment = payments[loanID];
		
		let currentID = loanID;
		let remainingPayment = payment;
		while (remainingPayment >= 0.01) {
			remainingPayment = makePayment(remainingPayment, loan);
			if (remainingPayment >= 0.01) {
				deleteLoan(loans, currentID);
				currentID = findNextLoan(loans);
				if (currentID === null) break;
				loan = loans[currentID];
			}
		}
		totalPayment += payment - remainingPayment;
	}
	return totalPayment;
}

function makePayment(payment, loan) {
	let remainingPayment = payment;
	let accruedInterest = loan.interestAccrual;

	if (accruedInterest > remainingPayment) {
		loan.interestAccrual -= remainingPayment;
		remainingPayment = 0;
	} else {
		remainingPayment -= loan.interestAccrual;
		loan.interestAccrual = 0;

		let principal = loan.principal;
		if (principal > remainingPayment) {
			loan.principal -= remainingPayment;
			remainingPayment = 0;
		} else {
			remainingPayment -= loan.principal;
			loan.principal = 0;
		}
	}
	return remainingPayment;
}

// Servicers prioritize unsubsidized and highest interest loans for remainder of payment.
// Tie breakers in the instance of same loan type and rate is at servicer discretion.
// As user input does not allow loan type, highest interest with highest balance is prioritized.
function findNextLoan(loans) {
	if (Object.keys(loans).length === 0) return null;

	let nextLoan = null;
	for (const loan in loans) {
		if (nextLoan === null) {
			nextLoan = loan;
			continue;
		}

		if (loans[loan].interestRate > loans[nextLoan].interestRate) {
			nextLoan = loan;
			continue;
		}

		const loanBalance = loans[loan].principal + loans[loan].interestAccrual;
		const nextLoanBalance = loans[nextLoan].principal + loans[nextLoan].interestAccrual;
		const equalInterest = loans[loan].interestRate === loans[nextLoan].interestRate;
		if (equalInterest && loanBalance > nextLoanBalance) {
			nextLoan = loan;
		}
	}
	return nextLoan;
}

function deleteLoan(borrowerLoans, loanID) {
	const loanToDelete = borrowerLoans[loanID];
	const minToDisperse = loanToDelete.minPayment;
	delete borrowerLoans[loanID];
	if (Object.keys(borrowerLoans).length === 0) return;

	const remainingSum = getBorrowerLoanSum(borrowerLoans);
	const loanPayoff = true;
	distributeMinimumPayment(borrowerLoans, remainingSum, minToDisperse, loanPayoff);
}

function rapWaiveInterest(initialLoanState, currentLoans) {
	let waivedInterest = 0;

	const initialLoanKeys = Object.keys(initialLoanState);
	for (let i = 0; i < initialLoanKeys.length; i++) {
		const key = initialLoanKeys[i];
		if (currentLoans[key] === undefined) continue;

		const initialInterest = initialLoanState[key].interestAccrual;
		const currentInterest = currentLoans[key].interestAccrual;
		const diff = currentInterest - initialInterest;
		if (diff > 0) {
			waivedInterest += diff;
			currentLoans[key].interestAccrual = initialInterest;
		}
	}

	return waivedInterest;
}

function rapPrincipalMatch(initialLoanState, currentLoans, minimumPayment) {
	const initialPrincipalSum = Object.entries(initialLoanState).reduce((total,loan) => {
		return total += loan[1].principal; },0);
	const currentPrincipalSum = Object.entries(currentLoans).reduce((total,loan) => {
		return total += loan[1].principal; },0);
	const principalDiff = initialPrincipalSum - currentPrincipalSum;
	const principalMatch = (principalDiff < 50) ? Math.min(50, Math.max(0, minimumPayment - principalDiff)) : 0;
	if (principalMatch <= 0) return 0;

	const matchPortions = {};
	for (const loanID in currentLoans) {
		const loan = currentLoans[loanID];
		const portionToMatch = (currentPrincipalSum === 0) ? 0 :  loan.principal / currentPrincipalSum;
		matchPortions[loanID] = portionToMatch * principalMatch;
	}

	const actualMatch = makeMultiplePayments(matchPortions, currentLoans);
	return actualMatch;
}
