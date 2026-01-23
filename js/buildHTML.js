/* *************************************************************************************************
************************                    FIELD TEMPLATES                 ************************
************************************************************************************************* */

/* -------------------------------------------------
    NUMBER INPUTS
------------------------------------------------- */
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
    
    const additionalAttributes = `${(borrower === 'spouse') ? ' data-tag="spouseField"' : ''}`;
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
        'text': 'An excess payment in addition to the monthly minimum determined by your selected plan(s) and applied to all borrowers. The default is set for minimum monthly payments.'
    }
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
    }
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
    }
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
        'text': 'Number of qualifying monthly payments made towards your public student loans. For an exact number, log into StudentAid.gov, search for \'NSLDS Payment Counter Summary\' and paste the link found. Input the difference of the plan maximum and the repayment counter into this field.'
    }
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
        'text': 'The 10-year standard payment amount that is calculated when enrolled in IBR. Minimum payments cannot exceed this amount while on the plan. If new to IDR, keep this value at the default to calculate it for you.'
    }
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
        'text': 'Family size includes you, your spouse (if applicable), as well as any relative receiving greater than half of their financial support from your household. If married filing separately, it is assumed the borrowers are living together and the borrower with the higher AGI claims all dependents.'
    }
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
        'text': 'Child dependents are individuals 17 years of age or less.'
    }
}

/* -------------------------------------------------
    SELECT INPUTS
------------------------------------------------- */
function getSelectFromTemplate(template, borrower) {
    const id = (borrower) ? borrower + '_' + template.id : template.id;
    const label = template.label;
    const tooltip = template.tooltip;
    const options = template.options;
    const data = template.data;
    const disabled = borrower === 'spouse';

    const additionalAttributes = `${(borrower === 'spouse') ? ' data-tag="spouseField"' : ''}`;
    const addData = (additionalAttributes !== '') ? additionalAttributes : null;

    const divHTML = 
        `<div class="field">
            <label for="${id}-trigger">
                ${label}${(tooltip) ? getToolTipFromTemplate(tooltip, id) : '' }
            </label>
            <div class="select-wrapper" data-id="${id}">
                <button type="button" id="${id}-trigger" class="select-trigger" aria-haspopup="listbox" aria-expanded="false" aria-label="${label}">
                    <span class="select-value">
                        ${options[Object.keys(options)[0]]}
                    </span>
                </button>
                <ul
                    class="select-dropdown"
                    role="listbox"
                    tabindex="0"
                    aria-activedescendant="${id}-opt-0">
                    ${getOptionsFromTemplate(options, id)}
                </ul>

                <!-- Add a real hidden input for form submission & localStorage -->
                <input type="hidden"
                    id="${id}"
                    name="${id}"
                    class="hidden-select-input"
                    value="${Object.keys(options)[0]}"
                    ${getDataAttributesFromTemplate(data, addData)}
                    required
                    ${(disabled) ? 'disabled' : ''}>
            </div>
        </div>`;
    return divHTML;
}

function getOptionsFromTemplate(template, id) {
    let output = '';
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const text = template[key];
            const selected = (i === 0) ? ' aria-selected="true"' : '';
            output += `<li id=${id}-opt-${i} role="option" data-value="${key}"${selected}>${text}</li>`;
    }
    return output;
}

const fixedOverpaymentTemplate = {
    'input': 'select',
    'label': 'Overpayment Scaling',
    'id': 'fixedOverpayments',
    'data': {
        'data-storage': 'localStorage'
    },
    'tooltip': {
        'ariaLabel': 'Help about overpayment scaling',
        'text': 'For scaling the overpayment amount if income is expected to grow over time. The minimum overpayment will equal the \'Monthly Overpayment\' field and will scale proportionally to the estimated total income of the household.'
    },
    'options': {
        'yes': 'Fixed Overpayments',
        'no': 'Scale with Income Growth'
    }
}

const repaymentPlanTemplate = {
    'input': 'select',
    'label': 'Repayment Plan',
    'id': 'repaymentPlan',
    'data': {
        'data-storage': "localStorage",
        'data-field': "repaymentPlan"
    },
    'options': {
        'rap': 'RAP',
        'old': 'Old IBR',
        'new': 'New IBR'
    }
}

const interestReductionTemplate = {
    'input': 'select',
    'label': 'Autopay Reduction',
    'id': 'interestReduction',
    'data': {
        'data-storage': 'localStorage',
    },
    'tooltip': {
        'ariaLabel': 'Help about interest reduction features',
        'text': 'A federally mandated 0.25% reduction for public loans rates if enrolled in auto-pay that will be applied during analysis.'
    },
    'options': {
        'no': 'Not applicable',
        'yes': 'Enrolled in autopay'
    }
}

