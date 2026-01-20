/* *************************************************************************************************
************************                     TEMPLATES                      ************************
************************************************************************************************* */

/* -------------------------------------------------
    NUMBER INPUTS
------------------------------------------------- */
function getNumberInputFromTemplate(template, borrower) {
    const id = (template.prepend) ? borrower + '_' + template.id : template.id;
    const unitSpan = (template.type) ? (template.type === 'dollar') ? `\n                            <span class="unit">$</span>` : `\n                            <span class="unit">%</span>` : null;
    const spinnerLabel = (template.prepend) ? (borrower === 'self') ? 'your ' + template.spinnerLabel : "your spouse's " + template.spinnerLabel : template.spinnerLabel;
    return `<div class="field">
                        <label for="${id}">
                            ${template.label}${(template.help) ? getToolTipFromTemplate(template.tooltip, id) : '' }
                        </label>
                        <div class="input-wrapper${(template.type) ? ' ' + template.type : '' }">${(unitSpan) ? unitSpan : ''}
                            <input id="${id}"
                                name="${id}"
                                aria-label="Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}${template.ariaLabel}"
                                type="text"${(template.class) ? '\n                                class="' + template.class + '"' : ''}
                                ${getDataAttributesFromTemplate(template.data)}${(borrower === 'spouse') ? ' data-tag="spouseField"' : ''}
                                autocomplete="off"
                                ${(template.placeholder) ? 'placeholder="' + template.placeholder + '" ' : ''}${(template.value) ? 'value="' + template.value + '" ' : ''}step="${template.step}" min="${template.min}" max="${template.max}" required ${(borrower === 'spouse') ? 'disabled ' : ''}>
                            <span class="error-message"></span>
                            <button type="button" class="spinner-btn spinner-up"   aria-label="Increase ${spinnerLabel}" tabindex="-1"></button>
                            <button type="button" class="spinner-btn spinner-down" aria-label="Decrease ${spinnerLabel}" tabindex="-1"></button>
                        </div>
                    </div>`;
}

const monthlyOverpaymentTemplate = {
    input: 'number',
    label: 'Monthly Overpayment',
    ariaLabel: 'monthly overpayment amount (in dollars)',
    id: 'monthlyOverpayment',
    data: {
        'data-storage': "localStorage",
        'data-type': "number"
    },
    spinnerLabel: 'the monthly overpayment amount',
    type: 'dollar',
    class: null,
    value: '0.00',
    placeholder: null,
    step: '0.01',
    min: '0.00',
    max: '999999999.99',
    tooltip: {
        ariaLabel: 'Help about monthly overpayment',
        text: 'An excess payment in addition to the monthly minimum determined by your selected plan(s) and applied to all borrowers. The default is set for minimum monthly payments.'
    },
    help: true,
    prepend: false,
}

const agiTemplate = {
    input: 'number',
    label: 'Annual AGI (Income)',
    id: 'agi',
    ariaLabel: 'annual adjusted gross income (in dollars)',
    data: {
        'data-storage': "localStorage",
        'data-type': "number"
    },
    spinnerLabel: 'annual adjusted gross income amount',
    type: 'dollar',
    class: null,
    value: `0.00`,
    placeholder: null,
    step: '0.01',
    min: '0.00',
    max: '999999999.99',
    tooltip: {
        ariaLabel: 'Help about annual adjusted gross income entry',
        text: 'AGI (Adjusted Gross Income) is the total gross salary minus applicable deductions which may include 401(k) and HSA/FSA contributions, interest premiums or student loan interest payments (up to $2500). The exact amount can be found on line 11 of your most recent tax return (Form 1040).'
    },
    help: true,
    prepend: true
}

const annualGrowthTemplate = {
    input: 'number',
    label: 'Annual Income Growth',
    ariaLabel: 'annual income growth (in percent)',
    id: 'annualGrowth',
    data: {
        'data-storage': "localStorage",
        'data-type': "number",
        'data-field': "incomeGrowth"
    },
    spinnerLabel: 'annual income growth rate',
    type: 'percent',
    class: 'incomeGrowth',
    value: '0.00',
    placeholder: null,
    step: '0.01',
    min: '0.00',
    max: '99.99',
    tooltip: {
        ariaLabel: 'Help about annual growth features',
        text: 'For a conservative estimate, the median U.S. annual income growth has been 3.8% over the last 30 years.'
    },
    help: true,
    prepend: true
}

