let lastOutput = null;

async function formatOutput(rawOutput) {
    const formattedOutput = structuredClone(rawOutput);
    const simulations = formattedOutput.simulations;
    const borrowers = Object.keys(formattedOutput.loans);

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
        }
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
    
    Object.entries(simulations).forEach(strategy => {
        const strategyID = strategy[0];
        if (strategyID === 'optimalHeuristics') return;
        
        const strategyData = structuredClone(strategy[1]);
        simulations[strategyID] = strategyData;

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
    simulations.strategyComparison = structuredClone(strategyComparison);
    lastOutput = formattedOutput;

    console.log(`SIMULATED OUTPUT: ${new Date()}`);
    console.log(formattedOutput);
}
