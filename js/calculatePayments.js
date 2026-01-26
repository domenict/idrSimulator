/* -------------------------------------------------
    GLOBAL VARIABLES / PROTOTYPES (F0R 2026)
------------------------------------------------- */
// Update annually via https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
const BASE_POVERTY = { ak: 19550, hi: 17990, us: 15650 };
const INCREMENT_POVERTY = { ak: 6880, hi: 6330, us: 5500 };
const CPI_U_MULTIPLIER = 1.028; // "Consumer Price Index for All Urban Consumers" estimate for next 30 years
const IRS_LOAN = { 'rate': 0.07, 'monthlyPenalty': 0.0025, 'maxDuration': 72 };
const STANDARD_DEDUCTIONS = {
    'SINGLE'    : 16100,
    'HOH'       : 24150,
    'MARRIED'   : 32200,
}
const INCOME_BRACKETS = {
    'single': [
        {'min': 0,          'max': 12400,       'rate': 0.10 },
        {'min': 12401,      'max': 50400,       'rate': 0.12 },
        {'min': 50401,      'max': 105700,      'rate': 0.22 },
        {'min': 105701,     'max': 201775,      'rate': 0.24 },
        {'min': 201776,     'max': 256225,      'rate': 0.32 },
        {'min': 256226,     'max': 640600,      'rate': 0.35 },
        {'min': 640601,     'max': Infinity,    'rate': 0.37 },
    ],
    'married': [
        {'min': 0,          'max': 24800,       'rate': 0.10 },
        {'min': 24801,      'max': 100800,      'rate': 0.12 },
        {'min': 100801,     'max': 211400,      'rate': 0.22 },
        {'min': 211401,     'max': 403550,      'rate': 0.24 },
        {'min': 403551,     'max': 512450,      'rate': 0.32 },
        {'min': 512451,     'max': 768700,      'rate': 0.35 },
        {'min': 768701,     'max': Infinity,    'rate': 0.37 },
    ]
}

Object.defineProperty(Number.prototype, 'roundDecimals', {
    value: function(places) {
        const offset = Math.pow(10, places);
        return Math.round(this * offset) / offset; 
    },
    enumerable: false
});

/* -------------------------------------------------
    MAIN
------------------------------------------------- */
function calculatePayments(data) {
    const basicInfo = { 'self': {}};
    const loans     = { 'self': {}};
    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
        return obj; 
    }, {});

    try {
        const inputValidated = inputValidation(sortedData, basicInfo, loans); //basicInfo & loans populated with user input
        if (!inputValidated) throw new Error('Input validation failure');
        
        //Function adds/modifies loans object with minimum payment of each loan
        const firstYearPlanEstimates = calculateMinimumPayments(basicInfo, loans);

        // Outputs repayment orders likely to result in minimizing total loan payment over the life of the loans
        // This is only generated once with base user input and is not updated as repayment is simulated
        // Heuristics:
        //      Avalanche: Lowest Balance   - Highest interest rate, lowest balance
        //      Immediate Bleed             - Prioritizes loan generating the most interest
        //      Snowball                    - Prioritizes loan with the lowest balance
        //      Highest Minimum Payment     - Prioritizes loan with the largest minimum payment
        const repaymentOrders = getRepaymentOrders(loans);

        const simulatedPayments = simulateRepayment(basicInfo, loans, repaymentOrders, firstYearPlanEstimates);
        console.log(`SIMULATED OUTPUT: ${new Date()}`);
        console.log(simulatedPayments);
    
        return JSON.stringify(new Date());
    } catch (err) {
        console.log(err);
        return 'There was an error processing your request.\nPlease refresh the page and try again.';
    }
}