const qualifiedPaymentsTemplate = {
    input: 'number',
    label: 'Payments Made',
    id: 'qualifiedPayments',
    ariaLabel: 'number of payments made (maximum 360 on RAP plan)',
    data: {
        'data-storage': "localStorage",
        'data-type': "number",
        'data-field': "qualifiedPayments"
    },
    spinnerLabel: 'number of payments made', 
    type: null,
    class: null,
    value: null,
    placeholder: 'Forgiveness at 360',
    step: '1',
    min: '0',
    max: '360',
    tooltip: {
        ariaLabel: 'Help about determining current number of qualified payments',
        text: 'Number of qualifying monthly payments made towards your public student loans.&#10;&#10;For an exact number, log into StudentAid.gov, search for \'NSLDS Payment Counter Summary\' and paste the link found. Input the difference of the plan maximum and the repayment counter into this field.'
    },
    help: true,
    prepend: true
}

const standardCapTemplate = {
    input: 'number',
    label: 'Permanent Standard',
    ariaLabel: 'permanent standard amount (in dollars)',
    id: 'standardCap',
    data: {
        'data-storage': "localStorage",
        'data-type': "number"
    },
    spinnerLabel: 'the permanent standard amount',
    type: 'dollar',
    class: null,
    value: '0.00',
    placeholder: null,
    step: '0.01',
    min: '0.00',
    max: '999999999.99',
    tooltip: {
        ariaLabel: 'Help about understanding permanent standard',
        text: 'The 10-year standard payment amount that is calculated when enrolled in IBR. Minimum payments cannot exceed this amount while on the plan. If new to IDR, keep this value at the default to calculate it for you.'
    },
    help: true,
    prepend: true,
}
const familySizeTemplate = {
    input: 'number',
    label: 'Family Size',
    ariaLabel: 'family size',
    id: 'familySize',
    data: {
        'data-storage': "localStorage",
        'data-type': "number"
    },
    spinnerLabel: 'family size',
    type: null,
    class: null,
    value: '1',
    placeholder: null,
    step: '1',
    min: '1',
    max: '99',
    tooltip: {
        ariaLabel: 'Help on how to determine family size',
        text: 'Family size includes you, your spouse (if applicable), as well as any relative receiving greater than half of their financial support from your household.&#10;&#10;If married filing separately, it is assumed the borrowers are living together and the borrower with the higher AGI claims all dependents.'
    },
    help: true,
    prepend: false
}

const dependentTemplate = {
    input: 'number',
    label: 'Child Dependents',
    ariaLabel: 'child dependents',
    id: 'dependents',
    data: {
        'data-storage': "localStorage",
        'data-type': "number"
    },
    spinnerLabel: 'child dependents',
    type: null,
    class: null,
    value: "0",
    placeholder: null,
    step: '1',
    min: '0',
    max: '97',
    tooltip: {
        ariaLabel: 'Help on how to determine eligible dependents',
        text: 'Child dependents are individuals 17 years of age or less.'
    },
    help: true,
    prepend: false
}

/* -------------------------------------------------
    SELECT INPUTS
------------------------------------------------- */
function getSelectFromTemplate(template, borrower) {
    const id = (template.prepend) ? borrower + '_' + template.id : template.id;
    return `<div class="field${(template.spouseDiv) ? ' spouseDiv' : ''}">
                <label for="${id}-trigger">
                    ${template.label}${(template.help) ? getToolTipFromTemplate(template.tooltip, id) : '' }
                </label>
                <div class="select-wrapper" data-id="${id}">
                    <button type="button" 
                            id="${id}-trigger"
                            class="select-trigger" 
                            aria-haspopup="listbox" 
                            aria-expanded="false"
                            aria-label="${template.label}">
                        <span class="select-value">
                            ${template.options[Object.keys(template.options)[0]]}
                        </span>
                    </button>
                    <ul class="select-dropdown" role="listbox" tabindex="0" aria-activedescendant="${id}-opt-0">
                        ${getOptionsFromTemplate(template.options, id)}
                    </ul>

                    <!-- Add a real hidden input for form submission & localStorage -->
                    <input type="hidden" 
                        id="${id}" 
                        name="${id}" 
                        class="hidden-select-input"
                        value="${Object.keys(template.options)[0]}"
                        ${getDataAttributesFromTemplate(template.data)}
                        ${(borrower === 'spouse' || template.spouseDiv) ? 'data-tag="spouseField" required disabled ' : 'required'}>
                </div>
            </div>`;
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
    input: 'select',
    label: 'Overpayment Scaling',
    id: 'fixedOverpayments',
    data: {
        'data-storage': "localStorage"
    },
    tooltip: {
        ariaLabel: 'Help about overpayment scaling',
        text: 'For scaling the overpayment amount if income is expected to grow over time.&#10;&#10;The minimum overpayment will equal the \'Monthly Overpayment\' field and will scale proportionally to the estimated total income of the household.'
    },
    options: {
        'yes': 'Fixed Overpayments',
        'no': 'Scale with Income Growth'
    },
    help: true,
    prepend: false,
    spouseDiv: false
}

