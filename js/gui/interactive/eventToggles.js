// Element attributes must be set to correct state after restoring/deleting session
function updateToggleEvents() {
    toggleSpouseFields();
    updateFamilySizeMin();
    Array.from(document.querySelectorAll('[data-field="repaymentPlan"]')).forEach(element => repaymentPlanToggle(element));

    for (const key in cache) {
        if (key.includes('.disabled')) {
            const rowID = key.split('.disabled')[0];
            disableRow(rowID);
        }
    }
}

// Theme toggle + transition delay to prevent elements with transitions from flashing
function toggleTheme() {
    delayTransition(false);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');

    const button = document.getElementById('themeToggle');
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    button.blur();
}

function delayTransition(fromLoad) {
    const overlay = document.getElementById("overlay");
    const pageWrapper = document.getElementById("page-wrapper");
    overlay.classList.add("delay-transition");
    pageWrapper.classList.add("delay-transition");

    const themeIcon = document.getElementById("themeToggle");
    if (!fromLoad) themeIcon.classList.add("override-delay");

    setTimeout(() =>  {
        overlay.classList.remove("delay-transition");
        pageWrapper.classList.remove("delay-transition");
        if (!fromLoad) themeIcon.classList.remove("override-delay");
    }, 10);
}

// Modifies qualifiedPayment min/max based on plan
function repaymentPlanListenerHandler(e) {
    repaymentPlanToggle(e.target);
}
function repaymentPlanToggle(element) {
    const id = element.id;
    const borrower = id.split("_")[0];
    const repaymentPlanElement = document.getElementById(borrower + '_repaymentPlan');
    const qualifiedPaymentsElement = document.getElementById(borrower + '_qualifiedPayments');
    const pslfEligibleElement = document.getElementById(borrower + "_pslfEligible");

    const repaymentPlan = repaymentPlanElement.value;
    const qualifiedPayments = qualifiedPaymentsElement.value.strToNum();
    const pslfEligible = pslfEligibleElement.value === 'yes';

    // Sets qualifiedPayment max/placeholders based on repaymentPlan selection
    const planMap = ["old", 300, "new", 240, "rap", 360];
    const index = planMap.indexOf(repaymentPlan) + 1;
    const planMax = planMap[index];
    const maxPayments = (pslfEligible) ? 120 : planMax;
    qualifiedPaymentsElement.placeholder = "Forgiveness at " + maxPayments;
    qualifiedPaymentsElement.max = maxPayments;
    
    const key = qualifiedPaymentsElement.id + ".metPlanMax";
    if (cache[key] !== undefined) {
        if (cache[key] <= maxPayments) {
            qualifiedPaymentsElement.value = cache[key];
            delete cache[key];
        } else {
            qualifiedPaymentsElement.value = maxPayments.toString();
        }
    } else if (qualifiedPayments > maxPayments) {
        cache[key] = qualifiedPaymentsElement.value;
        qualifiedPaymentsElement.value = maxPayments.toString();
    }

    // For accessibility 
    const selectList = document.querySelector(`[data-id="${repaymentPlanElement.id}"]`).querySelector('.select-dropdown');
    const planShort = selectList.querySelector(`li[data-value="${repaymentPlan}"]`).textContent;
    const description = `Your${(borrower === 'spouse') ? ' spouse\'s' : ''} number of payments made (maximum ${maxPayments} ${(pslfEligible) ? 'through PSLF' : 'on ' + planShort + ' plan'})`
    const wrapper = qualifiedPaymentsElement.closest('.input-wrapper');
    qualifiedPaymentsElement.setAttribute('aria-label', description);
    wrapper.querySelector('.spinner-up').setAttribute('aria-label', `Increase ${description.charAt(0).toLowerCase() + description.slice(1)}`);
    wrapper.querySelector('.spinner-down').setAttribute('aria-label', `Decrease ${description.charAt(0).toLowerCase() + description.slice(1)}`);
    
    let message;
    if (id === borrower + '_pslfEligible') {
        message = (pslfEligible) ? 
            `You have selected PSLF eligible for your${(borrower === 'self' ? 'self. ' : ' spouse. ')}` :
            `You have removed PSLF eligiblity from your${(borrower === 'self' ? 'self. ' : ' spouse. ')}`;
        message += (qualifiedPayments > maxPayments) ?
            `Maximum qualifying payments reduced to ${maxPayments}. Value clamped from ${qualifiedPayments}. ` :
            `Forgiveness now after ${maxPayments} qualifying payments. `;
    } else {
        message = `Your${(borrower === 'spouse') ? ' spouse\'s' : ''} plan changed to ${planShort}. `;
        if (qualifiedPayments > maxPayments) {
            message += `Maximum qualifying payments reduced to ${maxPayments}. Value clamped from ${qualifiedPayments}. `;
        } else {
            if (pslfEligible) {
                message += `Maximum qualifying payments remains at ${maxPayments} due to PSLF eligibility. `
            } else {
                message += `Forgiveness now after ${maxPayments} qualifying payments. `;
            }
        }
    }
    announce(message); 
}

