function getNumberInputFromTemplate(template, borrower = null) {
    const id = (borrower) ? borrower + '_' + template.id : template.id;
    const type = template.type;
    const label = template.label;
    const tooltip = template.tooltip;
    const data = template.data;
    const placeholder = template.placeholder;
    const value = template.value;
    const step = template.step;
    const min = template.min;
    const max = template.max;
    const disabled = borrower === 'spouse';

    const divClasses = `input-wrapper${(type) ? ' ' + type : ''}`;
    const unitSpan = (type) ? (type === 'dollar') ? `<span class="unit">$</span>` : `<span class="unit">%</span>` : null;
    
    const loanField = template.loanField;
    const additionalAttributes = `${(borrower) ? (loanField) ? 'data-tag="' + borrower + 'LoanField"' : 'data-tag="' + borrower + 'Field"' : ''}`;
    const addData = (additionalAttributes !== '') ? additionalAttributes : null;

    const prefix = (borrower === 'spouse') ? 'Your spouse\'s ' : 'Your ';
    const description = prefix + template.description;
    const partialDescription = description.charAt(0).toLowerCase() + description.slice(1);

    const divHTML = 
        `<div class="field">
            <label for="${id}">
                ${label}${(tooltip) ? getToolTipFromTemplate(tooltip, id) : '' }
            </label>
            <div class="${divClasses}">
                ${(unitSpan) ? unitSpan : ''}
                <input id="${id}"
                    name="${id}"
                    aria-label="${description}"
                    type="text"
                    ${getDataAttributesFromTemplate(data, addData)}
                    autocomplete="off"
                    placeholder="${(placeholder) ? placeholder : ''}"
                    value="${(value) ? value : ''}"
                    step="${step}"
                    min="${min}"
                    max="${max}"
                    required
                    ${(disabled) ? 'disabled' : ''}>
                <span class="error-message"></span>
                <button type="button" class="spinner-btn spinner-up" aria-label="Increase ${partialDescription}" tabindex="-1"></button>
                <button type="button" class="spinner-btn spinner-down" aria-label="Decrease ${partialDescription}" tabindex="-1"></button>
            </div>
        </div>`;
    return divHTML;
}

const monthlyOverpaymentTemplate = {
    'input': 'number',
    'label': 'Monthly Overpayment',
    'description': 'monthly overpayment amount (in dollars)',
    'id': 'monthlyOverpayment',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number'
    },
    'type': 'dollar',
    'value': '0.00',
    'step': '0.01',
    'min': '0.00',
    'max': '999999999.99',
    'tooltip': {
        'ariaLabel': 'Help about monthly overpayment',
        'text': 'A payment in addition to the monthly minimum as determined by the borrower\'s plan. If enabled, loans with the highest rate loans and lowest balance will be prioritized to maximize savings.The default is set for minimum monthly payments.'
    },
    'loanField': true
}

const agiTemplate = {
    'input': 'number',
    'label': 'Annual AGI (Income)',
    'id': 'agi',
    'description': 'annual adjusted gross income amount (in dollars)',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number'
    },
    'type': 'dollar',
    'value': '0.00',
    'step': '0.01',
    'min': '0.00',
    'max': '999999999.99',
    'tooltip': {
        'ariaLabel': 'Help about annual adjusted gross income entry',
        'text': 'AGI (Adjusted Gross Income) is the total gross salary minus applicable deductions which may include 401(k) and HSA/FSA contributions, interest premiums or student loan interest payments (up to $2500). The exact amount can be found on line 11 of your most recent tax return (Form 1040).'
    },
    'loanField': false
}

const annualGrowthTemplate = {
    'input': 'number',
    'label': 'Annual Income Growth',
    'description': 'annual income growth rate (in percent)',
    'id': 'annualGrowth',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number'
    },
    'type': 'percent',
    'value': '0.00',
    'step': '0.01',
    'min': '0.00',
    'max': '99.99',
    'tooltip': {
        'ariaLabel': 'Help about annual growth features',
        'text': 'For a conservative estimate, the median U.S. annual income growth has been 3.8% over the last 30 years.'
    },
    'loanField': false
}

const qualifiedPaymentsTemplate = {
    'input': 'number',
    'label': 'Payments Made',
    'id': 'qualifiedPayments',
    'description': 'number of payments made (maximum 360 on RAP plan)',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number',
        'data-field': 'qualifiedPayments'
    },
    'placeholder': 'Forgiveness at 360',
    'step': '1',
    'min': '0',
    'max': '360',
    'tooltip': {
        'ariaLabel': 'Help about determining current number of qualified payments',
        'text': 'Number of qualifying monthly payments made towards your federal student loans. To determine your remaining payments, log into StudentAid.gov, search for \'NSLDS Payment Counter Summary\', paste the link found, and input the difference between your plan maximum and your remaining payments into this field.'
    },
    'loanField': true
}

const standardCapTemplate = {
    'input': 'number',
    'label': 'Permanent Standard',
    'description': 'permanent standard amount (in dollars)',
    'id': 'standardCap',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number'
    },
    'type': 'dollar',
    'value': '0.00',
    'step': '0.01',
    'min': '0.00',
    'max': '999999999.99',
    'tooltip': {
        'ariaLabel': 'Help about understanding permanent standard',
        'text': 'The maximum monthly payment equal to the 10-year standard payment when first enrolling into IBR. This value can be found by navigating to "My Loans" at studentaid.gov and pressing "Download My Aid Data." If left at the default, this will be calculated for you. This does not affect RAP.'
    },
    'loanField': true
}
const familySizeTemplate = {
    'input': 'number',
    'label': 'Family Size',
    'description': 'family size',
    'id': 'familySize',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number'
    },
    'value': '1',
    'step': '1',
    'min': '1',
    'max': '99',
    'tooltip': {
        'ariaLabel': 'Help on how to determine family size',
        'text': 'Family size includes you, your spouse (if applicable), as well as any relative receiving greater than half of their financial support from your household. If married filing separately and both borrowers have loans, it is assumed the borrowers are living together and the borrower with the higher AGI claims all dependents.'
    },
    'loanField': false
}

const dependentTemplate = {
    'input': 'number',
    'label': 'Child Dependents',
    'description': 'child dependents',
    'id': 'dependents',
    'data': {
        'data-storage': 'localStorage',
        'data-type': 'number'
    },
    'value': "0",
    'step': '1',
    'min': '0',
    'max': '97',
    'tooltip': {
        'ariaLabel': 'Help on how to determine eligible dependents',
        'text': 'Dependents 17 years of age or less.'
    },
    'loanField': true
}