// Sumission form to ./backEnd.js
function submitForm(event) {
    const button = document.getElementById("submitForm");
    button.blur();

    event.preventDefault();
    const results = document.getElementById('results');
    const form = document.getElementById("calcForm");
    const formData = new FormData(form);
    const formObject = Object.fromEntries(formData);

    const pass = formObjectValidation(formObject);
    if (!pass) return;

    let output = calculatePayments(formObject);
    if (output == null || typeof(output) !== 'string') {
        output = `<div class="results-error-div">There was an error processing your request.\nPlease refresh the page and try again.</div>`;
    }
    results.innerHTML = output;
    announce(output);

    const elements = document.getElementsByClassName('submitAnimation');
    Array.from(elements).forEach(element => {
        element.style.display = "block";
        element.classList.remove('animated-' + element.id);
        element.offsetHeight;
        element.classList.add('animated-' + element.id);
    });
    smoothScroll("resultsContainer");
}

// Validates if input is blank and forces focus/tooltip on first empty input
function formObjectValidation(formObject) {
    const keys = Object.keys(formObject);
    for (let i = 0; i < keys.length; i++) {
        const element = document.getElementById(keys[i]);
        if (!element || element.getAttribute('data-type') !== 'number') continue;

        const input         = element.value
        const inputDecimals = (input.includes('.')) ? input.split('.')[1].length : 0;
        const inputNum      = input.strToNum();
        const min           = element.min.strToNum();
        const max           = element.max.strToNum();
        const step          = element.step
        const stepDecimals  = (step.includes('.')) ? step.split('.')[1].length : 0;

        let error = null;
        if (input === "") {
            error = "Please fill out this field.";
        } else if (inputNum < min) {
            error = `Value must be ${min.numToStr(step)} or greater.`;
        } else if (inputNum > max) {
            error = `Value must be ${max.numToStr(step)} or fewer.`;
        } else if (inputDecimals !== stepDecimals) {
            error = `Value ${(!stepDecimals) ? 'must be an integer.' : 'cannot exceed ' + stepDecimals + ' decimal places.'}`;
        }

        if (error) {
            element.focus();
            const errorElement = element.closest('.input-wrapper').querySelector('.error-message');
            const errorId = "error-" + element.id;
            if (errorElement.id !== errorId) errorElement.id = errorId;

            // Sets left side margin based on input type
            const hasPrefix = element.closest(".input-wrapper").classList.contains("dollar");
            if (hasPrefix) {
                errorElement.style.setProperty("--error-arrow-left", "2rem");
            } else {
                errorElement.style.setProperty("--error-arrow-left", "1rem");
            }

            errorElement.textContent = error;
            errorElement.style.display = "flex";
            errorElement.classList.add("fadeIn");
            element.setAttribute('aria-invalid', 'true');
            element.setAttribute('aria-errormessage', errorId);
            announce(error);
            setTimeout(() => announcer.textContent = '', 2000);

            const hide = () => {
                errorElement.textContent = "";
                errorElement.style.display = "none";
                errorElement.classList.remove("fadeIn");
                element.removeAttribute('aria-invalid');
                element.removeAttribute('aria-errormessage');
                element.removeEventListener('input', hide);
                element.removeEventListener('blur', hide);
            };
            element.addEventListener('input', hide);
            element.addEventListener('blur', hide);
            return false;
        }
    }
    return true;
}