const pslfTemplate = {
    'input': 'select',
    'label': 'PSLF Eligibility',
    'id': 'pslfEligible',
    'data': {
        'data-storage': 'localStorage',
        'data-field': 'pslfEligibility'
    },
    'options': {
        'no': 'Not Eligible',
        'yes': 'Eligible'
    }
}

const residencyTemplate = {
    'input': 'select',
    'label': 'Residency',
    'id': 'residency',
    'data': {
        'data-storage': 'localStorage'
    },
    'options': {
        'us': 'Contiguous US',
        'ak': 'Alaska',
        'hi': 'Hawaii'
    }
}


/* -------------------------------------------------
    RADIO INPUTS
------------------------------------------------- */
function getRadioFromTemplate(template) {
    const divClasses = `radio-field${(template.divClass) ? ' ' + template.divClass : ''}`;
    const legendID = template.legendId;
    const label = template.legendLabel;
    const radios = template.radios;

    const divHTML = 
        `<div class="${divClasses}">
            <fieldset class="radio-group" aria-labelledby="${legendID}">
                <legend id="${legendID}">${label}</legend>
                ${getRadioOptionsFromTemplate(template, radios)}
            </fieldset>
        </div>`;
    return divHTML;
}

function getRadioOptionsFromTemplate(template, radios) {
    let output;
    const name = template.name;
    const data = template.data;
    const spouseDiv = template.spouseDiv;

    const additionalAttributes = `${(spouseDiv) ? ' data-tag="spouseField"' : ''}`;
    const addData = (additionalAttributes !== '') ? additionalAttributes : null;

    const keys = Object.keys(radios);
    for (let i = 0; i < keys.length; i++) {
        const id = keys[i];
        const radio = radios[id];
        const value = radio.value;
        const checked = radio.checked;
        const text = radio.text;

        const buttonTemplate = 
            `<label class="radio-label" for="${id}">
                <input type="radio"
                    id="${id}"
                    name="${name}"
                    value="${value}"
                    ${getDataAttributesFromTemplate(data, addData)}
                    ${(checked) ? ' checked' : ''}
                    ${(spouseDiv) ? ' disabled' : ''}>
                <svg class="radio-circle" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" tabindex="-1">
                    <circle class="radio-border" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                    <circle class="radio-dot" cx="12" cy="12" r="6" fill="currentColor"/>
                </svg>
                <span class="radio-text">${text}</span>
            </label>`;
        (!output) ? output = buttonTemplate : output += buttonTemplate;
    }
    return output;
}

const marriedRadioTemplate = {
    'input': 'radio',
    'name': 'married',
    'divClass': 'marriedDiv',
    'spouseDiv': false,
    'data': {
        'data-storage': 'localStorage'
    },
    'legendId': 'married-legend',
    'legendLabel': 'Are you legally married?',
    'radios': {
        'married_yes': {
            'value': 'yes',
            'text': 'Yes',
            'checked': false
        },
        'married_no' : {
            'value': 'no',
            'text': 'No',
            'checked': true
        }
    }
}

const filingTemplate = {
    'input': 'radio',
    'name': 'filingJointly',
    'divClass': 'spouseDiv',
    'spouseDiv': true,
    'data': {
        'data-storage': 'localStorage'
    },
    'legendId': 'filing-legend',
    'legendLabel': 'How are you filing taxes?',
    'radios': {
        'filing_jointly': {
            'value': 'yes',
            'text': 'Jointly',
            'checked': true
        },
        'filing_separately' : {
            'value': 'no',
            'text': 'Separately',
            'checked': false
        }
    }
}

const spouseLoansTemplate = {
    'input': 'radio',
    'name': 'spouseHasLoans',
    'divClass': 'spouseDiv',
    'spouseDiv': true,
    'data': {
        'data-storage': 'localStorage',
    },
    'legendId': 'spouseLoans-legend',
    'legendLabel': 'Any spouse loans?',
    'radios': {
        'spouseHasLoans_true': {
            'value': 'yes',
            'text': 'Yes',
            'checked': false
        },
        'spouseHasLoans_false' : {
            'value': 'no',
            'text': 'No',
            'checked': true
        }
    }
}

const poolOverpaymentsTemplate = {
    'input': 'radio',
    'name': 'poolOverpayments',
    'divClass': 'spouseDiv spouseLoanDiv',
    'spouseDiv': true,
    'data': {
        'data-storage': 'localStorage'
    },
    'legendId': 'poolOverpayments-legend',
    'legendLabel': 'Pool overpayments?',
    'radios': {
        'poolOverpayments_true': {
            'value': 'yes',
            'text': 'After a payoff',
            'checked': false
        },
        'poolOverpayments_false' : {
            'value': 'no',
            'text': 'Keep separate',
            'checked': true
        }
    }
}