const repaymentPlanTemplate = {
    input: 'select',
    label: 'Repayment Plan',
    id: 'repaymentPlan',
    data: {
        'data-storage': "localStorage",
        'data-field': "repaymentPlan"
    },
    tooltip: false,
    options: {
        'rap': 'RAP',
        'old': 'Old IBR',
        'new': 'New IBR'
    },
    help: false,
    prepend: true,
    spouseDiv: false
}

const interestReductionTemplate = {
    input: 'select',
    label: 'Autopay Reduction',
    id: 'interestReduction',
    data: {
        'data-storage': "localStorage",
    },
    tooltip: {
        ariaLabel: 'Help about interest reduction features',
        text: 'A federally mandated 0.25% reduction for public loans rates if enrolled in auto-pay that will be applied during analysis.'
    },
    options: {
        'no': 'Not applicable',
        'yes': 'Enrolled in autopay'
    },
    help: true,
    prepend: true,
    spouseDiv: false
}

const pslfTemplate = {
    input: 'select',
    label: 'PSLF Eligibility',
    id: 'pslfEligible',
    data: {
        'data-storage': "localStorage",
        'data-field': "pslfEligibility"
    },
    tooltip: false,
    options: {
        'no': 'Not Eligible',
        'yes': 'Eligible'
    },
    help: false,
    prepend: true,
    spouseDiv: false
}

const residencyTemplate = {
    input: 'select',
    label: 'Residency',
    id: 'residency',
    data: {
        'data-storage': "localStorage"
    },
    tooltip: false,
    options: {
        'us': 'Contiguous US',
        'ak': 'Alaska',
        'hi': 'Hawaii'
    },
    help: false,
    prepend: false,
    spouseDiv: false
}


/* -------------------------------------------------
    RADIO INPUTS
------------------------------------------------- */
function getRadioFromTemplate(template) {
    return `<div class="radio-field${(template.divClass) ? ' ' + template.divClass : ''}">
                        <fieldset class="radio-group" aria-labelledby="${template.legendId}">
                            <legend id="${template.legendId}">${template.legendLabel}</legend>${getRadioOptionsFromTemplate(template.radios)}
                        </fieldset>
                    </div>`;
}

function getRadioOptionsFromTemplate(template) {
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const obj = template[keys[i]];
        const buttonTemplate = `
                            
                            <label class="radio-label" for="${keys[i]}">
                                <input type="radio" id="${keys[i]}" name="${obj.name}" value="${obj.value}" ${getDataAttributesFromTemplate(obj.data)}${(obj.spouseDiv) ? ' data-tag="spouseField"' : ''}${(obj.checked) ? ' checked' : ''}${(obj.spouseDiv) ? ' disabled' : ''}>
                                <svg class="radio-circle" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false" tabindex="-1">
                                    <circle class="radio-border" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                                    <circle class="radio-dot" cx="12" cy="12" r="6" fill="currentColor"/>
                                </svg>
                                <span class="radio-text">${obj.text}</span>
                            </label>`;
        (!output) ? output = buttonTemplate : output += buttonTemplate;
    }
    return output;
}

const marriedRadioTemplate = {
    input: 'radio',
    divClass: 'marriedDiv',
    legendId: 'married-legend',
    legendLabel: 'Are you legally married?',
    radios: {
        'married_yes': {
            name: 'married',
            value: 'yes',
            data: {
                'data-storage': "localStorage"
            },
            text: 'Yes',
            checked: false,
            spouseDiv: false
        },
        'married_no' : {
            name: 'married',
            value: 'no',
            data: {
                'data-storage': "localStorage"
            },
            text: 'No',
            checked: true,
            spouseDiv: false
        }
    }
}

