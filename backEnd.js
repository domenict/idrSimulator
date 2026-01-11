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

Number.prototype.roundDecimals = function roundDecimals(places) {
    const offset = Math.pow(10, places);
    return Math.round(this * offset) / offset; 
}

/* -------------------------------------------------
    MAIN
------------------------------------------------- */
function calculatePayments(data) {
    const basicInfo = { self: {}};
    const loans     = { self: {}};
    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
        return obj; 
    }, {});
    const inputValidated = inputValidation(sortedData, basicInfo, loans); //basicInfo & loans populated with user input
    if (!inputValidated) { 
        return "There was an error processing your request.\nPlease refresh the page and try again.";
    }

    //Function adds/modifies loans object with minimum payment of each loan
    const firstYearPlanEstimates = calculateMinimumPayments(basicInfo, loans);

    // Outputs repayment orders likely to result in minimizing total loan payment over the life of the loans
    // This is only generated once with base user input and is not updated as repayment is simulated
    // Heuristics:
    //      Avalanche: Lowest Balance   - Highest interest rate, lowest balance
    //      Avalanche: Highest Accrual  - Highest interest rate, highest interest accrual
    //      Immediate Bleed             - Prioritizes loan generating the most interest
    //      Snowball                    - Prioritizes loan with the lowest balance
    //      Highest Minimum Payment     - Prioritizes loan with the largest minimum payment
    const repaymentOrders = getRepaymentOrders(basicInfo, loans);
    const simulatedPayments = simulateRepayment(basicInfo, loans, repaymentOrders);
    console.log(`BREAKDOWN: ${new Date()}`);
    console.log(simulatedPayments);

    return JSON.stringify(new Date());
}



