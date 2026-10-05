// Helper for add/loan event delegation
function handleLoanButtonClick(e) {
    const btn = e.target.closest('.addLoan, .deleteLoan, .toggleLoan');
    if (!btn || !document.body.contains(btn) || btn.disabled) return;
    btn.blur();
    
    const row = btn.closest('tr');
    if (!row || !document.body.contains(row)) return;

    e.preventDefault();
    e.stopPropagation();
    
    const onCooldown = btn.classList.contains('buttonOnCooldown');
    if (!onCooldown) {
        if (btn.classList.contains('addLoan')) {
            addRow(row);
        } else if (btn.classList.contains('deleteLoan')) {
            deleteRow(row);
        } else {
            toggleLoan(btn);
        }

        setTimeout(() => btn.classList.remove('buttonOnCooldown'), 50);
    }
}

function handleLoanButtonKeydown(e) {
    if (e.key !== 'Enter') return;

    let btn = e.target.closest('.addLoan, .deleteLoan, .toggleLoan');
    if (!btn || !document.body.contains(btn) || btn.disabled) return;

    const row = btn.closest('tr');
    if (!row || !document.body.contains(row)) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const onCooldown = btn.classList.contains('buttonOnCooldown');
    if (!onCooldown) {
        btn.classList.add('buttonOnCooldown');
        if (btn.classList.contains('addLoan')) {
            addRow(row);
        } else if (btn.classList.contains('deleteLoan')) {
            const id = btn.id;
            deleteRow(row);
            btn = document.getElementById(id);
            if (!btn) {
                const borrower = id.split("_loan")[0];
                const loanNumber = Math.max(1, parseInt(id.split("_loan")[1][0]) - 1);
                btn = document.getElementById(borrower + '_loan' + loanNumber + '_delete');
            }
        } else {
            toggleLoan(btn); 
        }
        btn.focus();

        setTimeout(() => btn.classList.remove('buttonOnCooldown'), 50);
    }
}

function toggleLoan(toggleButton) {
    const rowID = toggleButton.id.replace('_toggle', '');
    const enabled = toggleButton.getAttribute('data-enabled') === 'true';
    (enabled) ? disableRow(rowID) : enableRow(rowID);
}
function enableRow(rowID) {
    const rowElement = document.getElementById(rowID);
    const rowNumber = rowID.split('loan')[1];
    const rowInputs = rowElement.querySelectorAll('[data-type="number"]');
    const toggleButton = document.getElementById(rowID + '_toggle');
    
    rowElement.setAttribute('aria-disabled', 'false');
    toggleButton.setAttribute('data-enabled', 'true');
    toggleButton.setAttribute('aria-label', 'Disable loan ' + rowNumber);
    Array.from(rowInputs).forEach(input => { 
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.remove("inputDisabled");
        input.disabled = false;
    })
    delete cache[rowID + ".disabled"];

    const borrower = rowID.split('_')[0];
    announce(`${borrower} loan ${rowNumber} has been enabled`);
}
function disableRow(rowID) {
    const rowElement = document.getElementById(rowID);
    const rowNumber = rowID.split('loan')[1];
    const rowInputs = rowElement.querySelectorAll('[data-type="number"]');
    const toggleButton = document.getElementById(rowID + '_toggle');

    rowElement.setAttribute('aria-disabled', 'true');
    toggleButton.setAttribute('data-enabled', 'false');
    toggleButton.setAttribute('aria-label', 'Enable loan ' + rowNumber);
    Array.from(rowInputs).forEach(input => { 
        const wrapper = input.closest('.input-wrapper');
        wrapper.classList.add('inputDisabled');
        input.disabled = true;
    });
    cache[rowID + ".disabled"] = true;
    
    const borrower = rowID.split('_')[0];
    announce(`${borrower} loan ${rowNumber} has been disabled`);
}

// Helper to dynamically add listeners to new loan elements
function addNewLoanInputListeners(rowElement) {
    const inputs = rowElement.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener("change", handleNumberInputChange);
        input.addEventListener("focus", handleNumberInputFocus);
        input.addEventListener("blur", handleNumberInputBlur);
        input.addEventListener("beforeinput", handleNumberInputBeforeInput);
        createSpinnerListeners(input.closest('.input-wrapper'));
    });
}

// Helper to dynamically remove listeners from a row to be deleted
function removeLoanInputListeners(rowElement) {
    const inputs = rowElement.querySelectorAll('input');
    inputs.forEach(input => {
        input.removeEventListener('change', handleNumberInputChange);
        input.removeEventListener('focus', handleNumberInputFocus);
        input.removeEventListener('blur', handleNumberInputBlur);
        input.removeEventListener('beforeinput', handleNumberInputBeforeInput);
        removeSpinnerListeners(input.closest('.input-wrapper'));
    });
}

