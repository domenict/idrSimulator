function getRadioFromTemplate(template) {
    const divClasses = `radio-field ${(template.divClass)}`;
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
                    ${getDataAttributesFromTemplate(data)}
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
        'data-storage': 'localStorage',
        'data-tag': 'spouseField'
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
        'data-tag': 'spouseField'
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
    'divClass': 'spouseLoanDiv',
    'spouseDiv': true,
    'data': {
        'data-storage': 'localStorage',
        'data-tag': 'spouseLoanField'
    },
    'legendId': 'poolOverpayments-legend',
    'legendLabel': 'Combine overpayments?',
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