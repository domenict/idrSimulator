// Globals must be cleared/formatted at input validation
let basicInfo, basicInfoBackup, loans, loansBackup, married; 

// main
function calculatePayments(data) {
    const date = new Date();
    let output = JSON.stringify(date);

    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
        return obj; 
    }, {});
    const inputValidated = inputValidation(sortedData);
    if (inputValidated) { 
        basicInfoBackup = JSON.parse(JSON.stringify(basicInfo));
        loansBackup = JSON.parse(JSON.stringify(loans));
    } else {
        return "There was an error processing your request.\nPlease refresh the page and try again.";
    }
    //console.log(married);
    console.log(basicInfoBackup);
    console.log(loansBackup);

    return output;
}


// Input validation and data extraction from submitted form
function inputValidation(data) {
    // Clear globals
    basicInfo = {
        self: {}
    };
    loans = [];
    basicInfoBackup = null;
    loansBackup = null;
    married = null;

    // If type === boolean -> [key, "boolean" as string, array where index 0 is false and index 1 is true]
    // If type === string -> [key, "string" as string, array of valid strings]
    // If type === number -> [key, "number" as string, specify float/integer as string, min, max]
    // "marriedDependent" appended as last index if applicable
    const marriedMap = [["married", "boolean", ["no","yes"]]];
    const primaryInputMap = [
        ["fixedMonthly", "boolean", ["no","yes"]],
        ["self_repaymentPlan", "string", ["old", "new", "rap"]],
        ["spouse_repaymentPlan", "string", ["old", "new", "rap"], "marriedDependent"]
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
        ["priority", "string", ["none","self","spouse"], "marriedDependent"],
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
    let pass = validateInputMap(marriedMap);
    if (!pass) return false;
    if (basicInfo.married) {
        married = true;
        basicInfo.spouse = {};
        const familySizeIndex = getInputMapIndex(secondaryInputMap, "familySize");
        secondaryInputMap[familySizeIndex][3]++; 
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
    
            loans.push([borrower, loanNumber, ...loan]);
            remainingKeys.splice(0,3);
            lastBorrower = borrower;
            loanNumber++;
        } 
        return true;
    }
}






// Update annually via https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
function calculatePovertyGuidelines(familySize, residency) {

    if (residency === "AK") {
        return 19550 + (familySize - 1) * 6880;
    } else if (residency === "HI") {
        return 17990 + (familySize - 1) * 6330;
    } else {
        return 15650 + (familySize - 1) * 5500;
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