// Adds loan child divs to the borrowers loan table, renames existing loans and adds listeners
function addRow(referenceRow) {
    if (referenceRow.closest("tbody").childElementCount >= 25) return; // 25 LIMIT
    const cacheToUpdate = {};
    const borrower = referenceRow.id.split("_loan")[0];
    const loanNumber = parseInt(referenceRow.id.split("_loan")[1]) + 1;

    // Copy template into new child and insert into correct location
    const newRow = document.createElement("tr");
    newRow.id = borrower + "_loan" + loanNumber;
    newRow.innerHTML = getRowTemplate(borrower, loanNumber);
    referenceRow.after(newRow);

    // Update spacer for smoother scrolling
    const newRowHeight = newRow.offsetHeight;
    removeFromSpacer(newRowHeight);
    addNewLoanInputListeners(newRow);

    // Rename existing elements and update cache
    let nextRow = newRow.nextElementSibling;
    let newIndex = loanNumber + 1;
    while(nextRow) {
        const oldIndex = newIndex - 1;
        const cacheKeys = Object.keys(cache).filter(key => { return key.includes(`loan${oldIndex}`) });
        cacheKeys.forEach(oldKey => {
            const prefix = borrower + '_loan';
            const newKey = oldKey.replace(prefix + oldIndex, prefix + newIndex);
            cacheToUpdate[newKey] = cache[oldKey];
            delete cache[oldKey];
        })
        
        renameElements(nextRow, oldIndex, newIndex);
        nextRow.id = borrower + "_loan" + newIndex;
        nextRow = nextRow.nextElementSibling;
        newIndex++;
    }
    Object.keys(cacheToUpdate).forEach(key => cache[key] = cacheToUpdate[key]);

    // Announcement for accessibility
    const loanCount = referenceRow.parentElement.childElementCount;
    const message = `Loan ${loanNumber} has been added. Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan count is now ${loanCount}.`;
    announce(message);
}

// Deletes loan child div from the borrowers table and renames existing elements
function deleteRow(rowToDelete) {
    const cacheToUpdate = {};
    const borrower = rowToDelete.id.split("_loan")[0];
    const rowParent = rowToDelete.parentElement;
    let loanNumber = parseInt(rowToDelete.id.split("_loan")[1]);
    let nextRow = rowToDelete.nextElementSibling;

    // If only a single element, clear contents and delete cache elements instead of removing
    if (rowParent.childElementCount === 1) {
        rowToDelete.querySelectorAll('input').forEach(inp => inp.value = '');
        enableRow(rowToDelete.id);
        Object.keys(cache).forEach(key => { if (key.includes(rowToDelete.id)) delete cache[key]; });
        return;
    }

    // Delete element, its listeners and its cache; update spacer
    removeLoanInputListeners(rowToDelete);
    const rowToDeleteHeight = rowToDelete.offsetHeight;
    addToSpacer(rowToDeleteHeight);
    rowToDelete.remove();
    Object.keys(cache).forEach(key => { if (key.includes(rowToDelete.id)) delete cache[key]; });

    // Rename and update cache
    let newIndex = loanNumber;
    while(nextRow) {
        const oldIndex = newIndex + 1;
        const cacheKeys = Object.keys(cache).filter(key => { return key.includes(`loan${oldIndex}`) });
        cacheKeys.forEach(oldKey => {
            const prefix = borrower + '_loan';
            const newKey = oldKey.replace(prefix + oldIndex, prefix + newIndex);
            cacheToUpdate[newKey] = cache[oldKey];
            delete cache[oldKey];
        })

        renameElements(nextRow, oldIndex, newIndex);
        nextRow.id = borrower + "_loan" + newIndex;
        nextRow = nextRow.nextElementSibling;
        newIndex++;
    }
    Object.keys(cacheToUpdate).forEach(key => cache[key] = cacheToUpdate[key]);

    // Announcement for accessibility
    const loanCount = rowParent.childElementCount;
    const message = `Loan ${loanNumber} has been removed. Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan count is now ${loanCount}.`;
    announce(message);
}

// Bulk adds empty loan rows when restoring previous session data
async function addBulkEmptyLoans(parentId, count) {
    const borrower = parentId.split("L")[0];
    const rowParent = document.getElementById(parentId).children[1];

    // Create copies of template
    for (let i = 2; i <= count; i++) {
        const rowElement = document.createElement("tr");
        rowElement.id = borrower + "_loan" + i;
        rowElement.innerHTML = getRowTemplate(borrower, i);
        rowParent.append(rowElement);
        addNewLoanInputListeners(rowElement);
    }
}

// Helper to loop through renaming loan table elements when added or deleted
function renameElements(container, oldIndex, newIndex) {
    const oldTag = "loan" + oldIndex;
    const newTag = "loan" + newIndex;
    const elements = container.querySelectorAll('[id*=' + oldTag + '], [name*=' + oldTag + '], [aria-label*="' + oldIndex + '"]');
    elements.forEach(el => {  
        if (el.id && el.id.includes(oldTag)) {
            el.id = el.id.replace(oldTag, newTag);        
        }
        if (el.name && el.name.includes(oldTag)) {
            el.name = el.name.replace(oldTag, newTag);
        }
        if (el.tagName === 'SPAN' && el.textContent.includes('Loan ' + oldIndex)) {
            el.textContent = el.textContent.replace('Loan ' + oldIndex, 'Loan ' + newIndex);
        }
        if (el.hasAttribute('aria-label')) {
            const currentLabel = el.getAttribute('aria-label');
            if (currentLabel.includes('loan ' + oldIndex)) {
                el.setAttribute('aria-label', currentLabel.replace('loan ' + oldIndex, 'loan ' + newIndex));
            }
        }
    });
}