/* -------------------------------------------------
    INPUT VALIDATION
------------------------------------------------- */
function inputValidation(data, basicInfo, loans) {
    // If type === boolean -> [key, "boolean" as string, array where index 0 is false and index 1 is true]
    // If type === string -> [key, "string" as string, array of valid strings]
    // If type === number -> [key, "number" as string, specify float/integer as string, min, max]
    // "marriedDependent" or "spouseHasLoansDependent" appended as last index if applicable
    const marriedMap = [["married", "boolean", ["no","yes"]]];
    const spouseHasLoansMap = [["spouseHasLoans", "boolean", ["no", "yes"], "marriedDependent"]];
    const primaryInputMap = [
        ["self_repaymentPlan", "string", ["old", "new", "rap"]],
        ["spouse_repaymentPlan", "string", ["old", "new", "rap"], "spouseHasLoansDependent"],
        ["self_pslfEligible", "boolean", ["no","yes"]],
        ["spouse_pslfEligible", "boolean", ["no","yes"], "spouseHasLoansDependent"],
        ["dependents", "number", "integer", 0, 97]
    ];
    const secondaryInputMap = [
        ["self_agi", "number", "float", 0, 999999999.99],
        ["self_annualGrowth", "number", "float", 0, 99.99],
        ["self_monthlyOverpayment", "number", "float", 0, 999999999.99],
        ["self_fixedOverpayments", "boolean", ["no","yes"]],
        ["self_qualifiedPayments", "number", "integer", 0, 360],
        ["self_interestReduction", "boolean", ["no", "yes"]], 
        ["self_standardCap", "number", "float", 0, 999999999.99],
        ["familySize", "number", "integer", 1, 99],
        ["residency", "string", ["us", "ak", "hi"]], 
        ["filingJointly", "boolean", ["no", "yes"], "marriedDependent"],
        ["poolOverpayments", "boolean", ["no", "yes"], "spouseHasLoansDependent"],
        ["spouse_agi", "number", "float", 0, 999999999.99, "marriedDependent"],
        ["spouse_annualGrowth", "number", "float", 0, 99.99, "marriedDependent"],
        ["spouse_monthlyOverpayment", "number", "float", 0, 999999999.99, "spouseHasLoansDependent"],
        ["spouse_fixedOverpayments", "boolean", ["no","yes"], "spouseHasLoansDependent"],
        ["spouse_qualifiedPayments", "number", "integer", 0, 360, "spouseHasLoansDependent"],
        ["spouse_interestReduction", "boolean", ["no", "yes"], "spouseHasLoansDependent"],
        ["spouse_standardCap", "number", "float", 0, 999999999.99, "spouseHasLoansDependent"]
    ];

    // Other maps in validation
    const loanInputMap = [
        ["principalID-placeholder", 0.01, 999999.99], 
        ["interestID-placeholder", 0, 999999.99], 
        ["rateID-placeholder", 0, 99.99]
    ];
    const planMap = ["old", 300, "new", 240, "rap", 360];

    /* -------------------- VALIDATION STARTS HERE -------------------- */
    // married and spouseHasLoans first due to dependencies 
    let married = false;
    let spouseHasLoans = false;
    let pass = validateInputMap(marriedMap);
    if (!pass) return false;
    if (basicInfo.married) {
        married = true;
        basicInfo.spouse = {};
    }
    pass = validateInputMap(spouseHasLoansMap);
    if (!pass) return false;
    if (basicInfo.spouseHasLoans) {
        spouseHasLoans = true;
        loans.spouse = {};
    }

    // primaryInputMap next, modifies secondary map
    pass = validateInputMap(primaryInputMap);
    if (!pass) return false;
    if (basicInfo.dependents || married) {
        const familySizeIndex = getInputMapIndex(secondaryInputMap, "familySize");
        secondaryInputMap[familySizeIndex][3] = 1 + basicInfo.dependents;
        if (married) secondaryInputMap[familySizeIndex][3]++;
    }
    updateBorrowerQualifiedPaymentMax(basicInfo, "self", "self_repaymentPlan", "self_qualifiedPayments", planMap);
    if (married) updateBorrowerQualifiedPaymentMax(basicInfo, "spouse", "spouse_repaymentPlan", "spouse_qualifiedPayments", planMap);

    // All remaining except loans in secondaryInputMap
    pass = validateInputMap(secondaryInputMap);
    if (!pass) return false;

    // Filter non-loan keys and extract loan data, return result
    let remainingKeys = filterRemainingKeys(data);
    if (!remainingKeys) return false;
    pass = extractLoanData(remainingKeys, loanInputMap);
    return pass;

    /* -------------------------------------------------
        INPUT VALIDATION FUNCTIONS
    ------------------------------------------------- */
    function validateInputMap(inputMap) {
        for (let i = 0; i < inputMap.length; i++) {
            const key = inputMap[i][0];
            const value = data[key];
            const dependency = inputMap[i][inputMap[i].length-1];
            if (!married && dependency === "marriedDependent") continue;
            if (!spouseHasLoans && dependency === "spouseHasLoansDependent") continue;
            if (value === undefined) return false;

            let writeValue, values, booleanValue, numberType, parsedValue, min, max;
            const type = inputMap[i][1];
            switch(type) {
                case "boolean":
                    values = inputMap[i][2];
                    booleanValue = values.indexOf(value);
                    if (booleanValue >= 0) {
                        writeValue = Boolean(booleanValue);
                    } else {
                        return false;
                    }
                    break;
                case "string":
                    values = inputMap[i][2];
                    if (values.indexOf(value) === -1) {
                        return false;
                    } else {
                        writeValue = value;
                    }
                    break;
                case "number":
                    parsedValue = value.strToNum();
                    if (isNaN(parsedValue)) return false;

                    numberType = inputMap[i][2];
                    if (numberType === "float" && value.split('.')[1].length !== 2) return false;
                    if (numberType === "integer" && parsedValue % 1 !== 0) return false;
    
                    min = inputMap[i][3];
                    max= inputMap[i][4];
                    if (parsedValue < min || parsedValue > max) {
                        return false;
                    } else {
                        writeValue = parsedValue;
                    }
                    break;
            }

            if (key.indexOf("self") !== -1) {
                basicInfo.self[key.split("_")[1]] = writeValue;
            } else if (key.indexOf("spouse_") !== -1) {
                basicInfo.spouse[key.split("_")[1]] = writeValue;
            } else {
                basicInfo[key] = writeValue;
            }
            delete data[key];
        }
        return true;
    }

    function getInputMapIndex(array, key) {
        let i = 0;
        while (i < array.length) {
            if (array[i][0] === key) return i;
            i++;
        }
    }

    function updateBorrowerQualifiedPaymentMax(basicInfo, borrower, planKey, paymentsKey, planMap) {
        const paymentsKeyIndex = getInputMapIndex(secondaryInputMap, paymentsKey);
        const borrowerPlan = basicInfo[borrower][planKey];
        const newMaxIndex = planMap.indexOf(borrowerPlan) + 1;
        const pslfEligible = basicInfo[borrower].pslfEligible;
        secondaryInputMap[paymentsKeyIndex][4] = (pslfEligible) ? 120 : planMap[newMaxIndex];
    }

    function filterRemainingKeys(data) {
        let unsortedRemainingKeys = Object.keys(data); // Needs to be sorted how we need it, currently sorted lexicographically
        let remainingKeys = unsortedRemainingKeys.sort((a, b) => { 
            const isValidFormat = (str) => {
                const pattern = /^(self|spouse)_loan\d+_(interest|principal|rate)$/;
                return pattern.test(str);
            };
            if (!isValidFormat(a) || !isValidFormat(b)) {
                return false;
            }
    
            const [prefixA, loanA, suffixA] = a.split('_');
            const [prefixB, loanB, suffixB] = b.split('_');  
            const numA = parseInt(loanA.replace('loan', ''), 10);
            const numB = parseInt(loanB.replace('loan', ''), 10);
            
            if (prefixA !== prefixB) {
                return prefixA.localeCompare(prefixB);
            }
            if (numA !== numB) {
                return numA - numB;
            }
            return suffixA.localeCompare(suffixB);
        });
        return remainingKeys;
    }

    function extractLoanData(remainingKeys, loanInputMap) {
        while (remainingKeys.length > 0) {
            const splitKey = remainingKeys[0].split("_");
            const loanNumber = splitKey[1].replace('loan', '');
            const borrower = splitKey[0];
            if (borrower !== "self" && borrower !== "spouse") return false;
            if (borrower === "spouse" && !married) return false;
            if (borrower === "spouse" && !spouseHasLoans) return false;
            
            const expectedID = borrower + "_loan" + loanNumber;
            const interestID = expectedID + "_interest";
            const principalID = expectedID + "_principal";
            const rateID = expectedID + "_rate";
            if (remainingKeys[0] !== interestID || remainingKeys[1] !== principalID || remainingKeys[2] !== rateID) {
                return false;
            }
            
            const principalValue = data[principalID].strToNum();
            const interestValue = data[interestID].strToNum();
            const rateValue = data[rateID].strToNum();
            const loan = [principalValue, interestValue, rateValue];
            const loanValidationMap = [
                [principalID, loanInputMap[0][1], loanInputMap[0][2]], 
                [interestID, loanInputMap[1][1], loanInputMap[1][2]], 
                [rateID, loanInputMap[2][1], loanInputMap[2][2]]
            ];
            for (let i = 0; i < loan.length; i++) {
                let element = loan[i];
                if (isNaN(element)) return false;
                if (element.numToStr(data[loanValidationMap[i][0]]) !== data[loanValidationMap[i][0]]) return false;
                if (element < loanValidationMap[i][1] || element > loanValidationMap[i][2]) return false;
            }

            loans[borrower][loanNumber] = {
                principal: loan[0],
                interestAccrual: loan[1],
                interestRate: loan[2]
            };
            remainingKeys.splice(0,3);
        } 
        return true;
    }
}