const filingTemplate = {
    input: 'radio',
    divClass: 'spouseDiv',
    legendId: 'filing-legend',
    legendLabel: 'How are you filing taxes?',
    radios: {
        'filing_jointly': {
            name: 'filingJointly',
            value: 'yes',
            data: {
                'data-storage': "localStorage"
            },
            text: 'Jointly',
            checked: true,
            spouseDiv: true
        },
        'filing_separately' : {
            name: 'filingJointly',
            value: 'no',
            data: {
                'data-storage': "localStorage"
            },
            text: 'Separately',
            checked: false,
            spouseDiv: true
        }
    }
}

const priorityTemplate = {
    input: 'radio',
    divClass: 'spouseDiv',
    legendId: 'priority-legend',
    legendLabel: 'Whose loans are priority?',
    radios: {
        'priority_self': {
            name: 'priority',
            value: 'self',
            data: {
                'data-storage': "localStorage"
            },
            text: 'Self',
            checked: true,
            spouseDiv: true
        },
        'priority_spouse' : {
            name: 'priority',
            value: 'spouse',
            data: {
                'data-storage': "localStorage"
            },
            text: 'Spouse',
            checked: false,
            spouseDiv: true
        },
        'priority_both' : {
            name: 'priority',
            value: 'both',
            data: {
                'data-storage': "localStorage"
            },
            text: 'Both',
            checked: false,
            spouseDiv: true
        }
    }
}


/* -------------------------------------------------
    LOANS
------------------------------------------------- */
function getLoansFromTemplate(borrower) {
    return `\n
                <!-- ==================== ${borrower.toUpperCase()} LOANS ==================== -->
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
                            ${getRowTemplate(borrower, 1)}
                        </tbody>
                    </table>
                </div>`;
}

