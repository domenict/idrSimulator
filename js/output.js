let lastOutput = null;

function formatOutput(rawOutput_BASE) {
    const rawOutput = structuredClone(rawOutput_BASE);
    const optimalHeuristics = rawOutput.optimalHeuristics;
    const borrowers = Object.keys(optimalHeuristics);
    delete rawOutput.optimalHeuristics;

    const formattedOutput = { 'simulations': {} };
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
        repaymentOrders: {}
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
    Object.entries(rawOutput).forEach(strategy => {
        const strategyID = strategy[0];
        const strategyData = structuredClone(strategy[1]);
        formattedOutput.simulations[strategyID] = strategyData;

        strategyComparison.repaymentOrders[strategyID]              = strategyData.repaymentOrders;
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
            borrowerObj.totalPayments[strategyID]                   = strategyData.totals[borrower].totalPayments;
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
    formattedOutput.strategyComparison = structuredClone(strategyComparison);
    formattedOutput.optimalHeuristics = optimalHeuristics;
    lastOutput = formatOutput;

    console.log(`SIMULATED OUTPUT: ${new Date()}`);
    console.log(`${Math.floor(roughSizeOfObject(formattedOutput) / 1000)} KB`);
    console.log(formattedOutput);
}

function roughSizeOfObject(object) {
    const objectList = [];
    const stack = [object];
    let bytes = 0;
  
    while (stack.length) {
      const value = stack.pop();
  
      switch (typeof value) {
        case 'boolean':
          bytes += 4;
          break;
        case 'string':
          bytes += value.length * 2;
          break;
        case 'number':
          bytes += 8;
          break;
        case 'object':
          if (!objectList.includes(value)) {
            objectList.push(value);
            for (const prop in value) {
              if (value.hasOwnProperty(prop)) {
                stack.push(value[prop]);
              }
            }
          }
          break;
      }
    }
  
    return bytes;
  }