/* -------------------------------------------------
    LOANS
------------------------------------------------- */
function getLoansFromTemplate(borrower) {
    const divHTML = 
        `<!-- ==================== ${borrower.toUpperCase()} LOANS ==================== -->
        <div class="loan-table-wrapper">
            <table id="${borrower}Loans" class="loan-table" aria-describedby="live-announcements">
                <thead>
                    <tr>
                        <td></td>
                        <th>Principal Amount</th>
                        <th>Accrued Interest</th>
                        <th>Interest Rate</th>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    ${getRowTemplate(borrower)}
                </tbody>
            </table>
        </div>`;
    return divHTML;
}

function getRowTemplate(borrower, loanNumber = 1) {
    const isSpouse = borrower === 'spouse';

    const trHTML = 
        `<tr id="${borrower}_loan${loanNumber}" aria-disabled="false">
            <td class="row-label">
                <span id="${borrower}_loan${loanNumber}_span">Loan ${loanNumber}</span>
            </td>
            <td>
                <div class="input-wrapper dollar">
                    <span class="unit">$</span>
                    <input id="${borrower}_loan${loanNumber}_principal"
                        name="${borrower}_loan${loanNumber}_principal"
                        type="text"
                        data-storage="localStorage"
                        data-type="number"
                        ${(isSpouse) ? ' data-tag="spouseField"' : ''}
                        autocomplete="off"
                        aria-label="Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan ${loanNumber} principal balance"
                        step="0.01"
                        min="0.01"
                        max="999999.99"
                        required
                        ${(isSpouse) ? 'disabled' : ''}>
                    <span class="error-message"></span>
                    <button type="button" class="spinner-btn spinner-up" aria-label="Increase loan ${loanNumber} principal amount" tabindex="-1"></button>
                    <button type="button" class="spinner-btn spinner-down" aria-label="Decrease loan ${loanNumber} principal amount" tabindex="-1"></button>
                </div>
            </td>
            <td>
                <div class="input-wrapper dollar">
                    <span class="unit">$</span>
                    <input id="${borrower}_loan${loanNumber}_interest"
                        name="${borrower}_loan${loanNumber}_interest"
                        type="text"
                        data-storage="localStorage" data-type="number" ${(isSpouse) ? ' data-tag="spouseField"' : ''}
                        autocomplete="off"
                        aria-label="Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan ${loanNumber} accrued interest"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        required
                        ${(isSpouse) ? 'disabled' : ''}>
                    <span class="error-message"></span>
                    <button type="button" class="spinner-btn spinner-up" aria-label="Increase loan ${loanNumber} accrued interest" tabindex="-1"></button>
                    <button type="button" class="spinner-btn spinner-down" aria-label="Decrease loan ${loanNumber} accrued interest" tabindex="-1"></button>
                </div>
            </td>
            <td>
                <div class="input-wrapper percent">
                    <span class="unit">%</span>
                    <input id="${borrower}_loan${loanNumber}_rate"
                        name="${borrower}_loan${loanNumber}_rate"
                        type="text"
                        data-storage="localStorage" data-type="number" ${(isSpouse) ? ' data-tag="spouseField" ' : ' '}data-field="${borrower}LoanRate"
                        autocomplete="off"
                        aria-label="Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan ${loanNumber} interest rate"
                        step="0.01"
                        min="0"
                        max="99.99"
                        required
                        ${(isSpouse) ? 'disabled' : ''}>
                    <span class="error-message"></span>
                    <button type="button" class="spinner-btn spinner-up" aria-label="Increase loan ${loanNumber} interest rate" tabindex="-1"></button>
                    <button type="button" class="spinner-btn spinner-down" aria-label="Decrease loan ${loanNumber} interest rate" tabindex="-1"></button>
                </div>
            </td>
            <td class="btn-cell">
                <button id="${borrower}_loan${loanNumber}_toggle" type="button" class="toggleLoan" data-enabled="true" aria-label="Disable loan ${loanNumber}" tabindex="0">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="5.5" cy="5.5" r="5"/>
                        <line class="slash" x1="2" y1="2" x2="9" y2="9" stroke-width="1"/>
                    </svg>
                </button>
                <button id="${borrower}_loan${loanNumber}_add" type="button" class="addLoan" aria-label="Add new loan after loan ${loanNumber}" tabindex="0">+</button>
                <button id="${borrower}_loan${loanNumber}_delete" type="button" class="deleteLoan" aria-label="Remove loan ${loanNumber}" tabindex="0">−</button>
            </td>
        </tr>`;
    return trHTML;
}

