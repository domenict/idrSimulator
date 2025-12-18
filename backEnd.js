/* -------------------------------------------------
    GLOBAL VARIABLES / PROTOTYPES
------------------------------------------------- */
// Update annually via https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
const BASE_2025 = { ak: 19550, hi: 17990, us: 15650 };
const INCREMENT_2025 = { ak: 6880, hi: 6330, us: 5500 };
const ANNUAL_GROWTH_RATE = 0.025; // Rough annual poverty line growth over last 30 years

Number.prototype.roundDecimals = function roundDecimals(places) {
    const offset = Math.pow(10, places);
    return Math.round(this * offset) / offset; 
}

/* -------------------------------------------------
    MAIN
------------------------------------------------- */
function calculatePayments(data) {
    let output, basicInfoBase, loansBase;
    let year = 0;
    const basicInfo     = { self: {}};
    const loans         = { self: {}};
    const idrHistory    = {};

    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
        return obj; 
    }, {});
    const inputValidated = inputValidation(sortedData, basicInfo, loans);
    if (!inputValidated) { 
        return "There was an error processing your request.\nPlease refresh the page and try again.";
    }
    basicInfoBase = JSON.parse(JSON.stringify(basicInfo));
    loansBase = JSON.parse(JSON.stringify(loans));

    calculateMinimumPayments(basicInfo, loans, year, idrHistory);
    console.log(loans);
    console.log(idrHistory);

    return JSON.stringify(new Date());
}
/* FOR TESTING
    node backEnd.js "$(cat ../data_married.txt)"
    */
    const input = JSON.parse(process.argv[2]);
    calculatePayments(input);



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
        ["fixedMonthly", "boolean", ["no","yes"]],
        ["self_repaymentPlan", "string", ["old", "new", "rap"]],
        ["spouse_repaymentPlan", "string", ["old", "new", "rap"], "marriedDependent"],
        ["dependents", "number", "integer", 0, 97]
    ];
    const secondaryInputMap = [
        ["monthlyPayment", "number", "float", 0, 9999999999999.99],
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
    if (basicInfo.fixedMonthly) {
        const selfAnnualGrowthIndex = getInputMapIndex(secondaryInputMap, "self_annualGrowth");
        const spouseAnnualGrowthIndex = getInputMapIndex(secondaryInputMap, "spouse_annualGrowth"); 
        secondaryInputMap[selfAnnualGrowthIndex][4] = 0;
        secondaryInputMap[spouseAnnualGrowthIndex][4] = 0;
    }
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
    // Validates and extract expected keys and values from inputMaps
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

    // Helper to get an index of a key
    function getInputMapIndex(array, key) {
        let i = 0;
        while (i < array.length) {
            if (array[i][0] === key) return i;
            i++;
        }
    }

    // Helper to update borrowers qualified payment max based on repayment plan
    function updateBorrowerQualifiedPaymentMax(borrower, planKey, paymentsKey, planMap) {
        const paymentsKeyIndex = getInputMapIndex(secondaryInputMap, paymentsKey);
        const borrowerPlan = basicInfo[borrower][planKey];
        const newMaxIndex = planMap.indexOf(borrowerPlan) + 1;
        secondaryInputMap[paymentsKeyIndex][4] = planMap[newMaxIndex];
    }

    // Sorts remaining keys catching any injections/html modifications
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

    // Extracts loan data into a separate 3D array for ease of future processing
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
    
            loans[borrower][loanNumber] = [...loan];
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
function calculateMinimumPayments(basicInfo, loans, year, saveToHistory) {
    const loanSums = { 'self': getLoanSum(loans, 'self') };
    saveToHistory[year] = {};

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
            saveToHistory[year][borrower] = planOptions;
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
        saveToHistory[year]['self'] = planOptions;
        const monthlyPayment = planOptions[plan];
        distributeMonthlyPaymentToLoans('self', loans, loanSums['self'], monthlyPayment);
    }

    /* -------------------------------------------------
        IDR CERTIFICATION FUNCTIONS
    ------------------------------------------------- */
    function getLoanSum(loans, borrower) {
        let total = 0;
        const keys = Object.keys(loans[borrower]);
        for (let i = 0; i < keys.length; i++) {
            const principal = loans[borrower][keys[i]][0];
            const interest = loans[borrower][keys[i]][1];
            total += principal + interest;
        }
        return total;
    }
    
    function calculatePovertyGuidelines(familySize = 1, residency = 'us', years = 0) {
        const res = residency.toLowerCase();
        const base = BASE_2025[res];
        const inc = INCREMENT_2025[res];
    
        const amount = base + (familySize - 1) * inc;
        const multiplier = Math.pow(1 + ANNUAL_GROWTH_RATE, years);
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
                const [principal, interest, ratePercent] = loans[id];
                const capitalized = principal + interest;
                const rate = ratePercent / 100;
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
            const loanSum = loanArr[0] + loanArr[1]; // principal + interest
    
            const shareOfLoanTotal = loanSum / totalLoanSum;
            let shareOfPayment;
            if (i === loanLength - 1) {
                shareOfPayment = remainingPayment.roundDecimals(2);
                remainingPayment = 0;
            } else {
                shareOfPayment = (shareOfLoanTotal * monthlyPayment).roundDecimals(2);
                remainingPayment -= shareOfPayment;
            }
    
            if (loanArr[3] === undefined) {
                loanArr.push(shareOfPayment)
            }  else {
                loanArr[3] = shareOfPayment;
            } 
            i++;
        }
    }
}













function taxes2026(AGI, married, dependents) {
    const medicareRate = .062;
    const ssRate = .0145;
    const fedSingleDeduction = 16100;
    const fedHeadOfHousehold = 24150;
    const fedMarriedDeduction = 32200;
    const fedBrackets = [
        [12400, 24800, .10],
        [50400, 100800, .12], 
        [105700, 211400, .22], 
        [201775, 403550, .24],
        [256225, 512450, .32],
        [640600, 768700, .35],
        [Infinity, Infinity, .37]
    ]

    const fedDeduction = (married) ? fedMarriedDeduction : (dependents > 0) ? fedHeadOfHousehold : fedSingleDeduction;
    const federalTaxable = AGI - fedDeduction;
    let remainingIncome = federalTaxable;
    let federalTaxes = 0;
    for (let i = 0; i < fedBrackets.length; i++) {
        let thisBracket, bracketRate, lastBracket;
        const index = (married) ? 1 : 0;
        thisBracket = fedBrackets[i][index];
        bracketRate = fedBrackets[i][2];
        if (i === 0) {
            lastBracket = 0;
        } else {
            lastBracket = fedBrackets[i-1][index];
        }

        if ((thisBracket - lastBracket) < remainingIncome) {
            let bracketRange =thisBracket - lastBracket
            federalTaxes += bracketRange * bracketRate;
            remainingIncome -= bracketRange;
        } else {
            federalTaxes += remainingIncome * bracketRate;
            remainingIncome = 0;
        }
    }
    federalTaxes = federalTaxes.toFixed(2);

    const medicareAndSS = (AGI * medicareRate + AGI * ssRate).toFixed(2);
    const totalTaxes = (parseFloat(medicareAndSS) + parseFloat(federalTaxes)).toFixed(2);
    const takeHome = AGI - parseFloat(totalTaxes);
    return [takeHome, totalTaxes];
}
