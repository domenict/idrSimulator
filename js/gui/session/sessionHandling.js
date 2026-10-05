// Restores encrypted data in local storage while adding any HTML elements missing from previous session
async function loadFromStorage(passphrase, savedSession) {
    const fromLocalStorageObject = await runWorkerTask('decrypt', [passphrase, savedSession]);
    const error = fromLocalStorageObject["error"];
    if (error) {
        console.log(error);
        return false;
    }

    // ---- first, restore cache -----------------
    const keysFromLocalStorageCache = Object.keys(fromLocalStorageObject["cache"]);
    for (let i = 0; i < keysFromLocalStorageCache.length; i++) {
        const key = keysFromLocalStorageCache[i];
        cache[key] = fromLocalStorageObject["cache"][key];
    }
    delete fromLocalStorageObject["cache"];

    // ---- then, loan counts (they create DOM rows) -----------------
    const selfLoanCount = fromLocalStorageObject["selfLoanCount"];
    const spouseLoanCount = fromLocalStorageObject["spouseLoanCount"];
    if (selfLoanCount && selfLoanCount > 1) { await addBulkEmptyLoans("selfLoans", selfLoanCount); }
    if (spouseLoanCount && spouseLoanCount > 1) { await addBulkEmptyLoans("spouseLoans", spouseLoanCount); }
    delete fromLocalStorageObject["selfLoanCount"];
    delete fromLocalStorageObject["spouseLoanCount"];
    
    // ---- finally, fill every stored field -------------------------------
    const keysFromLocalStorage = Object.keys(fromLocalStorageObject);
    for (const key of keysFromLocalStorage) {
        const value = fromLocalStorageObject[key];
        const element = document.getElementById(key);

        if (!VALID_INPUTS.test(value)) {
            if (!value && element.value) element.value = '';
            continue;
        }

        if (element) {
            element.value = value;
            if (element.classList.contains('hidden-select-input')) {
                const { options } = getSelectComponents(element);
                let index = 0;
                for (index; index < options.length; index++) {
                    if (options[index].getAttribute('data-value') === element.value) break;
                }
                setSelectOption(options[index], { suppressEvents: true });
            }
        } else {
            const radios = Array.from(document.getElementsByName(key)).filter(input => input.type === 'radio');
            radios.length && Array.from(radios).forEach(r => {
                if (r.value === value) r.checked = true;
            });
        }
    }
    return true;
}

// Encrypts current session to local storage
async function saveToStorage(passphrase) {    
    localStorage.removeItem("savedSession");

    // Get loan count first
    const selfLoanCount = document.getElementById("selfLoans").children[1].childElementCount;
    const spouseLoanCount = document.getElementById("spouseLoans").children[1].childElementCount;
    const toLocalStorage = document.querySelectorAll('[data-storage="localStorage"]');
    const toLocalStorageObject = Array.from(toLocalStorage).reduce((obj, element) => {
        if (element.type === 'radio') {
            obj[element.name] = document.querySelector('input[name="' + element.name + '"]:checked').value;
        } else {
            obj[element.name] = element.value;
        }
        return obj;
    }, {});
    const keysToLocalStorageObject = Object.keys(toLocalStorageObject);

    // Validate and remove empty/invalid inputs
    for (const key of keysToLocalStorageObject) {
        const value = toLocalStorageObject[key];
        if (value && !VALID_INPUTS.test(value)) {
            delete toLocalStorageObject[key];
            continue;
        }
    }
    toLocalStorageObject["selfLoanCount"] = selfLoanCount;
    toLocalStorageObject["spouseLoanCount"] = spouseLoanCount;
    toLocalStorageObject["cache"] = structuredClone(cache);

    const encryptedsavedSession = await runWorkerTask('encrypt', [passphrase, toLocalStorageObject]);
    const error = encryptedsavedSession["error"];
    if (error) {
        console.log(error);
        return false;
    }
    
    localStorage.setItem("savedSession", encryptedsavedSession);
    return true;
}

// Removes all data stored
async function clearSessions() {
    try {
        // Clear storage/cache
        localStorage.removeItem("savedSession");
        const cacheKeys = Object.keys(cache);
        cacheKeys.forEach(key => { delete cache[key]; });

        // Clear form, announcer and results
        document.getElementById('calcForm').reset();
        announcer.textContent = '';
        document.getElementById("results").textContent = '';
        Array.from(document.getElementsByClassName('submitAnimation')).forEach(el => { el.style.display = "none"; });

        // Reset custom selects
        document.querySelectorAll('.select-wrapper').forEach(wrapper => {
            const { options } = getSelectComponents(wrapper);
            setSelectOption(options[0], { suppressEvents: true });
        });

        // Remove added DOM rows
        const parentElementIds = ["selfLoans", "spouseLoans"];
        parentElementIds.forEach(element => {
            const loanTableBody = document.getElementById(element).querySelector('tbody');
            let borrowerLoanCount = loanTableBody.childElementCount;
            while(borrowerLoanCount > 1) {
                const rowElement = loanTableBody.children[borrowerLoanCount - 1];
                removeLoanInputListeners(rowElement);
                rowElement.remove();
                borrowerLoanCount--;
            }
            enableRow(element.replace('Loans','_loan1'));
        });

        // Reset toggle events and scroll before returning
        updateToggleEvents();
        requestAnimationFrame(() => window.scrollTo(0, 0));
        return true;
    } catch (err) {
        console.log(err.message);
        return false;
    }
}