/* *************************************************************************************************
************************                      HELPERS                       ************************
************************************************************************************************* */

function getToolTipFromTemplate(template, id) {
    const tooltipID = "tooltip-" + id;
    const spanHTML = 
        `<span class="help-wrapper"
            role="button"
            tabindex="0"
            aria-label="${template.ariaLabel}"
            aria-describedby="${tooltipID}"
            aria-expanded="false">
            <svg class="help-icon" focusable="false" tabIndex="-1">
                <use href="#help-hover"></use>
            </svg>
            <div id="${tooltipID}" class="tooltip" role="tooltip" aria-hidden="true" tabIndex="-1"><!-- beautify ignore:start -->${template.text}<!-- beautify ignore:end -->
            </div>
        </span>`;
    return spanHTML;
}

function getDataAttributesFromTemplate(template, additionalAttributes = null) {
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const attribute = keys[i] + '="' + template[keys[i]] + '"';
        (!output) ? output = attribute : output += attribute;
        if (i !== keys.length - 1) output += ' ';
    }
    output = (additionalAttributes) ? output + additionalAttributes : output;
    return output;
}

/* *************************************************************************************************
************************                  SECTION TEMPLATES                 ************************
************************************************************************************************* */

function buildSection(template) {
    const header = template.borrower || 'family';
    const borrower = template.borrower;
    const sectionHTML = `
        <h2 id="${header}-heading" class="field-header">${header.toUpperCase()}</h2>
        
        ${buildRows(template)}
        ${(borrower) ? getLoansFromTemplate(template.borrower) : ''}
    `;

    const formattedHTML = html_beautify(sectionHTML, {
        indent_size: 4,
        indent_level: 4,
        indent_char: ' ',
        max_preserve_newlines: 1,
        preserve_newlines: true,
        wrap_line_length: 0
    });
    return `\n${formattedHTML}`;
}

function buildRows(template) {
    const borrower = template.borrower;
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === 'borrower') continue;
        const row = buildRowFromTemplate(template[keys[i]], borrower);
        (!output) ? output = row : output += row;
        if (i !== keys.length - 2) output += `\n`;
    }
    return output;
}

function buildRowFromTemplate(template, borrower) {
    const comment = template.comment;
    const id = (template.id) ? 'id="' + template.id + '"' : null;
    const classes = template.class;
    const fields = template.fields;

    const rowHTML = 
        `${(comment) ? comment : ''}
        <div ${(id) ? id : ''} class="${classes}">
            ${buildFieldsFromTemplate(fields, borrower)}
        </div>`;
    return rowHTML;
}

function buildFieldsFromTemplate(template, borrower) {
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const type = template[keys[i]].input;
        let field;
        switch (type) {
            case ('number'):
                field = getNumberInputFromTemplate(template[keys[i]], borrower);
                break
            case ('select'):
                field = getSelectFromTemplate(template[keys[i]], borrower);
                break;
            case ('radio'):
                field = getRadioFromTemplate(template[keys[i]]);
                break;
        }
        (!output) ? output = field : output += field;
        if (i !== keys.length - 1) output += `\n`;
    }
    return output;
}


/* *************************************************************************************************
************************                        MAIN                        ************************
************************************************************************************************* */
const borrowerTemplate = (borrower) => ({
    'borrower': borrower,
    '1': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} INCOME ==================== -->`,
        class: 'row-2',
        fields: { agiTemplate, annualGrowthTemplate }
    },
    '2': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} PAYMENT ==================== -->`,
        class: 'row-2',
        fields: { monthlyOverpaymentTemplate, fixedOverpaymentTemplate }
    },
    '3': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} PLAN ==================== -->`,
        class: 'row-3',
        fields: { repaymentPlanTemplate, qualifiedPaymentsTemplate, standardCapTemplate }
    },
    '4': {
        comment: `<!-- ==================== ${borrower.toUpperCase()} OPTIONS ==================== -->`,
        class: 'row-2',
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
        class: 'row-2 radios spouseDiv',
        fields: { spouseLoansTemplate, poolOverpaymentsTemplate }
    }
}

//main
async function buildHTML() {
    try {
        const selfSection = document.querySelector('[aria-labelledby="self-heading"]');
        const familySection = document.querySelector('[aria-labelledby="family-heading"]');
        const spouseSection = document.querySelector('[aria-labelledby="spouse-heading"]');
        
        selfSection.innerHTML = buildSection(borrowerTemplate('self'));
        familySection.innerHTML = buildSection(familyTemplate);
        spouseSection.innerHTML = buildSection(borrowerTemplate('spouse'));
    } catch (err) {
        throw (err);
    }
}
