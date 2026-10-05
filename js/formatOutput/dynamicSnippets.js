function getBorrowerBlurbs(borrower, borrowerTotals, borrowerFirstYearEstimates, borrowerRepaymentOrder) {
    const { federalTaxes, 
            minimumPayments,
            overpayments,
            paymentDuration, 
            repaymentPlan,
            pslfEligible, 
            remainingBalance,
            status,
            totalAccruedInterest
    } = borrowerTotals;
    const firstYearMinimumPayment = borrowerFirstYearEstimates[repaymentPlan];

    const statusBlurb = getStatusBlurb(borrower, status, paymentDuration);
    const totalsBlurb = getTotalsBlurb(borrower, borrowerRepaymentOrder, status, minimumPayments, overpayments, totalAccruedInterest);
    const monthlyPaymentBlurb = getMonthlyPaymentBlurb(borrower, repaymentPlan, firstYearMinimumPayment);
    const forgivenessBlurb = (status !== 'paid') ?  getForgivenessBlurb(borrower, remainingBalance, federalTaxes, pslfEligible) : null;
    
    let output = `<p>${statusBlurb} ${totalsBlurb} ${monthlyPaymentBlurb}`;
    output += `${(forgivenessBlurb)         ? ' ' + forgivenessBlurb : ''}`;
    return output += `</p>`;
}
function getRandomOutput(outputs) {
    const numberOfPossibleOutputs = Object.keys(outputs).length;
    const randomNumber = getRandomNumber(numberOfPossibleOutputs);
    return outputs[randomNumber];
}

function getStatusBlurb(borrower, status, paymentDuration) {
    const { pronoun, possessiveAdj, possessivePronoun } = getBorrowerDescriptors(borrower);
    const outputs = {
        1: `${capitalizeString(possessiveAdj)} loans are expected to be ${(status === 'paid') ? 'paid in full' : 'forgiven'} in ${paymentDuration} months.`,
        2: `The estimated payment schedule for ${possessiveAdj} loans is ${(status === 'paid') ? 'full payment' : 'forgiveness'} in ${paymentDuration} months.`,
        3: `${capitalizeString(pronoun)} ${(borrower === 'self') ? 'are' : 'is'} projected to have ${(status === 'paid') ? 'no outstanding loans' : possessivePronoun + ' loans forgiven'} in ${paymentDuration} months.`,
        4: `${capitalizeString(pronoun)} ${(borrower === 'self') ? 'are' : 'is'} on track ${(status === 'paid') ? 'to satisfy ' + possessivePronoun + ' balance': 'for forgiveness'} in ${paymentDuration} months.`
    }
    return getRandomOutput(outputs);
}

function getTotalsBlurb(borrower, borrowerRepaymentOrder, status, minimumPaymentsRAW, overpaymentsRAW, totalAccruedInterestRAW) {
    const { pronoun, possessiveAdj, possessivePronoun} = getBorrowerDescriptors(borrower);
    const totalAccruedInterest = convertToUSD(totalAccruedInterestRAW);
    const totalPayments = convertToUSD(minimumPaymentsRAW + overpaymentsRAW);
    const paid = (status) === 'paid';
    const pluralLoans = (borrowerRepaymentOrder.length > 1) ? 's' : '';

    const outputs = {
        1: `By the end of the repayment term, about ${totalAccruedInterest} of interest will have accrued after ${totalPayments} of payments.`,
        2: `By the time ${possessiveAdj} loan${pluralLoans} are ${(paid) ? 'paid' : 'forgiven'}, the total cost of borrowing will include ${totalAccruedInterest} in interest and ${totalPayments} in payments.`,
        3: `Over the life of ${possessivePronoun} loan${pluralLoans}, ${pronoun} will accrue a total of ${totalAccruedInterest} in interest after making ${totalPayments} in payments.`,
        4: `This repayment strategy involves ${totalPayments} in payments which includes ${totalAccruedInterest} of cumulative interest.`
    }
    return getRandomOutput(outputs);
}

function getMonthlyPaymentBlurb(borrower, repaymentPlanRAW, firstYearMinimumPaymentRAW) {
    const { possessiveAdj, possessivePronoun, } = getBorrowerDescriptors(borrower);
    const repaymentPlan = (repaymentPlanRAW === 'rap') ? 'RAP' : (repaymentPlanRAW === 'old') ? 'Old IBR' : 'New IBR';
    const firstYearMinimumPayment = convertToUSD(firstYearMinimumPaymentRAW);

    const outputs = {
        1: `${capitalizeString(possessivePronoun)} monthly payment in ${repaymentPlan} is calculated to be ${firstYearMinimumPayment} per month.`,
        2: `${capitalizeString(possessiveAdj)} monthly payments in ${repaymentPlan} will be approximately ${firstYearMinimumPayment} per month.`,
        3: `Repayment in ${repaymentPlan} will begin at roughly ${firstYearMinimumPayment} per month.`,
        4: `${(borrower === 'spouse') ? 'They should expect' : 'Expect'} to see monthly payments of roughly ${firstYearMinimumPayment} per month on ${repaymentPlan}.`
    }
    return getRandomOutput(outputs);
}

function getForgivenessBlurb(borrower, remainingBalanceRAW, federalTaxesRAW, pslfEligible) {
    const { pronoun, possessiveAdj } = getBorrowerDescriptors(borrower);
    const remainingBalance = convertToUSD(remainingBalanceRAW);
    const federalTaxes = convertToUSD(federalTaxesRAW);

    const outputsPSLF = {
        1: `Afterwards, the remaining balance of ${remainingBalance} will be forgiven from PSLF.'`,
        2: `After repayment is complete, ${remainingBalance} will be fully forgiven under PSLF.`,
        3: `Following ${possessiveAdj} final payment, the remaining ${remainingBalance} will be fully discharged through PSLF, leaving ${pronoun} with no further obligation.`,
        4: `At the conclusion of the repayment term, PSLF requirements will be met and ${possessiveAdj} ${remainingBalance} balance will be forgiven in full.`
    }
    const outputsTaxed = {
        1: `Afterwards, the remaining balance of ${remainingBalance} will incur an estimated ${federalTaxes} in federal taxes, plus any applicable state-level taxes.`,
        2: `After repayment is complete, the remaining balance of ${remainingBalance} will be taxed roughly ${federalTaxes} excluding any potential state taxes.`,
        3: `Following ${possessiveAdj} final payment, the remaining ${remainingBalance} balance will trigger an estimated ${federalTaxes} in federal tax responsibility with additional liability if ${possessiveAdj} state taxes student loan forgiveness.`,
        4: `At the conclusion of the repayment term, a predicted ${federalTaxes} of taxes from the ${remainingBalance} remaining balance should be anticipated assuming state taxes do not apply.`
    }
    const outputs = (pslfEligible) ? outputsPSLF : outputsTaxed; 

    return getRandomOutput(outputs);
}

function getSameYearForgivenessBlurb() {
    const outputs = {
        1: `Please be aware that both borrowers are expected to be forgiven within the same year which can add to your tax burden.`,
        2: `It is important to note that both balances are expected to be forgiven within the same year resulting in potentially higher taxes.`,
        3: `Be advised that both balances may be forgiven the same year leading to compounded tax impact the following year.`,
        4: `Keep in mind that both borrowers may be cleared of liability in the same year and cause a larger-than-expected tax bill the following tax season.`
    }
    return getRandomOutput(outputs);
}