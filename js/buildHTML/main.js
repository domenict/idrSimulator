const borrowerTemplate = (borrower) => ({
    'borrower': borrower,
    '1': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} INCOME ==================== -->`,
        class: `row-2 ${borrower +'Row'}`,
        fields: { agiTemplate, annualGrowthTemplate }
    },
    '2': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} PAYMENT ==================== -->`,
        class: `row-2 ${borrower +'LoanRow'}`,
        fields: { monthlyOverpaymentTemplate, fixedOverpaymentTemplate }
    },
    '3': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} PLAN ==================== -->`,
        class: `row-3 ${borrower +'LoanRow'}`,
        fields: { repaymentPlanTemplate, qualifiedPaymentsTemplate, standardCapTemplate }
    },
    '4': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} OPTIONS ==================== -->`,
        class: `row-2 ${borrower +'LoanRow'}`,
        fields: { pslfTemplate, interestReductionTemplate }
    }
})

const familyTemplate = {
    '1': {
        id: 'familyInfo',
        class: 'row-3',
        fields: { familySizeTemplate, dependentTemplate, residencyTemplate }
    },
    '2': {
        id: 'radios-top',
        class: 'row-1 radios',
        fields: { marriedRadioTemplate, filingTemplate }
    },
    '3': {
        id: 'radios-bottom',
        class: 'row-2 radios spouseRow',
        fields: { spouseLoansTemplate, poolOverpaymentsTemplate }
    }
}

//main
async function buildHTML() {
    try {
        const selfSection = document.getElementById('selfSection');
        const familySection = document.getElementById('familySection');
        const spouseSection = document.getElementById('spouseSection');
        
        selfSection.innerHTML = buildSection(borrowerTemplate('self'));
        familySection.innerHTML = buildSection(familyTemplate);
        spouseSection.innerHTML = buildSection(borrowerTemplate('spouse'));
    } catch (err) {
        throw (err);
    }
}