function updateFamilySizeMinHandler(e) { updateFamilySizeMin() };
function updateFamilySizeMin() {
    const isMarried = document.querySelector('input[name="married"]:checked')?.value === 'yes';
    const familySize = document.getElementById('familySize');
    const dependents = document.getElementById('dependents');
    const dependentsValue = dependents.value.strToNum();

    const newMin = ((isMarried) ? 2 : 1) + dependentsValue;
    familySize.min = newMin;
    return newMin;
}

function toggleMarriedListenerHandler(e) {
    toggleSpouseFields(e.target);
    updateFamilySizeMin();
}
function toggleSpouseHasLoansListenerHandler(e) {
    toggleSpouseFields(e.target);
}
function toggleSpouseFields(triggerElement) {
    const trigger = (triggerElement) ? triggerElement.name : null;
    const isMarried = document.querySelector('input[name="married"]:checked')?.value === 'yes';
    const spouseHasLoans = document.querySelector('input[name="spouseHasLoans"]:checked')?.value === 'yes';

    const spouseSection = document.getElementById("spouseSection");
    const familySection = document.getElementById("familySection");
    const radiosTop = document.getElementById('radios-top');
    const radiosBottom = document.getElementById('radios-bottom');
    const spouseFields = document.querySelectorAll('[data-tag="spouseField"]');
    const spouseLoanFields = document.querySelectorAll('[data-tag="spouseLoanField"]');
    
    const form = document.getElementById('calcForm');
    const oldFormHeight = form.offsetHeight;
    const docHeight = document.documentElement.scrollHeight;
    const scrollY = window.scrollY;
    const windowHeight = window.innerHeight;
    requestAnimationFrame(() => {
        if (!isMarried) {
            spouseSection.className = 'hideAllSpouse';
            familySection.className = 'hideAllSpouse';
            radiosTop.classList.replace('row-2', 'row-1');
            radiosBottom.classList.replace('row-2', 'row-1');

            const allFields = [...spouseFields, ...spouseLoanFields];
            allFields.forEach(field => { field.disabled = true; });
        } else if (isMarried && !spouseHasLoans) {
            spouseSection.className = 'hideSpouseLoanOnly';
            familySection.className = 'hideSpouseLoanOnly';
            radiosTop.classList.replace('row-1', 'row-2');
            radiosBottom.classList.replace('row-2', 'row-1');

            Array.from(spouseFields).forEach(field => {
                const wrapper = field.closest('.input-wrapper');
                const wrapperDisabled = (wrapper) ? wrapper.classList.contains('inputDisabled') : false;
                if (!wrapperDisabled) field.disabled = false;  
            });
            Array.from(spouseLoanFields).forEach(field => { field.disabled = true; });
        } else {
            spouseSection.className = '';
            familySection.className = '';
            radiosTop.classList.replace('row-1', 'row-2');
            radiosBottom.classList.replace('row-1', 'row-2');

            const allFields = [...spouseFields, ...spouseLoanFields];
            allFields.forEach(field => {
                const wrapper = field.closest('.input-wrapper');
                const wrapperDisabled = (wrapper) ? wrapper.classList.contains('inputDisabled') : false;
                if (!wrapperDisabled) field.disabled = false;  
            });
        }
        if (!trigger) return; // Early return if not a triggered event (i.e. restoring a session)

        // Announcement
        if (trigger === 'married') {
            let message = `Spouse sections have been ${(isMarried) ? 'added.' : 'removed.'}`;
            if (isMarried && !spouseHasLoans) message += ` Spouse loan fields remain hidden.`;
            announce(message);
        } 
        if (trigger === 'spouseHasLoans') {
            let message = `Spouse loan fields have been ${(spouseHasLoans) ? 'added.' : 'removed.'}`;
            announce(message);
        }

        // Adjust spacer/scroll
        const newFormHeight = form.offsetHeight;
        if (newFormHeight > oldFormHeight) {
            removeFromSpacer(newFormHeight - oldFormHeight - 1);
            const form = document.getElementById('calcForm')
            const formBottomVisible = form.offsetTop + form.offsetHeight <= window.innerHeight + window.scrollY;
            if (!formBottomVisible) {
                const targetElement = (trigger === 'married') ? radiosTop.id : radiosBottom.id;
                smoothScroll(targetElement);
            }
        } else {
            addToSpacer(oldFormHeight - newFormHeight + 1, docHeight, scrollY, windowHeight);
        }
    });
}