function getSelectFromTemplate(template, borrower) {
    const id = (borrower) ? borrower + '_' + template.id : template.id;
    const label = template.label;
    const tooltip = template.tooltip;
    const options = template.options;
    const data = template.data;
    const disabled = borrower === 'spouse';

    const loanField = template.loanField;
    const additionalAttributes = `${(borrower) ? (loanField) ? 'data-tag="' + borrower + 'LoanField"' : 'data-tag="' + borrower + 'Field"' : ''}`;
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
        'text': 'For scaling the overpayment amount proportionally to income growth. This setting carries over to the other borrower if all loans are paid in full and combining overpayments is selected.'
    },
    'options': {
        'yes': 'Fixed Overpayments',
        'no': 'Scale with Income Growth'
    },
    'loanField': true
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
    },
    'loanField': true
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
        'text': 'A federally mandated 0.25% reduction for federal loans rates if enrolled in auto-pay will be applied if this is selected.'
    },
    'options': {
        'no': 'Not applicable',
        'yes': 'Enrolled in autopay'
    },
    'loanField': true
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
    },
    'loanField': true
}

const residencyTemplate = {
    'input': 'select',
    'label': 'Residency',
    'id': 'residency',
    'data': {
        'data-storage': 'localStorage'
    },
    'options': {
        'al': 'Alabama',
        'ak': 'Alaska',
        'az': 'Arizona',
        'ar': 'Arkansas',
        'ca': 'California',
        'co': 'Colorado',
        'ct': 'Connecticut',
        'de': 'Delaware',
        'fl': 'Florida',
        'ga': 'Georgia',
        'hi': 'Hawaii',
        'id': 'Idaho',
        'il': 'Illinois',
        'in': 'Indiana',
        'ia': 'Iowa',
        'ks': 'Kansas',
        'ky': 'Kentucky',
        'la': 'Louisiana',
        'me': 'Maine',
        'md': 'Maryland',
        'ma': 'Massachusetts',
        'mi': 'Michigan',
        'mn': 'Minnesota',
        'ms': 'Mississippi',
        'mo': 'Missouri',
        'mt': 'Montana',
        'ne': 'Nebraska',
        'nv': 'Nevada',
        'nh': 'New Hampshire',
        'nj': 'New Jersey',
        'nm': 'New Mexico',
        'ny': 'New York',
        'nc': 'North Carolina',
        'nd': 'North Dakota',
        'oh': 'Ohio',
        'ok': 'Oklahoma',
        'or': 'Oregon',
        'pa': 'Pennsylvania',
        'ri': 'Rhode Island',
        'sc': 'South Carolina',
        'sd': 'South Dakota',
        'tn': 'Tennessee',
        'tx': 'Texas',
        'ut': 'Utah',
        'vt': 'Vermont',
        'va': 'Virginia',
        'wa': 'Washington',
        'wv': 'West Virginia',
        'wi': 'Wisconsin',
        'wy': 'Wyoming'
    },
    'loanField': false
}