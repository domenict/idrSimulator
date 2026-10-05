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
        ["residency", "string", ["al", "ak", "az", "ar", "ca", "co", "ct", "de", 
        "fl", "ga", "hi", "id", "il", "in", "ia", "ks", "ky", "la", "me", "md", 
        "ma", "mi", "mn", "ms", "mo", "mt", "ne", "nv", "nh", "nj", "nm", "ny", 
        "nc", "nd", "oh", "ok", "or", "pa", "ri", "sc", "sd", "tn", "tx", "ut", 
        "vt", "va", "wa", "wv", "wi", "wy"]],
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