function getRowTemplate(borrower, loanNumber) {
    const isSpouse = borrower === 'spouse';
    const disabled = isSpouse && window.getComputedStyle(document.getElementById("spouseBlock")).getPropertyValue('display') === 'none';
    return `<tr id="${borrower}_loan${loanNumber}" aria-disabled="false">
                                <td class="row-label">
                                    <span id="${borrower}_loan${loanNumber}_span">Loan ${loanNumber}</span>
                                </td>
                                <td>
                                    <div class="input-wrapper dollar">
                                        <span class="unit">$</span>
                                        <input id="${borrower}_loan${loanNumber}_principal"
                                            name="${borrower}_loan${loanNumber}_principal"
                                            type="text"
                                            data-storage="localStorage" data-type="number" ${(isSpouse) ? ' data-tag="spouseField"' : ''}
                                            autocomplete="off"
                                            aria-label="Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan ${loanNumber} principal balance"
                                            step="0.01" min="0.01" max="999999.99" required ${(disabled) ? 'disabled' : ''}>
                                        <span class="error-message"></span>
                                        <button type="button" class="spinner-btn spinner-up"   aria-label="Increase loan ${loanNumber} principal amount" tabindex="-1"></button>
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
                                            step="0.01" min="0" max="999999.99" required ${(disabled) ? 'disabled' : ''}>
                                        <span class="error-message"></span>
                                        <button type="button" class="spinner-btn spinner-up"   aria-label="Increase loan ${loanNumber} accrued interest" tabindex="-1"></button>
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
                                            step="0.01" min="0" max="99.99" required ${(disabled) ? 'disabled' : ''}>
                                        <span class="error-message"></span>
                                        <button type="button" class="spinner-btn spinner-up"   aria-label="Increase loan ${loanNumber} interest rate" tabindex="-1"></button>
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
}

/* *************************************************************************************************
************************                      HELPERS                       ************************
************************************************************************************************* */

function getToolTipFromTemplate(template, id) {
    const tooltipID = "tooltip-" + id;
    return `
                            <span class="help-wrapper"
                                role="button"
                                tabindex="0"
                                aria-label="${template.ariaLabel}"
                                aria-describedby="${tooltipID}"
                                aria-expanded="false">
                                <svg class="help-icon" focusable="false" tabIndex="-1">
                                    <use href="#help-hover"></use>
                                </svg>
                                <div id="${tooltipID}" class="tooltip" role="tooltip" aria-hidden="true" tabIndex="-1">${template.text}
                                </div>
                            </span>`;
}

function getDataAttributesFromTemplate(template) {
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const attribute = keys[i] + '="' + template[keys[i]] + '"';
        (!output) ? output = attribute : output += attribute;
        if (i !== keys.length - 1) output += ' ';
    }
    return output;
}

function buildSection(template) {
    const validBorrower = template.borrower === 'self' || template.borrower === 'spouse';
    return `
                <h2 id="${template.borrower}-heading" class="field-header">${template.borrower.toUpperCase()}</h2>
                ${buildRows(template)}${(template.borrower && validBorrower) ? getLoansFromTemplate(template.borrower) : ''}
            `;
}

function buildRows(template) {
    const borrower = template.borrower;
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === 'borrower') continue;
        const row = buildRowFromTemplate(template[keys[i]], borrower);
        (!output) ? output = row : output += row;
        if (i !== keys.length - 2) output += `
        `;
    }
    return output;
}

function buildRowFromTemplate(template, borrower) {
    return `${(template.comment) ? '\n                ' + template.comment : ''}
                <div ${(template.id) ? 'id="' + template.id + '" ' : ''}class="${template.class}">
                    ${buildFieldsFromTemplate(template.fields, borrower)}
                </div>`;
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
        (!output) ? output = field : output += `\n                    ` + field;
        if (i !== keys.length - 1) output += `
        `;
    }
    return output;
}


/* *************************************************************************************************
************************                        MAIN                        ************************
************************************************************************************************* */
const selfTemplate = {
    borrower: 'self',
    1: {
        comment: `<!-- ==================== PAYMENT OPTIONS ==================== -->`,
        id: null,
        class: 'row-2',
        fields: {
            monthlyOverpaymentTemplate,
            fixedOverpaymentTemplate
        }
    },
    2: {
        comment: `<!-- ==================== SELF INCOME ==================== -->`,
        id: null,
        class: 'row-2',
        fields: {
            agiTemplate,
            annualGrowthTemplate
        }
    },
    3: {
        comment: `<!-- ==================== SELF PLAN ==================== -->`,
        id: null,
        class: 'row-3',
        fields: {
            repaymentPlanTemplate,
            qualifiedPaymentsTemplate,
            standardCapTemplate
            
        }
    },
    4: {
        comment: `<!-- ==================== SELF OPTIONS ==================== -->`,
        id: null,
        class: 'row-2',
        fields: {
            pslfTemplate,
            interestReductionTemplate
        }
    }
}

const familyTemplate = {
    borrower: 'family',
    1: {
        comment: null,
        id: 'familyInfo',
        class: 'row-3',
        fields: {
            familySizeTemplate,
            dependentTemplate,
            residencyTemplate
        }
    },
    2: {
        comment: null,
        id: 'radios-top',
        class: 'row-1 radios',
        fields: {
            marriedRadioTemplate,
            filingTemplate,
        }
    },
    3: {
        comment: null,
        id: 'radios-bottom',
        class: 'row-1 radios spouseDiv',
        fields: {
            priorityTemplate
        }
    }
}

const spouseTemplate = {
    borrower: 'spouse',
    1: {
        comment: `<!-- ==================== SPOUSE INCOME ==================== -->`,
        id: null,
        class: 'row-2',
        fields: {
            agiTemplate,
            annualGrowthTemplate
        }
    },
    2: {
        comment: `<!-- ==================== SPOUSE PLAN ==================== -->`,
        id: null,
        class: 'row-3',
        fields: {
            repaymentPlanTemplate,
            qualifiedPaymentsTemplate,
            standardCapTemplate
        }
    },
    3: {
        comment: `<!-- ==================== SPOUSE OPTIONS ==================== -->`,
        id: null,
        class: 'row-2',
        fields: {
            pslfTemplate,
            interestReductionTemplate
        }
    }
}

//main
async function buildHTML() {
    try {
        const selfSection = document.querySelector('[aria-labelledby="self-heading"]');
        const familySection = document.querySelector('[aria-labelledby="family-heading"]');
        const spouseSection = document.querySelector('[aria-labelledby="spouse-heading"]');
    
        selfSection.innerHTML = buildSection(selfTemplate);
        familySection.innerHTML = buildSection(familyTemplate);
        spouseSection.innerHTML = buildSection(spouseTemplate);
    } catch (err) {
        throw (err);
    }
}
