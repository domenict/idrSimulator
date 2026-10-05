document.addEventListener('DOMContentLoaded', async function() {
    const loader = document.getElementById('initial-loader');
    try {
        const prefersDark = localStorage.getItem('theme') === "dark" || window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            delayTransition(true);
            document.documentElement.setAttribute('data-theme', 'dark');

            const button = document.getElementById('themeToggle');
            button.setAttribute('aria-label', 'Switch to light mode');
        }

        // Build HTML from templates, page hidden to avoid CLS getting destroyed
        await buildHTML();
        document.getElementById("page-wrapper").style.visibility = 'visible';
        
        addFormListeners();
        addModalListeners();
    } catch (err) {
        console.log(err.message);
        loader.innerHTML = `
            <p class="loader-text">An error occured while loading the page.</p>
            <p class="loader-text">Please refresh the page and try again.</p>
        `;
        return;
    }

    setTimeout(() => {
        const loader = document.getElementById('initial-loader');
        loader.click(); // Spoofs LCP due to Google's (LCP) calculation not liking my tooltips, delay needed to be bullet proof
        loader.remove();
        
        const savedSession = localStorage.getItem("savedSession");
        if (savedSession) showModal('restore', savedSession);
    }, 75);
});

function addFormListeners() {
    // Top modal buttons via event delegation
    document.body.addEventListener('click', function(e) {
        if (e.target.matches('#saveToStorage, #deleteStorage')) {
            e.preventDefault();
            showModalHandler(e);
        }
    });

    // Theme Toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);

    // Submits form to "back-end" with custom Enter handling 
    document.getElementById("calcForm").addEventListener("submit", submitForm);
    document.getElementById('calcForm').addEventListener('keydown', moveToNext);

    // Toggles spouse divs based
    const marriedRadios = document.getElementsByName('married');
    Array.from(marriedRadios).forEach(radio => {
        radio.addEventListener('change', toggleMarriedListenerHandler);
    });
    const spouseHasLoans = document.getElementsByName('spouseHasLoans');
    Array.from(spouseHasLoans).forEach(radio => {
        radio.addEventListener('change', toggleSpouseHasLoansListenerHandler);
    });

    // Number input handling
    const clampNumberInputs = document.querySelectorAll('[data-type="number"]');
    clampNumberInputs.forEach(element => { 
        element.addEventListener("change", handleNumberInputChange);
        element.addEventListener("focus", handleNumberInputFocus);
        element.addEventListener("blur", handleNumberInputBlur);
        element.addEventListener("beforeinput", handleNumberInputBeforeInput);
    });

    // Steps integer number inputs for custom spinners, supports holding and acceleration
    document.querySelectorAll('.input-wrapper').forEach(wrapper => createSpinnerListeners(wrapper));

    // Add custom select drop downs, resizes automatically if orientation changes
    document.querySelectorAll('.select-wrapper').forEach(wrapper => createSelectListeners(wrapper));
    window.addEventListener('resize', setSelectDropdownHeight);

    // Plan type changes qualifiedPayments min/max and placeholder
    const clampQualifiedPayments = Array.from(document.querySelectorAll('[data-field="repaymentPlan"], [data-field="pslfEligibility"]'));
    clampQualifiedPayments.forEach(element => { element.addEventListener('change', repaymentPlanListenerHandler)});

    // Adding/removing dependents updates family size minimum
    document.getElementById('dependents').addEventListener('change', updateFamilySizeMinHandler);

    // Add/delete row buttons through event delegation
    document.getElementById('selfLoans').addEventListener('click', handleLoanButtonClick);
    document.getElementById('selfLoans').addEventListener('keydown', handleLoanButtonKeydown);
    document.getElementById('spouseLoans').addEventListener('click', handleLoanButtonClick);
    document.getElementById('spouseLoans').addEventListener('keydown', handleLoanButtonKeydown);

    // Makes tooltips accessible
    document.querySelectorAll('.help-wrapper').forEach(wrapper => createTooltipListeners(wrapper));

    // Sets bounding box for tooltips, resizes automatically if orientation changes
    const helpWrappers = Array.from(document.querySelectorAll('.help-wrapper'));
    helpWrappers.forEach(element => {
        element.addEventListener('focusin', tooltipBoundingBox);
        element.addEventListener('pointerenter', tooltipBoundingBox);
    })
    const resizeObserverTooltip = new ResizeObserver(resizeTooltip);
    resizeObserverTooltip.observe(document.documentElement);
}

function addModalListeners() {
    const input = document.getElementById("modal-passphrase-input");
    input.addEventListener('click', updateCapsLockWarning);
    input.addEventListener('keydown', handleModalInputKeydown);
    input.addEventListener('keyup', updateCapsLockWarning);
    input.addEventListener('focus', handleNumberInputFocus);
    input.addEventListener('blur', handleModalInputBlur);

    const showHideButton = document.getElementById("modal-show-hide-toggle");
    showHideButton.addEventListener("pointerdown", handleModalPassToggleShow);
    showHideButton.addEventListener("pointerup", handleModalPassToggleHide);
    showHideButton.addEventListener('keydown', handleModalPassToggleShowKey);
    showHideButton.addEventListener('keyup', handleModalPassToggleHideKey);
    showHideButton.addEventListener("blur", handleModalPassToggleBlur);
}