/* -------------------------------------------------
    IDR CERTIFICATION
------------------------------------------------- */
// Married Filing Jointly = Combined AGI prorated to share of the total debt
// Married Filing Separately = Individual responsibility, both share family size input - if both are borrowers, borrower with higher AGI claims dependents
function calculateMinimumPayments(basicInfo, loans, year = 0, firstYearPlanEstimates) {
    const saveToHistory = {};
    const isMarried = basicInfo.married;
    const filingJointly = basicInfo.filingJointly;

    const borrowers = Object.keys(loans);
    const householdAGI = borrowers.reduce((total, borrower) => total += basicInfo[borrower].agi, 0);
    const greaterAGI = (isMarried) ? (basicInfo.self.agi >= basicInfo.spouse.agi) ? 'self' : 'spouse' : 'self';
    const loanSums = borrowers.reduce((total, borrower) => {
        total[borrower] = getBorrowerLoanSum(loans[borrower]);
        return total;
    }, {});
    const householdLoanSum = Object.values(loanSums).reduce((total, borrowerSum) => total += borrowerSum, 0);

    borrowers.forEach(borrower => {
        const borrowerLoans = loans[borrower];
        const borrowerPlan = basicInfo[borrower].repaymentPlan;
        const borrowerPreviousSTDPayment = (firstYearPlanEstimates !== undefined) ? firstYearPlanEstimates[borrower].std : null;
        const borrowerStandardCap = basicInfo[borrower].standardCap;

        const familySize = basicInfo.familySize;
        const residency = basicInfo.residency;
        const dependents = basicInfo.dependents;
        const borrowerPovertyLine = calculatePovertyGuidelines(familySize, residency, year);

        let borrowerAGI = basicInfo[borrower].agi;
        let borrowerPortionOfPayment = 1;
        let borrowerDependents = dependents;
        if (isMarried) {
            if (filingJointly) {
                borrowerAGI = householdAGI;
                borrowerPortionOfPayment = (householdLoanSum > 0) ? loanSums[borrower] / householdLoanSum : 0.5;
            } else {
                dependents = (borrower === greaterAGI || borrowers.length === 1) ? dependents : 0;
            }
        }

        const planOptions = calculatePaymentPlans(borrowerLoans, borrowerAGI, borrowerPortionOfPayment, borrowerPovertyLine, borrowerDependents, borrowerStandardCap, borrowerPreviousSTDPayment);
        saveToHistory[borrower] = planOptions;
        const monthlyPayment = planOptions[borrowerPlan];
        distributeMinimumPayment(borrowerLoans, loanSums[borrower], monthlyPayment);
    });

    return saveToHistory;


    /* -------------------------------------------------
        IDR CERTIFICATION FUNCTIONS
    ------------------------------------------------- */
    function calculatePovertyGuidelines(familySize = 1, residency = 'us', years = 0) {
        const res = residency.toLowerCase();
        const base = BASE_POVERTY[res];
        const inc = INCREMENT_POVERTY[res];
    
        const amount = base + (familySize - 1) * inc;
        const multiplier = Math.pow(CPI_U_MULTIPLIER, years);
        return Math.round(amount * multiplier);
    }
    
    function calculatePaymentPlans(borrowerLoans, AGI, portionOfPayment, povertyLine, dependents, standardCap, previousSTDPayment) {
        const oldIBR = (agi, pov) => { return Math.max(0, agi - pov * 1.5) * 0.15 / 12; }
        const newIBR = (agi, pov) => { return Math.max(0, agi - pov * 1.5) * 0.10 / 12; }
        const rap = (agi, deps) => {
            const rate = Math.min(0.10, Math.floor(agi / 10000) / 100);
            const baseAnnual = agi * rate;
            const proratedAnnual = baseAnnual * portionOfPayment; // As of Nov 2025, RAP is prorated for married filing jointly
            const monthlyPayment = (proratedAnnual / 12) - (50 * deps); // As of Nov 2025, borrower level reduction
            return Math.max(10, monthlyPayment); // $10 minimum monthly payment
        }
        const std = (loans, standardCap, previousSTDPayment) => {
            if (standardCap) return standardCap;
            if (previousSTDPayment) return previousSTDPayment;

            let totalMonthly = 0;
            for (const id in loans) {
                const { principal, interestAccrual, interestRate } = loans[id];
                const capitalized = principal + interestAccrual;
                const rate = interestRate / 100;
                totalMonthly += capitalized * (rate / 12) / (1 - Math.pow(1 + rate / 12, -120));
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
function distributeMinimumPayment(borrowerLoans, borrowerLoanSum, paymentToDisperse) {
    let remainingToDisperse = paymentToDisperse;
    let lastID;
    for (const loanID in borrowerLoans) {
        const loan = borrowerLoans[loanID];
        const loanBalance = loan.principal + loan.interestAccrual;
        const portionToDisperse = (borrowerLoanSum > 0) ? (loanBalance / borrowerLoanSum * paymentToDisperse).roundDecimals(2) : 0;

        const currentMinPayment = (loan.minPayment) ? (loan.minPayment) : 0;
        loan.minPayment = (currentMinPayment + portionToDisperse).roundDecimals(2);
        remainingToDisperse -= portionToDisperse;
        lastID = loanID;
    }
    if (remainingToDisperse) {
        borrowerLoans[lastID].minPayment = (borrowerLoans[lastID].minPayment + remainingToDisperse).roundDecimals(2);
    }
}


/* -------------------------------------------------
    HEURISTIC REPAYMENT ORDERING
------------------------------------------------- */
function getRepaymentOrders(loans) { 
    const findAvalanche = (loanPool) => (loanPool.sort((a,b) => {
        if (b.data.interestRate !== a.data.interestRate) {
            return b.data.interestRate - a.data.interestRate;
        }

        const aBalance = a.data.principal + a.data.interestAccrual;
        const bBalance = b.data.principal + b.data.interestAccrual;
        return aBalance - bBalance;
    }));

    const findImmediateBleed = (loanPool) => (loanPool.sort((a,b) => {
        const aAccrual = (a.data.interestRate / 100 * a.data.principal);
        const bAccrual = (b.data.interestRate / 100 * b.data.principal);
        return bAccrual - aAccrual;
    }));

    const findSnowball = (loanPool) => (loanPool.sort((a,b) => {
        const aBalance = a.data.principal + a.data.interestAccrual;
        const bBalance = b.data.principal + b.data.interestAccrual;
        return aBalance - bBalance;
    }));
    
    const findHighestMinPayment = (loanPool) => (loanPool.sort((a,b) => {
        return b.data.minPayment - a.data.minPayment;
    }));

    
    /* -------------------- REPAYMENT ORDER HEURISTICS STARTS HERE -------------------- */
    const borrowers = Object.keys(loans);
    const repaymentOrders = {};
    const heuristics = {
        avalanche: findAvalanche,
        debtSnowball: findSnowball,
        immediateBleed: findImmediateBleed,
        highestMinPayment: findHighestMinPayment
    };
    Object.keys(heuristics).forEach(hKey => {
        repaymentOrders[hKey] = {};
        borrowers.forEach(borrower => {
            const borrowerLoans = Object.entries(loans[borrower]).map(([id, val]) => ({id, owner: borrower, data: val}));
            const borrowerSortedLoans = heuristics[hKey]([...borrowerLoans]);
            borrowerSortedLoans.forEach(loan => { delete loan.data });
            repaymentOrders[hKey][borrower] = borrowerSortedLoans;
        });
    });
    return repaymentOrders;
} 


/* -------------------------------------------------
    SIMULATE REPAYMENT
------------------------------------------------- */
function simulateRepayment(basicInfo_BASE, loans_BASE, repaymentOrders_BASE, firstYearPlanEstimates_BASE) {
    let optimalHeuristic = null;
    const repaymentSimulations = {};
    const borrowers = Object.keys(loans_BASE);
    const monthlyOverpaymentProportion = getMonthlyOverpaymentProportion(basicInfo_BASE);
    
    // input args are deeply cloned as they may be modified throughout simulation
    const firstYearPlanEstimates = structuredClone(firstYearPlanEstimates_BASE);
    const repaymentOrders = structuredClone(repaymentOrders_BASE);
    Object.entries(repaymentOrders).forEach(currentOrder => {
        const basicInfo = structuredClone(basicInfo_BASE);
        const loans = structuredClone(loans_BASE);

        // Apply interest reduction now instead of earlier for accurate firstYearPlanEstimates
        borrowers.forEach(borrower => {
            const interestReduction = basicInfo[borrower].interestReduction;
            if (interestReduction) {
                for (const loanID in loans[borrower]) {
                    const rate = loans[borrower][loanID].interestRate;
                    loans[borrower][loanID].interestRate = Math.max(0, rate - 0.25);
                }
            }
        })

        // Explicit creation of the JSON structures for each heuristic simulation.
        // This allows storing baselines as the 0th month.
        // Totals are modified throughout simulation. 
        // Monthly template is copied and modified each month into simulatedPayments.
        let order = currentOrder[1];
        const orderID = currentOrder[0];
        repaymentSimulations[orderID] = { 
            'repaymentStrategy': orderID, 
            'repaymentOrder': structuredClone(order),
            'totals': {
                'familyFederalTaxes':  0,
                'familyForgiveness': 0,
                'familyIRSSixYearLoanInterestAccrual': 0,
                'familyPaymentDuration': 0,
                'familyRemainingBalance': 0,
                'familyTotalAccruedInterest': 0,
                'familyTotalInterestWaived': 0,
                'familyTotalPayments': 0,
                'familyTotalPrincipalMatch': 0,
                'sameYearForgiveness': false
            }, 
            'simulatedPayments': {},
            'firstYearPlanEstimates': structuredClone(firstYearPlanEstimates),
        };
        const totals = repaymentSimulations[orderID].totals;
        const simulatedPayments = repaymentSimulations[orderID].simulatedPayments;

        const monthlyTemplate = {
            'familyMinimumPayment': 0,
            'familyRemainingBalance': 0,
            'familyTotalAccruedInterest': 0,
            'familyTotalInterestWaived': 0,
            'familyTotalPayments': 0,
            'familyTotalPrincipalMatch': 0,
            'loans': structuredClone(loans),
            'minimumPayments': structuredClone(firstYearPlanEstimates),
            'monthlyOverpayment': basicInfo.monthlyOverpayment
        }
        borrowers.forEach(borrower => {
            const borrowerTotals = {
                'agi': basicInfo[borrower].agi,
                'federalTaxes': 0,
                'forgiveness': 0,
                'irsSixYearLoanInterestAccrual': 0,
                'paymentDuration': 0,
                'pslfEligible': basicInfo[borrower].pslfEligible,
                'remainingBalance': 0,
                'status': 'unpaid',
                'totalAccruedInterest': 0,
                'totalInterestWaived': 0,
                'totalPayments': 0,
                'totalPrincipalMatch': 0
            }
            const borrowerMonthly = {
                'agi': basicInfo[borrower].agi,
                'interestWaived': 0,
                'minimumPayment': firstYearPlanEstimates[borrower][basicInfo[borrower].repaymentPlan],
                'monthlyInterest': 0,
                'monthlyPayment': 0,
                'principalMatched': 0,
                'remainingBalance': 0,
                'totalAccruedInterest': 0,
                'totalPayments': 0,
                'totalInterestWaived': 0,
		        'totalPrincipalMatch': 0
            }

            const remainingPayments = getRemainingPayments(basicInfo, borrower);
            const loanSum = getBorrowerLoanSum(loans[borrower]);
            const loanCount = Object.keys(loans[borrower]).length;
            const borrowerStatus = (loanCount === 0) ? 
                'non-borrower' : (loanSum === 0) ? 
                'paid' : (remainingPayments === 0) ? 
                'forgiven' : 'unpaid';
            borrowerTotals.status = borrowerStatus;
            repaymentSimulations[orderID].totals[borrower] = borrowerTotals;
            monthlyTemplate[borrower] = borrowerMonthly;
        });
        repaymentSimulations[orderID].simulatedPayments['0'] = structuredClone(monthlyTemplate);

        
        // Monthly repayment loop
        let year = 0;
        let month = 0;
        let remainingPayments = getHighestRemainingPayments(basicInfo);
        let borrowersProcessed = borrowers.reduce((processed, borrower) => {
            let numberProcessed = processed
            if (repaymentSimulations[orderID].totals[borrower].status !== 'unpaid') numberProcessed++;
            return numberProcessed;
        }, 0);

        while (remainingPayments && borrowersProcessed != borrowers.length) {
            month++;
            simulatedPayments[month] = structuredClone(monthlyTemplate);
            const thisMonthSimulation = simulatedPayments[month];

            // Anually recertify IDR, update income based on income growth, and update monthlyOverpayment
            let monthlyOverpayment = basicInfo.monthlyOverpayment;
            if (month > 12 && month % 12 === 1 ) {
                year++;

                let familyIncome = 0;
                borrowers.forEach(borrower => {
                    const income = basicInfo[borrower].agi;
                    const growth = basicInfo[borrower].annualGrowth / 100 + 1;
                    const newAGI = income * growth; 
                    basicInfo[borrower].agi = newAGI.roundDecimals(2);
                    familyIncome += newAGI;
                });
                thisMonthSimulation.minimumPayments = calculateMinimumPayments(basicInfo, loans, year, firstYearPlanEstimates);

                if (!basicInfo.fixedOverpayments) {
                    const newMonthlyOverPayment = (familyIncome * monthlyOverpaymentProportion).roundDecimals(2);
                    monthlyOverpayment = (newMonthlyOverPayment > monthlyOverpayment) ? newMonthlyOverPayment : monthlyOverpayment;
                    basicInfo.monthlyOverpayment = monthlyOverpayment;
                }
            }
            
            // Get initial loan state, then apply interest accrual followed by minimum payments
            let familyMonthlyMinimumPayment = 0;
            const initialLoanState = {}; // Sort of important for RAP so dont forget about this guy
            borrowers.forEach(borrower => {
                thisMonthSimulation[borrower].agi = basicInfo[borrower].agi;
                initialLoanState[borrower] = structuredClone(loans[borrower]);

                if (totals[borrower].status === 'unpaid') {
                    let totalAccruedInterest = totals[borrower].totalAccruedInterest;
                    const borrowerAccrual = applyInterestAccrual(loans[borrower]);
                    thisMonthSimulation[borrower].monthlyInterest = borrowerAccrual.roundDecimals(2);
                    totals[borrower].totalAccruedInterest = (totalAccruedInterest + borrowerAccrual).roundDecimals(2);

                    let totalPayments = totals[borrower].totalPayments;
                    const borrowerMinPayment = applyMinimumPayment(loans[borrower]);
                    thisMonthSimulation[borrower].minimumPayment = borrowerMinPayment.roundDecimals(2);
                    thisMonthSimulation[borrower].monthlyPayment = thisMonthSimulation[borrower].minimumPayment;
                    totals[borrower].totalPayments = (totalPayments + borrowerMinPayment).roundDecimals(2);
                    familyMonthlyMinimumPayment = (familyMonthlyMinimumPayment + borrowerMinPayment).roundDecimals(2);
                } else {
                    thisMonthSimulation[borrower].monthlyInterest = 0;
                    thisMonthSimulation[borrower].minimumPayment = 0;
                }
            });

            // RAP interest waive then principal match - must be applied before overpayments
            borrowers.forEach(borrower => {
                if (basicInfo[borrower].repaymentPlan === 'rap') {
                    const monthlyInterest = thisMonthSimulation[borrower].monthlyInterest;
                    const totalAccruedInterest = totals[borrower].totalAccruedInterest;
                    const totalInterestWaived = totals[borrower].totalInterestWaived;
                    const waivedInterest = rapWaiveInterest(thisMonthSimulation[borrower], loans, borrower);
                    thisMonthSimulation[borrower].monthlyInterest = (monthlyInterest - waivedInterest).roundDecimals(2);
                    totals[borrower].totalAccruedInterest = (totalAccruedInterest - waivedInterest).roundDecimals(2);
                    thisMonthSimulation[borrower].interestWaived = waivedInterest.roundDecimals(2);
                    totals[borrower].totalInterestWaived = (totalInterestWaived + waivedInterest).roundDecimals(2);

                    const totalPrincipalMatch = totals[borrower].totalPrincipalMatch;
                    const principalMatch = rapPrincipalMatch(initialLoanState, thisMonthSimulation[borrower], loans, borrower);
                    thisMonthSimulation[borrower].principalMatch = principalMatch.roundDecimals(2);
                    totals[borrower].totalPrincipalMatch = (totalPrincipalMatch + principalMatch).roundDecimals(2);
                }
            });

            // Apply overpayment
            let remainingOverpayment = monthlyOverpayment;
            thisMonthSimulation.overpayedLoans = [];
            while(order.length > 0 && remainingOverpayment > 0.01) {
                const loanToApplyOverpayment = order[0];
                const loanOwner = loanToApplyOverpayment.owner;
                const loanID = loanToApplyOverpayment.id;
                const loan = loans[loanOwner][loanID];

                if (loan === undefined || totals[loanOwner].status !== 'unpaid') {
                    order.shift();
                    continue;
                }

                let borrowerTotalPayments = totals[loanOwner].totalPayments;
                let borrowerMonthlyPayment = thisMonthSimulation[loanOwner].monthlyPayment;
                let remainingBalance = makePayment(remainingOverpayment, loan);
                thisMonthSimulation.overpayedLoans.push(loanToApplyOverpayment);

                if (loan.principal === 0 && loan.interestAccrual === 0) {
                    deleteLoan(loans[loanOwner], loanID);
                    order.shift();
                }

                if (remainingBalance > 0.01) {
                    const diff = remainingOverpayment - remainingBalance;
                    totals[loanOwner].totalPayments = (borrowerTotalPayments + diff).roundDecimals(2);
                    thisMonthSimulation[loanOwner].monthlyPayment = (borrowerMonthlyPayment + diff).roundDecimals(2);
                    remainingOverpayment = remainingBalance;
                } else {
                    totals[loanOwner].totalPayments = (borrowerTotalPayments + remainingOverpayment).roundDecimals(2);
                    thisMonthSimulation[loanOwner].monthlyPayment = (borrowerMonthlyPayment + remainingOverpayment).roundDecimals(2);
                    remainingOverpayment = 0;
                }
            }
            if (remainingOverpayment > 0.01) monthlyOverpayment -= remainingOverpayment;

            // Update monthly values and totals
            let familyRemainingBalance      = 0;
            let familyTotalAccruedInterest  = 0;
            let familyTotalInterestWaived   = 0;
            let familyTotalPayments         = 0;
            let familyTotalPrincipalMatch   = 0;
            borrowers.forEach(borrower => {
                const borrowerRemainingBalance = getBorrowerLoanSum(loans[borrower]);
                thisMonthSimulation[borrower].remainingBalance      = borrowerRemainingBalance.roundDecimals(2);
                thisMonthSimulation[borrower].totalAccruedInterest  = totals[borrower].totalAccruedInterest;
                thisMonthSimulation[borrower].totalInterestWaived   = totals[borrower].totalInterestWaived;
                thisMonthSimulation[borrower].totalPayments         = totals[borrower].totalPayments;
                thisMonthSimulation[borrower].totalPrincipalMatch   = totals[borrower].totalPrincipalMatch;
                
                familyTotalAccruedInterest  = familyTotalAccruedInterest + thisMonthSimulation[borrower].totalAccruedInterest;
                familyRemainingBalance      = familyRemainingBalance + borrowerRemainingBalance;
                familyTotalInterestWaived   = familyTotalInterestWaived + thisMonthSimulation[borrower].totalInterestWaived;
                familyTotalPayments         = familyTotalPayments + thisMonthSimulation[borrower].totalPayments;
                familyTotalPrincipalMatch   = familyTotalPrincipalMatch + thisMonthSimulation[borrower].totalPrincipalMatch;

                if (totals[borrower].status === 'unpaid') {
                    const paid = thisMonthSimulation[borrower].remainingBalance === 0;
                    const forgiven = month === getRemainingPayments(basicInfo, borrower);

                    if (paid || forgiven) {
                        totals[borrower].status = (paid) ? 'paid' : 'forgiven';
                        totals[borrower].paymentDuration = month;
                        borrowersProcessed++;
                    }
                }
            });
            thisMonthSimulation.monthlyOverpayment          = monthlyOverpayment.roundDecimals(2);
            thisMonthSimulation.familyMinimumPayment        = familyMonthlyMinimumPayment.roundDecimals(2);
            thisMonthSimulation.familyRemainingBalance      = familyRemainingBalance.roundDecimals(2);
            thisMonthSimulation.familyTotalAccruedInterest  = familyTotalAccruedInterest.roundDecimals(2);
            thisMonthSimulation.familyTotalInterestWaived   = familyTotalInterestWaived.roundDecimals(2);
            thisMonthSimulation.familyTotalPayments         = familyTotalPayments.roundDecimals(2);
            thisMonthSimulation.familyTotalPrincipalMatch   = familyTotalPrincipalMatch.roundDecimals(2);
            thisMonthSimulation.loans                       = structuredClone(loans);
            
            remainingPayments--;
        }

        // Tax bomb
        let familyFederalTaxes                  = 0;
        let familyForgiveness                   = 0;
        let familyIRSSixYearLoanInterestAccrual = 0;
        let previousBorrowerBalance             = 0;
        let previousBorrowerForgivenessYear     = 0;
        borrowers.forEach(borrower => {
            const forgivenessMonth = Math.min(month, getRemainingPayments(basicInfo, borrower));
            const forgivenessYear = Math.floor(forgivenessMonth / 12);
            const remainingBalance = simulatedPayments[forgivenessMonth][borrower].remainingBalance;
            totals[borrower].remainingBalance = remainingBalance; // Need before tax calculation
            totals[borrower].agi = basicInfo[borrower].agi

            const sameYearForgiveness = forgivenessYear === previousBorrowerForgivenessYear && totals[borrower].status === 'forgiven';
            const taxedForgiveness = (basicInfo[borrower].pslfEligible) ? 0 :
                taxBomb(basicInfo, totals, borrowers, borrower, forgivenessYear, sameYearForgiveness, previousBorrowerBalance);
            totals[borrower].totalPayments = (totals[borrower].totalPayments + taxedForgiveness).roundDecimals(2);
            totals.sameYearForgiveness = sameYearForgiveness;
            totals[borrower].federalTaxes = taxedForgiveness;
            familyFederalTaxes = familyFederalTaxes + taxedForgiveness;
            
            const forgiveness = remainingBalance - taxedForgiveness;
            totals[borrower].forgiveness = forgiveness.roundDecimals(2);
            familyForgiveness = familyForgiveness + forgiveness;
            previousBorrowerBalance = remainingBalance;
            previousBorrowerForgivenessYear = forgivenessYear;

            const irsMonthlyRate = IRS_LOAN.rate / 12 + IRS_LOAN.monthlyPenalty;
            const irsCompoundAmountFactor =  Math.pow((1 + irsMonthlyRate), IRS_LOAN.maxDuration);
            const irsMonthlyPayment = taxedForgiveness * ((irsMonthlyRate * irsCompoundAmountFactor ) /
                                                          (irsCompoundAmountFactor - 1));
            const irsInterestAccrual = (irsMonthlyPayment * IRS_LOAN.maxDuration) - taxedForgiveness;
            totals[borrower].irsSixYearLoanInterestAccrual = irsInterestAccrual.roundDecimals(2);
            familyIRSSixYearLoanInterestAccrual = familyIRSSixYearLoanInterestAccrual + irsInterestAccrual;
        });

        // Apply remaining totals
        const lastSimulationMonth                   = repaymentSimulations[orderID].simulatedPayments[month];
        totals.familyFederalTaxes                   = familyFederalTaxes.roundDecimals(2);
        totals.familyForgiveness                    = familyForgiveness.roundDecimals(2);
        totals.familyIRSSixYearLoanInterestAccrual  = familyIRSSixYearLoanInterestAccrual.roundDecimals(2);
        totals.familyPaymentDuration                = month;
        totals.familyRemainingBalance               = lastSimulationMonth.familyRemainingBalance;
        totals.familyTotalAccruedInterest           = lastSimulationMonth.familyTotalAccruedInterest;
        totals.familyTotalInterestWaived            = lastSimulationMonth.familyTotalInterestWaived;
        totals.familyTotalPayments                  = (lastSimulationMonth.familyTotalPayments + familyFederalTaxes).roundDecimals(2);
        totals.familyTotalPrincipalMatch            = lastSimulationMonth.familyTotalPrincipalMatch;
        
        // Update optimalHeuristic if applicable
        if (optimalHeuristic === null) {
            optimalHeuristic = orderID;
        } else {
            const newOptimal =  repaymentSimulations[optimalHeuristic].totals.familyTotalPayments > 
                                repaymentSimulations[orderID].totals.familyTotalPayments;
            if (newOptimal) optimalHeuristic = orderID;
        }
    });

    const output = { 'simulations': {} };
    const strategyComparison = {
        family: {
            totalPayments: {},
            totalAccruedInterest: {},
            remainingBalance: {},
            paymentDuration: {},
            federalTaxes: {},
            forgiveness: {},
            sameYearForgiveness: {},
            irsSixYearLoanInterestAccrual: {},
            totalInterestWaived: {},
            totalPrincipalMatch: {}
        },
        repaymentOrder: {}
    };
    borrowers.forEach(borrower => { 
        strategyComparison[borrower] = {};
        strategyComparison[borrower].agi = {};
        strategyComparison[borrower].status = {};
        strategyComparison[borrower].totalPayments = {};
        strategyComparison[borrower].totalAccruedInterest = {};
        strategyComparison[borrower].remainingBalance = {};
        strategyComparison[borrower].paymentDuration = {};
        strategyComparison[borrower].federalTaxes = {};
        strategyComparison[borrower].forgiveness = {}; 
        strategyComparison[borrower].irsSixYearLoanInterestAccrual = {};
        strategyComparison[borrower].totalInterestWaived = {};
        strategyComparison[borrower].totalPrincipalMatch = {};
    });
    Object.entries(repaymentSimulations).forEach(strategy => {
        const strategyID = strategy[0];
        const strategyData = structuredClone(strategy[1]);
        output.simulations[strategyID] = strategyData;

        strategyComparison.repaymentOrder[strategyID]               = strategyData.repaymentOrder;
        strategyComparison.family.totalPayments[strategyID]         = strategyData.totals.familyTotalPayments;
        strategyComparison.family.totalAccruedInterest[strategyID]  = strategyData.totals.familyTotalAccruedInterest;
        strategyComparison.family.remainingBalance[strategyID]      = strategyData.totals.familyRemainingBalance;
        strategyComparison.family.paymentDuration[strategyID]       = strategyData.totals.familyPaymentDuration;
        strategyComparison.family.federalTaxes[strategyID]          = strategyData.totals.familyFederalTaxes;
        strategyComparison.family.forgiveness[strategyID]           = strategyData.totals.familyForgiveness;
        strategyComparison.family.sameYearForgiveness[strategyID]   = strategyData.totals.sameYearForgiveness;
        strategyComparison.family.irsSixYearLoanInterestAccrual[strategyID] = strategyData.totals.familyIRSSixYearLoanInterestAccrual;
        strategyComparison.family.totalInterestWaived[strategyID]   = strategyData.totals.familyTotalInterestWaived;
        strategyComparison.family.totalPrincipalMatch[strategyID]   = strategyData.totals.familyTotalPrincipalMatch;

        borrowers.forEach(borrower => {
            const borrowerObj = strategyComparison[borrower];
            borrowerObj.agi[strategyID]                             = strategyData.totals[borrower].agi;
            borrowerObj.status[strategyID]                          = strategyData.totals[borrower].status;
            borrowerObj.totalPayments[strategyID]                    = strategyData.totals[borrower].totalPayments;
            borrowerObj.totalAccruedInterest[strategyID]            = strategyData.totals[borrower].totalAccruedInterest;
            borrowerObj.remainingBalance[strategyID]                = strategyData.totals[borrower].remainingBalance;
            borrowerObj.paymentDuration[strategyID]                 = strategyData.totals[borrower].paymentDuration;
            borrowerObj.federalTaxes[strategyID]                    = strategyData.totals[borrower].federalTaxes;
            borrowerObj.forgiveness[strategyID]                     = strategyData.totals[borrower].forgiveness;
            borrowerObj.irsSixYearLoanInterestAccrual[strategyID]   = strategyData.totals[borrower].irsSixYearLoanInterestAccrual; 
            borrowerObj.totalInterestWaived[strategyID]             = strategyData.totals[borrower].totalInterestWaived;
            borrowerObj.totalPrincipalMatch[strategyID]             = strategyData.totals[borrower].totalPrincipalMatch;
        });
    })
    output.strategyComparison = structuredClone(strategyComparison);
    output.optimalSimulation = optimalHeuristic;
    return output;


    /* -------------------------------------------------
        SIMULATE REPAYMENT FUNCTIONS
    ------------------------------------------------- */
    function getRemainingPayments(basicInfo, borrower) {
        const planMap = ["old", 300, "new", 240, "rap", 360];
        const planIndex = planMap.indexOf(basicInfo[borrower].repaymentPlan) + 1;
        const pslfEligible = basicInfo[borrower].pslfEligible;
        const planMax = (pslfEligible) ? 120 : planMap[planIndex];
        return planMax - basicInfo[borrower].qualifiedPayments;
    }
    function getHighestRemainingPayments(basicInfo) {
        const selfRemainingPayments = getRemainingPayments(basicInfo, 'self');
        if (basicInfo.married) {
            const spouseRemainingPayments = getRemainingPayments(basicInfo, 'spouse');
            return (selfRemainingPayments > spouseRemainingPayments) ? selfRemainingPayments : spouseRemainingPayments;
        } 
        return selfRemainingPayments;
    }

    function getMonthlyOverpaymentProportion(basicInfo) {
        const monthlyOverpayment = basicInfo.monthlyOverpayment;
        let familyIncome = basicInfo.self.agi;
        if (basicInfo.married) {
            familyIncome += basicInfo.spouse.agi;
        }
        return (familyIncome === 0) ? 0 : monthlyOverpayment / familyIncome;
    }

    function applyInterestAccrual(loans) {
        let accruedInterest = 0;
        for (const loanID in loans) {
            const loan = loans[loanID];
            const principal = loan.principal;
            const rate = loan.interestRate / 100;

            const newAccrual = principal * rate / 12;
            const currentAccrual = loan.interestAccrual;
            loan.interestAccrual = (currentAccrual + newAccrual).roundDecimals(2);
            accruedInterest = accruedInterest + newAccrual;
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
            loan.interestAccrual = (loan.interestAccrual - remainingPayment).roundDecimals(2);
            remainingPayment = 0;
        } else {
            remainingPayment = remainingPayment - loan.interestAccrual;
            loan.interestAccrual = 0;

            let principal = loan.principal;
            if (principal > remainingPayment) {
                loan.principal = (loan.principal - remainingPayment).roundDecimals(2);
                remainingPayment = 0;
            } else {
                remainingPayment = remainingPayment - loan.principal;
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
        distributeMinimumPayment(borrowerLoans, remainingSum, minToDisperse);
    }

    function rapWaiveInterest(borrowerMonthlyStats, loans, borrower) {
        const monthlyPayment = borrowerMonthlyStats.monthlyPayment;
        const monthlyInterest = borrowerMonthlyStats.monthlyInterest;
        const waivedInterest = Math.max(0, monthlyInterest - monthlyPayment);

        let remainingWaive = waivedInterest;
        const loanSum = getBorrowerLoanSum(loans[borrower]);
        const borrowerLoans = loans[borrower];
        for (const loanID in borrowerLoans) {
            const loan = borrowerLoans[loanID]
            const principal = loan.principal;
            const accruedInterest = loan.interestAccrual;
            const portionToWaive = (loanSum === 0) ? 0 : (principal + accruedInterest) / loanSum;
            const interestToWaive = portionToWaive * waivedInterest;
            loan.interestAccrual = Math.max(0, accruedInterest - interestToWaive);
            remainingWaive -= interestToWaive; 
        }
        while (remainingWaive > 0.01 && borrowerLoans.length > 0) {
            const loanID = findNextLoan(borrowerLoans);
            const accruedInterest = borrowerLoans[loanID].interestAccrual;
            borrowerLoans[loanID].interestAccrual = Math.max(0, accruedInterest - remainingWaive);
            remainingWaive -= accruedInterest - borrowerLoans[loanID].interestAccrual; 
        }

        const finalWaived = waivedInterest - remainingWaive;
        return finalWaived;
    }

    function rapPrincipalMatch(initialLoanState, borrowerMonthlyStats, currentLoans, borrower) {
        const monthlyPayment = borrowerMonthlyStats.monthlyPayment;
        const initialPrincipalSum = Object.entries(initialLoanState[borrower]).reduce((total,loan) => {
            return total += loan[1].principal; },0)
        const currentPrincipalSum = Object.entries(currentLoans[borrower]).reduce((total,loan) => {
            return total += loan[1].principal; },0)
        const principalDiff = initialPrincipalSum - currentPrincipalSum;
        const principalMatch = (principalDiff < 50) ? Math.min(50, Math.max(0, monthlyPayment - principalDiff)) : 0;
        if (principalMatch <= 0) return 0;

        const matchPortions = {};
        const borrowerLoans = currentLoans[borrower];
        for (const loanID in borrowerLoans) {
            const loan = borrowerLoans[loanID];
            const portionToMatch = (currentPrincipalSum === 0) ? 0 :  loan.principal / currentPrincipalSum;
            matchPortions[loanID] = portionToMatch * principalMatch;
        }

        const actualMatch = makeMultiplePayments(matchPortions, currentLoans[borrower]);
        return actualMatch;
    }
}
function taxBomb(basicInfo, totals, borrowers, borrower, year, sameYearForgiveness, previousBorrowerBalance) {
    const married = basicInfo.married;
    const filingJointly = basicInfo.filingJointly;
    const filingType = (filingJointly) ? 'married' : 'single';
    const filingBorrowers = basicInfo.filingJointly ? borrowers : [borrower];
    const agi = filingBorrowers.reduce((total, borrower) => {
        total += basicInfo[borrower].agi; //agi already scaled with annualGrowth during monthly payment simulation
        return total.roundDecimals(2);
    }, 0);
    const dependents = basicInfo.dependents;

    const balance = totals[borrower].remainingBalance;
    const deductionType = (filingJointly) ? 
        STANDARD_DEDUCTIONS.MARRIED : (married && !filingJointly) ?
            STANDARD_DEDUCTIONS.SINGLE: (dependents > 0) ?  // MFS is technically not single but used for simplicity
                STANDARD_DEDUCTIONS.HOH : STANDARD_DEDUCTIONS.SINGLE;
    const growthFactor = Math.pow(CPI_U_MULTIPLIER, year);
    const deduction = deductionType * growthFactor;

    let start = Math.max(0, agi - deduction);
    if (sameYearForgiveness) start += previousBorrowerBalance;
    const end = start + balance;

    let total = 0;
    for (const bracket of INCOME_BRACKETS[filingType]) {
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
    return total.roundDecimals(2);
}
