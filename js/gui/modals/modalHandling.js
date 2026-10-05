function trapFocus(e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        hideModal();
        return;
    }

    const overlay = e.currentTarget;
    const candidates = overlay.querySelectorAll('button, input');
    const focusable = Array.from(candidates).filter(el => {
        return el.offsetParent !== null && 
               getComputedStyle(el).visibility !== 'hidden' &&
               !el.disabled &&
               !el.hasAttribute('hidden');
    });
    
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
}

function updateCapsLockWarning(e) {
    const warningElement = e.target.closest("#modal").querySelector("#modal-capslock-warning");
    const capsOn = e.getModifierState && e.getModifierState('CapsLock');
    warningElement.style.opacity = capsOn ? '1' : '0';
}

function handleModalInputKeydown(e) {
    const acceptBtn = e.target.closest("#modal").querySelector("#modal-accept-btn");
    if (e.key === 'Enter') acceptBtn.click(); 
}

function handleModalInputBlur(e) {
    const input = e.target;
    if (e.relatedTarget !== input.nextElementSibling) {
        const warningElement = e.target.closest("#modal").querySelector("#modal-capslock-warning");
        warningElement.style.opacity = '0';
    }
}

function handleModalPassToggleShow(e) {
    const showHideButton = e.currentTarget;
    const input = showHideButton.previousElementSibling;
    showHideButton.textContent = "Hide";
    input.type = "text";
    showHideButton.focus();
}

function handleModalPassToggleHide(e) {
    const showHideButton = e.currentTarget;
    const input = showHideButton.previousElementSibling;
    showHideButton.textContent = "Show";
    input.type = "password";
}

function handleModalPassToggleShowKey(e) {
    if (e.key !== 'Enter') return;
    handleModalPassToggleShow(e);
}

function handleModalPassToggleHideKey(e) {
    updateCapsLockWarning(e);
    if (e.key !== 'Enter') return;
    handleModalPassToggleHide(e);
}

function handleModalPassToggleBlur(e) {
    const showHideButton = e.currentTarget;
    if (e.relatedTarget !== showHideButton.previousElementSibling) {
        const warningElement = e.target.closest("#modal").querySelector("#modal-capslock-warning");
        warningElement.style.opacity = '0';
    }
}

function hideModal() {
    const wrapper = document.getElementById("page-wrapper");
    const overlay = document.getElementById("overlay");

    wrapper.style.filter = 'none';
    wrapper.style.visibility = 'visible';
    wrapper.style.opacity = '1';
    document.documentElement.style.overflowY = "scroll";

    overlay.classList.add('fadeOut');
    overlay.style.overflowY = "hidden";
    setTimeout(() => {
        const input = overlay.querySelector('#modal-passphrase-input');
        const acceptBtn = overlay.querySelector('#modal-accept-btn');
        const rejectBtn = overlay.querySelector('#modal-reject-btn');

        input.value = '';
        if (acceptBtn._acceptHandler) {
            acceptBtn.removeEventListener('click', acceptBtn._acceptHandler);
            acceptBtn._acceptHandler = null;
        }
        if (rejectBtn._rejectHandler) {
            rejectBtn.removeEventListener('click', rejectBtn._rejectHandler);
            rejectBtn._rejectHandler = null;
        }

        overlay.removeEventListener('keydown', trapFocus);
        overlay.style.display = "none";
        overlay.classList.remove('fadeOut');
    }, 250);
};

