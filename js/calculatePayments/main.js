function calculatePayments(data) {
    try {
        const basicInfo_INPUT = { 'self': {}};
        const loans_INPUT     = { 'self': {}};
        const sortedData = Object.keys(data).sort().reduce((obj, key) => {
            obj[key] = data[key];
            return obj; 
        }, {});
    
        const inputValidated = inputValidation(sortedData, basicInfo_INPUT, loans_INPUT); //basicInfo & loans populated with user input
        if (!inputValidated) return `<div class="results-error-div">There was an error validating your request.` +
                                    `\nPlease ensure all information is correct and try again.</div>`;

        const basicInfo = structuredClone(basicInfo_INPUT);
        const loans = structuredClone(loans_INPUT);
        const validBorrowers = validateBorrowers(basicInfo, loans);
        if (!validBorrowers) return `<div class="results-error-div">There are no loans to simulate repayment. ` +
                                    `This could be due to all loans being disabled or all ` +
                                    `borrower\'s meeting their plan\'s qualified payments.` +
                                    `<div class="results-error-spacer"></div>` +
                                    `Please ensure all information is correct and try again.</div>`;
  
        // Filter valid borrowers from loans object, then begin simulation                        
        Object.keys(loans).forEach(borrower => { 
            if (validBorrowers.indexOf(borrower) === -1) delete loans[borrower];
        });
        const repaymentOrders = getRepaymentOrders(loans);
        const firstYearPlanEstimates = calculateMinimumPayments(basicInfo, loans);
        const simulatedPayments = simulateRepayment(basicInfo, loans, repaymentOrders, firstYearPlanEstimates);

        return formatOutput(simulatedPayments);
    } catch (err) {
        console.log(err);
        return err;
    }
}