/* -------------------------------------------------
    INPUT VALIDATION
------------------------------------------------- */
function inputValidation(data, basicInfo, loans) {
    // If type === boolean -> [key, "boolean" as string, array where index 0 is false and index 1 is true]
    // If type === string -> [key, "string" as string, array of valid strings]
    // If type === number -> [key, "number" as string, specify float/integer as string, min, max]
    // "marriedDependent" appended as last index if applicable
    const marriedMap = [["married", "boolean", ["no","yes"]]];
    const primaryInputMap = [
        ["self_repaymentPlan", "string", ["old", "new", "rap"]],
        ["spouse_repaymentPlan", "string", ["old", "new", "rap"], "marriedDependent"],
        ["dependents", "number", "integer", 0, 97]
    ];
    const secondaryInputMap = [
        ["monthlyOverpayment", "number", "float", 0, 9999999999999.99],
        ["fixedOverpayments", "boolean", ["no","yes"]],
        ["self_agi", "number", "float", 0, 9999999999999.99],
        ["self_annualGrowth", "number", "float", 0, 99.99],
        ["self_qualifiedPayments", "number", "integer", 0, 360],
        ["self_interestReduction", "boolean", ["no", "yes"]], 
        ["familySize", "number", "integer", 1, 99],
        ["residency", "string", ["us", "ak", "hi"]], 
        ["filingJointly", "boolean", ["no", "yes"], "marriedDependent"],
        ["priority", "string", ["self", "spouse", "both"], "marriedDependent"],
        ["spouse_agi", "number", "float", 0, 9999999999999.99, "marriedDependent"],
        ["spouse_annualGrowth", "number", "float", 0, 99.99, "marriedDependent"],
        ["spouse_qualifiedPayments", "number", "integer", 0, 360, "marriedDependent"],
        ["spouse_interestReduction", "boolean", ["no", "yes"], "marriedDependent"]
    ];
    // Other maps in validation
    const loanInputMap = [
        ["principalID-placeholder", 0.01, 999999.99], 
        ["interestID-placeholder", 0, 999999.99], 
        ["rateID-placeholder", 0, 99.99]
    ];
    const planMap = ["old", 300, "new", 240, "rap", 360];

    /* -------------------- VALIDATION STARTS HERE -------------------- */
    // married should always be first due to the plethora of dependencies
    let married = null;
    let pass = validateInputMap(marriedMap);
    if (!pass) return false;
    if (basicInfo.married) {
        married = true;
        basicInfo.spouse = {};
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
    updateBorrowerQualifiedPaymentMax("self", "self_repaymentPlan", "self_qualifiedPayments", planMap);
    if (married) updateBorrowerQualifiedPaymentMax("spouse", "spouse_repaymentPlan", "spouse_qualifiedPayments", planMap);

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
            let key = inputMap[i][0];
            let value = data[key];
            if (!married && inputMap[i][inputMap[i].length-1] === "marriedDependent") continue;
            if (value === undefined) return false;

            let writeValue, values, booleanValue, numberType, parsedValue, min, max;
            let type = inputMap[i][1];
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
                    parsedValue = Number(value);
                    if (isNaN(parsedValue)) return false;
    
                    numberType = inputMap[i][2];
                    if (numberType === "float" && value !== parsedValue.toFixed(2)) return false;
                    if (numberType === "integer" && parsedValue % 1 !== 0) return false;
    
                    min = inputMap[i][3];
                    max= inputMap[i][4];
                    if (value < min || value > max) {
                        return false;
                    } else {
                        writeValue = parsedValue;
                    }
                    break;
            }

            if (key.indexOf("self") !== -1) {
                basicInfo.self[key.split("_")[1]] = writeValue;
            } else if (key.indexOf("spouse") !== -1) {
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

    function updateBorrowerQualifiedPaymentMax(borrower, planKey, paymentsKey, planMap) {
        const paymentsKeyIndex = getInputMapIndex(secondaryInputMap, paymentsKey);
        const borrowerPlan = basicInfo[borrower][planKey];
        const newMaxIndex = planMap.indexOf(borrowerPlan) + 1;
        secondaryInputMap[paymentsKeyIndex][4] = planMap[newMaxIndex];
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
        let loanNumber = 1;
        let lastBorrower;
        while (remainingKeys.length > 0) {
            const borrower = remainingKeys[0].split("_")[0];
            if (borrower !== "self" && borrower !== "spouse") return false;
            if (borrower === "spouse" && !married) return false;
            if ((borrower === "spouse" && married) && lastBorrower !== borrower) loanNumber = 1;
    
            const expectedID = borrower + "_loan" + loanNumber;
            const interestID = expectedID + "_interest";
            const principalID = expectedID + "_principal";
            const rateID = expectedID + "_rate";
            if (remainingKeys[0] !== interestID || remainingKeys[1] !== principalID || remainingKeys[2] !== rateID) {
                return false;
            }
    
            const principalValue = Number(data[principalID]);
            const interestValue = Number(data[interestID]);
            const rateValue = Number(data[rateID]);
            const loan = [principalValue, interestValue, rateValue];
            const loanValidationMap = [
                [principalID, loanInputMap[0][1], loanInputMap[0][2]], 
                [interestID, loanInputMap[1][1], loanInputMap[1][2]], 
                [rateID, loanInputMap[2][1], loanInputMap[2][2]]
            ];
            for (let i = 0; i < loan.length; i++) {
                let element = loan[i];
                if (isNaN(element)) return false;
                if (element.toFixed(2) !== data[loanValidationMap[i][0]]) return false;
                if (element < loanValidationMap[i][1] || element > loanValidationMap[i][2]) return false;
            }

            const reduceInterest = basicInfo[borrower]['interestReduction'];
            if (reduceInterest) loan[2] = Math.max(0, loan[2] - 0.25);
    
            loans[borrower][loanNumber] = {
                principal: loan[0],
                interestAccrual: loan[1],
                interestRate: loan[2]
            };
            remainingKeys.splice(0,3);
            lastBorrower = borrower;
            loanNumber++;
        } 
        return true;
    }
}


/* -------------------------------------------------
    IDR CERTIFICATION
------------------------------------------------- */
// Married Filing Jointly = Combined AGI prorated to share of the total debt, spouse always part of family size
// Married Filing Separately = Individual responsibility, borrower with higher AGI claims dependents while other has family size of 2
function calculateMinimumPayments(basicInfo, loans, year = 0) {
    const saveToHistory = {};
    const loanSums = { 'self': getLoanSum(loans, 'self') };

    if (basicInfo.married) {
        loanSums['spouse'] = getLoanSum(loans, 'spouse');
        const marriedLoanSum = loanSums.self + loanSums.spouse;
        const greaterAGI = (basicInfo.self.agi > basicInfo.spouse.agi) ? 'self' : 'spouse';
        
        ['self', 'spouse'].forEach(borrower => {
            const borrowerLoans = loans[borrower];
            const AGI = (basicInfo.filingJointly) ? basicInfo.self.agi + basicInfo.spouse.agi : basicInfo[borrower].agi;
            const portionOfPayment = (basicInfo.filingJointly) ? loanSums[borrower] / marriedLoanSum : 1;
            const plan = basicInfo[borrower].repaymentPlan;

            let povertyLine, dependents;
            if (basicInfo.filingJointly) {
                povertyLine = calculatePovertyGuidelines(basicInfo.familySize, basicInfo.residency, year);
                dependents = basicInfo.dependents;
            } else {
                const isHigherEarner = (borrower === greaterAGI);
                const familySize = (isHigherEarner) ? basicInfo.familySize : 2;
                povertyLine = calculatePovertyGuidelines(familySize, basicInfo.residency, year);
                dependents = (isHigherEarner) ? basicInfo.dependents : 0;
            }

            const planOptions = calculatePaymentPlans(borrowerLoans, AGI, portionOfPayment, povertyLine, dependents);
            saveToHistory[borrower] = planOptions;
            const monthlyPayment = planOptions[plan];
            distributeMonthlyPaymentToLoans(borrower, loans, loanSums[borrower], monthlyPayment);
        });
    } else {
        const borrowerLoans = loans.self;
        const AGI = basicInfo.self.agi;
        const portionOfPayment = 1;
        const plan = basicInfo.self.repaymentPlan;
        const povertyLine = calculatePovertyGuidelines(basicInfo.familySize, basicInfo.residency, year);
        const dependents = basicInfo.dependents;

        const planOptions = calculatePaymentPlans(borrowerLoans, AGI, portionOfPayment, povertyLine, dependents);
        saveToHistory['self'] = planOptions;
        const monthlyPayment = planOptions[plan];
        distributeMonthlyPaymentToLoans('self', loans, loanSums['self'], monthlyPayment);
    }

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
    
    function calculatePaymentPlans(borrowerLoans, AGI, portionOfPayment, povertyLine, dependents) {
        const oldIBR = (agi, pov) => { return Math.max(0, agi - pov * 1.5) * 0.15 / 12; }
        const newIBR = (agi, pov) => { return Math.max(0, agi - pov * 1.5) * 0.10 / 12; }
        const rap = (agi, deps) => {
            const rate = Math.min(0.10, Math.floor(agi / 10000) / 100);
            const baseAnnual = agi * rate;
            const proratedAnnual = baseAnnual * portionOfPayment; // As of Nov 2025, RAP is prorated for married filing jointly
            const monthlyPayment = (proratedAnnual / 12) - (50 * deps); // As of Nov 2025, borrower level reduction
            return Math.max(10, monthlyPayment); // $10 minimum monthly payment
        }
        const std = (loans) => {
            let totalMonthly = 0;
            for (const id in loans) {
                const { principal, interestAccrual, interestRate } = loans[id];
                const capitalized = principal + interestAccrual;
                const rate = interestRate / 100;
                totalMonthly += capitalized * (rate / 12) / (1 - Math.pow(1 + rate / 12, -120));
            }
            return Math.max(50, totalMonthly); // $50 minimum per borrower
        };
    
        const stdPayment = Math.round(std(borrowerLoans));
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
    
    function distributeMonthlyPaymentToLoans(borrower, loans, totalLoanSumRaw, monthlyPayment) {
        const borrowerLoans = loans[borrower];
        const totalLoanSum = totalLoanSumRaw.roundDecimals(2);
        let remainingPayment = monthlyPayment;
    
        let i = 0;
        const loanLength = Object.keys(borrowerLoans).length;
        for (const loan in borrowerLoans) {
            const loanArr = borrowerLoans[loan];
            const loanSum = loanArr.principal + loanArr.interestAccrual; // principal + interest
    
            const shareOfLoanTotal = loanSum / totalLoanSum;
            let shareOfPayment;
            if (i === loanLength - 1) {
                shareOfPayment = remainingPayment.roundDecimals(2);
                remainingPayment = 0;
            } else {
                shareOfPayment = (shareOfLoanTotal * monthlyPayment).roundDecimals(2);
                remainingPayment -= shareOfPayment;
            }
    
            loanArr.minPayment = shareOfPayment;
            i++;
        }
    }
}
function getLoanSum(loans, borrower) {
    let total = 0;
    const keys = Object.keys(loans[borrower]);
    for (let i = 0; i < keys.length; i++) {
        const principal = loans[borrower][keys[i]].principal;
        const interestAccrual = loans[borrower][keys[i]].interestAccrual;
        total += principal + interestAccrual;
    }
    return total;
}


/* -------------------------------------------------
    HEURISTIC REPAYMENT ORDERING
------------------------------------------------- */
function getRepaymentOrders(basicInfo, loans) { 

    const findAvalancheLowestBalance = (loanPool) => (loanPool.sort((a,b) => {
        if (b.data.interestRate !== a.data.interestRate) {
            return b.data.interestRate - a.data.interestRate;
        }

        const aBalance = a.data.principal + a.data.interestAccrual;
        const bBalance = b.data.principal + b.data.interestAccrual;
        return aBalance - bBalance;
    }));

    const findAvalancheHighestAccrual = (loanPool) => (loanPool.sort((a,b) => {
        if (b.data.interestRate !== a.data.interestRate) {
            return b.data.interestRate - a.data.interestRate;
        }

        const aAccrual = (a.data.interestRate / 100 * a.data.principal);
        const bAccrual = (b.data.interestRate / 100 * b.data.principal);
        return bAccrual - aAccrual;
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
    const { priority, married } = basicInfo;
    const selfLoans = Object.entries(loans.self).map(([id, val]) => ({id, owner: 'self', data: val}));
    const spouseLoans = (loans.spouse) ? Object.entries(loans.spouse).map(([id, val]) => ({id, owner: 'spouse', data: val})) : [];
    
    let primarySource = [];
    let secondarySource = []; 
    if (priority === 'both' || !married) {
        primarySource = [...selfLoans, ...spouseLoans];
    } else {
        primarySource = (priority === 'self') ? [...selfLoans] : [...spouseLoans];
        secondarySource = (priority === 'self') ? [...spouseLoans]: [...selfLoans];
    }
    
    const repaymentOrders = {};
    const heuristics = {
        debtAvalancheLowestFirst: findAvalancheLowestBalance,
        debtAvalancheHighestAccrual: findAvalancheHighestAccrual,
        immediateBleed: findImmediateBleed,
        highestMinPayment: findHighestMinPayment,
        debtSnowball: findSnowball
    };
    Object.keys(heuristics).forEach(hKey => {
        const primarySorted = heuristics[hKey]([...primarySource]);
        const secondarySorted = heuristics[hKey]([...secondarySource]);
        repaymentOrders[hKey] = [...primarySorted, ...secondarySorted];
    });

    for (const order in repaymentOrders) {
        for (const key of repaymentOrders[order]) {
            delete key.data;
        }
    }
    return repaymentOrders;
} 


/* -------------------------------------------------
    SIMULATE REPAYMENT
------------------------------------------------- */
function simulateRepayment(basicInfo_BASE, loans_BASE, repaymentOrders_BASE) {
    let optimalHeuristic = null;
    const repaymentSimulations = {};
    const borrowers = Object.keys(loans_BASE);
    const monthlyOverpaymentProportion = getMonthlyOverpaymentProportion(basicInfo_BASE);
    
    // input args are deeply cloned as they are modified throughout each heuristic simulation
    const repaymentOrders = structuredClone(repaymentOrders_BASE);
    Object.entries(repaymentOrders).forEach(currentOrder => {
        const basicInfo = structuredClone(basicInfo_BASE);
        const loans = structuredClone(loans_BASE);
        
        let order = currentOrder[1];
        const orderID = currentOrder[0];
        repaymentSimulations[orderID] = { 
            'repaymentStrategy': orderID, 
            'repaymentOrder': structuredClone(order),
            totals: {}, 
            simulatedPayments: {} };
        repaymentSimulations[orderID].totals = Object.fromEntries(borrowers.map(borrower => [borrower, {'status': 'unpaid'}]));
        const totals = repaymentSimulations[orderID].totals;
        const simulatedPayments = repaymentSimulations[orderID].simulatedPayments;

        let year = 0;
        let month = 1;
        let remainingPayments = getHighestRemainingPayments(basicInfo);

        // Simulates monthly payments
        while (remainingPayments) {
            simulatedPayments[month] = {};
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
                calculateMinimumPayments(basicInfo, loans, year);

                if (!basicInfo.fixedOverpayments) {
                    const newMonthlyOverPayment = (familyIncome * monthlyOverpaymentProportion).roundDecimals(2);
                    monthlyOverpayment = (newMonthlyOverPayment > monthlyOverpayment) ? newMonthlyOverPayment : monthlyOverpayment;
                    basicInfo.monthlyOverpayment = monthlyOverpayment;
                }
            }
            
            // Apply interest accrual and minimum payments
            let monthlyMinimumPayment = 0;
            borrowers.forEach(borrower => {
                thisMonthSimulation[borrower] = {};
                thisMonthSimulation[borrower].agi = basicInfo[borrower].agi;

                if (totals[borrower].status === 'unpaid') {
                    let totalAccruedInterest = totals[borrower].totalAccruedInterest || 0;
                    const borrowerAccrual = applyInterestAccrual(loans[borrower]);
                    thisMonthSimulation[borrower].monthlyInterest = borrowerAccrual.roundDecimals(2);
                    totals[borrower].totalAccruedInterest = (totalAccruedInterest + borrowerAccrual).roundDecimals(2);

                    let totalPayment = totals[borrower].totalPayment || 0;
                    const borrowerMinPayment = applyMinimumPayment(loans[borrower]);
                    thisMonthSimulation[borrower].minimumPayment = borrowerMinPayment.roundDecimals(2);
                    thisMonthSimulation[borrower].monthlyPayment = thisMonthSimulation[borrower].minimumPayment;
                    totals[borrower].totalPayment = (totalPayment + borrowerMinPayment).roundDecimals(2);
                    monthlyMinimumPayment = (monthlyMinimumPayment + borrowerMinPayment).roundDecimals(2);
                } else {
                    thisMonthSimulation[borrower].monthlyInterest = 0;
                    thisMonthSimulation[borrower].minimumPayment = 0;
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

                let borrowerTotalPayment = totals[loanOwner].totalPayment;
                let borrowerMonthlyPayment = thisMonthSimulation[loanOwner].monthlyPayment;
                let remainingBalance = makePayment(remainingOverpayment, loan);
                thisMonthSimulation.overpayedLoans.push(loanToApplyOverpayment);

                if (loan.principal === 0 && loan.interestAccrual === 0) {
                    delete loans[loanOwner][loanID];
                    order.shift();
                }

                if (remainingBalance > 0.01) {
                    const diff = remainingOverpayment - remainingBalance;
                    totals[loanOwner].totalPayment = (borrowerTotalPayment + diff).roundDecimals(2);
                    thisMonthSimulation[loanOwner].monthlyPayment = (borrowerMonthlyPayment + diff).roundDecimals(2);
                    remainingOverpayment = remainingBalance;
                } else {
                    totals[loanOwner].totalPayment = (borrowerTotalPayment + remainingOverpayment).roundDecimals(2);
                    thisMonthSimulation[loanOwner].monthlyPayment = (borrowerMonthlyPayment + remainingOverpayment).roundDecimals(2);
                    remainingOverpayment = 0;
                }
            }
            if (remainingOverpayment > 0.01) monthlyOverpayment -= remainingOverpayment;

            // Update monthly values and totals
            let totalRemainingBalance = 0;
            borrowers.forEach(borrower => {
                const borrowerRemainingBalance = getLoanSum(loans, borrower);
                totalRemainingBalance = (totalRemainingBalance + borrowerRemainingBalance).roundDecimals(2);
                thisMonthSimulation[borrower].totalPayment = totals[borrower].totalPayment;
                thisMonthSimulation[borrower].totalAccruedInterest = totals[borrower].totalAccruedInterest;
                thisMonthSimulation[borrower].remainingBalance = borrowerRemainingBalance.roundDecimals(2);

                if (totals[borrower].status === 'unpaid') {
                    if (thisMonthSimulation[borrower].remainingBalance === 0) {
                        totals[borrower].status = 'paid';
                        totals[borrower].paymentDuration = month;
                    }
                    if (month === getRemainingPayments(basicInfo, borrower)) {
                        totals[borrower].status = 'forgiven';
                        totals[borrower].paymentDuration = month; 
                    }
                }
            });
            thisMonthSimulation.monthlyOverpayment     = monthlyOverpayment.roundDecimals(2);
            thisMonthSimulation.familyMinimumPayment   = monthlyMinimumPayment.roundDecimals(2);
            thisMonthSimulation.familyRemainingBalance = totalRemainingBalance.roundDecimals(2);
            thisMonthSimulation.familyTotalPayments    = Object.entries(totals).reduce(
                (total, borrower) => total + borrower[1].totalPayment, 0).roundDecimals(2);
            thisMonthSimulation.familyTotalAccruedInterest = Object.entries(totals).reduce(
                (total, borrower) => total + borrower[1].totalAccruedInterest, 0).roundDecimals(2);
            
            const borrowersComplete = borrowers.reduce((total, borrower) => {
                if (totals[borrower].status !== 'unpaid') return total + 1 }, 0) === borrowers.length;
            if (totalRemainingBalance === 0 || borrowersComplete) break;
            remainingPayments--;
            if (!remainingPayments) break;
            month++;
        }

        // Tax bomb / PSLF
        let previousBorrowerForgivenessYear = null;
        let previousBorrowerBalance = 0;
        borrowers.forEach(borrower => {
            const forgivenessMonth = Math.min(getRemainingPayments(basicInfo, borrower), month);
            const forgivenessYear = Math.floor(forgivenessMonth / 12);
            const remainingBalance = simulatedPayments[forgivenessMonth][borrower].remainingBalance;
            totals[borrower].remainingBalance = remainingBalance; // Need before tax calculation
            totals[borrower].agi = basicInfo[borrower].agi

            const sameYearForgiveness = forgivenessYear === previousBorrowerForgivenessYear && totals[borrower].status === 'forgiven';
            const taxedForgiveness = taxBomb(basicInfo, totals, borrowers, borrower, forgivenessYear, sameYearForgiveness, previousBorrowerBalance);
            totals[borrower].federalTaxes = taxedForgiveness;
            totals[borrower].forgiveness = (remainingBalance - taxedForgiveness).roundDecimals(2);
            totals.sameYearForgiveness = sameYearForgiveness;
            previousBorrowerForgivenessYear = forgivenessYear;
            previousBorrowerBalance = remainingBalance;

            const irsMonthlyRate = IRS_LOAN.rate / 12 + IRS_LOAN.monthlyPenalty;
            const irsCompoundAmountFactor =  Math.pow((1 + irsMonthlyRate), IRS_LOAN.maxDuration);
            const irsMonthlyPayment = taxedForgiveness * ((irsMonthlyRate * irsCompoundAmountFactor ) /
                                                          (irsCompoundAmountFactor - 1));
            const irsInterestAccrual = (irsMonthlyPayment * IRS_LOAN.maxDuration) - taxedForgiveness;
            totals[borrower].irsSixYearLoanInterestAccrual = irsInterestAccrual.roundDecimals(2);
  
            totals[borrower].pslf = {}; 
            const pslfMonth = Math.max(0, 120 - basicInfo[borrower].qualifiedPayments);
            const pslfBorrowerHistory = structuredClone(simulatedPayments[pslfMonth][borrower]);
            const pslfBorrower = totals[borrower].pslf;
            pslfBorrower.agi = pslfBorrowerHistory.agi;
            pslfBorrower.totalPayment = pslfBorrowerHistory.totalPayment;
            pslfBorrower.totalAccruedInterest = pslfBorrowerHistory.totalAccruedInterest;
            pslfBorrower.paymentDuration = pslfMonth;
            pslfBorrower.forgiveness = pslfBorrowerHistory.remainingBalance;
        });

        // Apply remaining totals
        const familyFederalTaxes = Object.entries(borrowers).reduce(
            (total, borrower) => total + totals[borrower[1]].federalTaxes, 0).roundDecimals(2);
        totals.familyTotalPayments = (Object.entries(borrowers).reduce(
            (total, borrower) => total + totals[borrower[1]].totalPayment, 0) + familyFederalTaxes).roundDecimals(2);
        totals.familyTotalAccruedInterest = Object.entries(borrowers).reduce(
            (total, borrower) => total + totals[borrower[1]].totalAccruedInterest, 0).roundDecimals(2);
        totals.familyRemainingBalance = Object.entries(borrowers).reduce(
            (total, borrower) => total + totals[borrower[1]].remainingBalance, 0).roundDecimals(2);
        totals.familyPaymentDuration = Object.entries(borrowers).reduce(
            (max, borrower) => { 
                const paymentDuration = totals[borrower[1]].paymentDuration;
                max = (max < paymentDuration) ? paymentDuration : max;
                return max;
            }, 0).roundDecimals(2);
        totals.familyFederalTaxes = familyFederalTaxes;
        totals.familyForgiveness = Object.entries(borrowers).reduce(
            (total, borrower) => total + totals[borrower[1]].forgiveness, 0).roundDecimals(2);
        totals.familyIRSSixYearLoanInterestAccrual = Object.entries(borrowers).reduce(
            (total, borrower) => total + totals[borrower[1]].irsSixYearLoanInterestAccrual, 0).roundDecimals(2);
        
        // Update optimalHeuristic if applicable
        if (optimalHeuristic === null) {
            optimalHeuristic = orderID;
        } else {
            const newOptimal =  repaymentSimulations[optimalHeuristic].totals.familyTotalPayments > 
                                repaymentSimulations[orderID].totals.familyTotalPayments;
            if (newOptimal) optimalHeuristic = orderID;
        }
    });

    const output = {};
    output.strategyComparison = {};
    Object.entries(repaymentSimulations).forEach(strategy => {
        const strategyID = strategy[0];
        const strategyData = structuredClone(strategy[1]);
        output.strategyComparison[strategyID] = strategyData.totals;
        output.strategyComparison[strategyID].repaymentOrder = strategyData.repaymentOrder;
    })
    output.optimalSimulation = repaymentSimulations[optimalHeuristic];
    return output;


    /* -------------------------------------------------
        SIMULATE REPAYMENT FUNCTIONS
    ------------------------------------------------- */
    function getRemainingPayments(basicInfo, borrower) {
        const planMap = ["old", 300, "new", 240, "rap", 360];
        const planIndex = planMap.indexOf(basicInfo[borrower].repaymentPlan) + 1;
        return planMap[planIndex] - basicInfo[borrower].qualifiedPayments;
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
            accruedInterest = (accruedInterest + newAccrual).roundDecimals(2);

            let currentAccrual = loan.interestAccrual;
            loan.interestAccrual = (currentAccrual + newAccrual).roundDecimals(2);
        }
        return accruedInterest;
    }

    function applyMinimumPayment(loans) {
        const loansLength = Object.keys(loans).length;
        let totalMinPayment = 0;

        let increment = 1;
        let loanID = increment;
        while (Object.keys(loans).length > 0 && increment <= loansLength) {
            let loan = loans[increment];
            if (loan === undefined) {
                increment++;
                continue;
            }

            let remainingPayment = loan.minPayment;      
            totalMinPayment += remainingPayment;
            while (remainingPayment >= 0.01) {
                remainingPayment = makePayment(remainingPayment, loan);
                if (remainingPayment >= 0.01) {
                    delete loans[loanID];

                    // If minPayment exceeds loan balance, servicers prioritize unsubsidized and highest interest loans
                    // for remainder of payment. Tie breakers if same loan type and rate is at servicer discretion.
                    // As user input does not allow loan type, highest interest with highest balance is prioritized.
                    loanID = findNextLoan(loans);
                    if (loanID === null) break;
                    loan = loans[loanID];
                }
            }

            if (remainingPayment) totalMinPayment -= remainingPayment;
            increment++;
            loanID = increment;
        }
        return totalMinPayment.roundDecimals(2);

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
