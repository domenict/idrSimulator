function moveToNext(e) {
    if (e.key !== 'Enter') return;
    if (document.activeElement.tagName === 'BUTTON') return;
    e.preventDefault();
    e.stopPropagation();

    // Emulates tabbing for accessibility
    const focusable = Array.from(document.getElementById("calcForm").querySelectorAll(
        'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )).filter(el => {
        if (el.offsetParent === null) return false;
        if (el.disabled) return false;
        if (el.matches('.spinner-btn, .show-hide-toggle, .help-wrapper, .addLoan, .deleteLoan')) return false;
        if (el.type === "radio" && el.checked === false) return false;
        return true;
    });

    let index = focusable.indexOf(e.target);
    /* This might break accessibility, keeping just in case
    if (index === -1) {
        const parent = e.target.closest(".help-wrapper");
        index = focusable.indexOf(parent);
    }
    */
    const next = focusable[index + 1];
    if (next) next.focus();
}

// Number input handling in and out of focus/change
function handleNumberInputChange(e) {
    const element = e.target;
    if (element.value === '') return;
    element.value = clampValue(element);

    if (cache[element.name + ".metPlanMax"] !== undefined) {
        delete cache[element.name + ".metPlanMax"];
    }
}
function handleNumberInputFocus(e) { e.target.select(); }
function handleNumberInputBlur(e) {
    const element = e.target;
    if (element.value === '') {
        if (element.defaultValue) element.value = element.defaultValue;
        return;
    }
    element.value = clampValue(element); //Fixes decimal shenanigans
}
function clampValue(element) {
    const value = element.value.strToNum();
    const min = parseFloat(element.min);
    const max = parseFloat(element.max)
    const clampedValue = Math.max(min, Math.min(value, max));
    return clampedValue.numToStr(element.step);
}

// Prevents invalid entry and provides format correction
function handleNumberInputBeforeInput (e) {
    const element = e.target;
    const inserted = e.data || '';
    let { value, selectionStart: start, selectionEnd: end } = element;
    let before = value.slice(0, start);
    let after = value.slice(end);
    if (inserted && !/^[0-9., $%]*$/.test(inserted)) {
        e.preventDefault();
        return;
    }
    if (inserted && (inserted === '$' || inserted === '%' || inserted === ' ')) {
        e.preventDefault();
        return;   
    }
    if (inserted && inserted === '.') {
        if (element.step === '1') {
            e.preventDefault();
            return;
        }
        if (value.length === 0 || (before === '' && after === '')) {
            e.preventDefault();
            element.value = '0.';
            return;
        }
    }

    if (start === end) {
        if (e.inputType === 'deleteContentBackward') before = before.slice(0, start - 1);
        if (e.inputType === 'deleteContentForward')  after = after.slice(1, after.length);
    }
    const expectedValue = before + inserted + after;

    let newValue = expectedValue;
    let deltaModifier = 0;
    if (e.inputType === 'deleteContentBackward') {
        const charToDelete = value[start - 1];
        if (charToDelete === ',') {
            const removeOneMore = before.slice(0, start - 2) + inserted + after;
            newValue = removeOneMore.strToNum().numToStr(removeOneMore);
            deltaModifier -= 1;
        }
        if (charToDelete === '.') {
            newValue = before;
            deltaModifier += 2;
        } 
        if (newValue[0] === '.') deltaModifier -= 1;
    }
    if (e.inputType === 'deleteContentForward') {
        const charToDelete = value[end];
        if (charToDelete === ',') {
            const removeOneMore = before + inserted + after.slice(1, after.length);
            newValue = removeOneMore.strToNum().numToStr(removeOneMore);
            deltaModifier += 1;
        }
        if (charToDelete === '.') {
            newValue = before;
            deltaModifier += 2;
        } 
        if (newValue[0] === '.') deltaModifier -= 1;
    }
    if (/^0[0-9,]/.test(newValue)) {
        newValue = newValue.strToNum().numToStr(newValue);
    }
    if (!isNaN(newValue.strToNum()) && newValue.strToNum() > Number(element.max)) {
        newValue = before + after;
        if (element.step === '1') newValue = element.max;
        if (inserted.length > 1) newValue = element.max;
        newValue = newValue.strToNum().numToStr(newValue);
    }
    if (newValue !== '' && !/^\d{1,3}(,\d{3})*(\.\d{0,2})?$/.test(newValue)) {
        newValue = newValue.strToNum().numToStr(newValue);
    }
    
    // Intended to allow some sort of visual feedback to the user that an action is not allowed
    delayNumberFormatting(element, expectedValue, newValue, deltaModifier);
}

// Creates timeout to allow keydown to trigger before modifying input to give user feedback
const delayNumberFormatting = debounce((target, currentValue, newValue, deltaModifier) => {
    const selectionStart = target.selectionStart;
    if (currentValue === newValue) return;
    target.value = newValue;
    
    const originalLength = currentValue.length;
    const newLength = newValue.length;
    const delta = newLength - originalLength + deltaModifier;
    const newCursorPos = Math.max(0, selectionStart + delta);
    target.focus();
    target.setSelectionRange(newCursorPos, newCursorPos);
}, 0);
function debounce(func, delay) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
   }
}