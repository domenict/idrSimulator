function showModalHandler(e) {
    const btn = e.target;

    let template;
    if (btn.id === 'saveToStorage') {
        template = "save";
    } else if (btn.id === 'deleteStorage') {
        template = "delete";
    } else {
        return;
    }
    showModal(template);
}

function showModal(templateStr, savedSession) {
    const wrapper = document.getElementById("page-wrapper");
    const overlay = document.getElementById("overlay");
    const modal = overlay.querySelector('#modal');
    const spinner = overlay.querySelector('#spinner');
    const confirmation = overlay.querySelector('#modal-confirmation');
    const header = modal.querySelector('#modal-header');
    const text = modal.querySelector('#modal-text');
    const inputWrapper = modal.querySelector('#modal-input-wrapper');
    const input = modal.querySelector('#modal-passphrase-input');
    const acceptBtn = modal.querySelector('#modal-accept-btn');
    const rejectBtn = modal.querySelector('#modal-reject-btn');

    let template;
    switch(templateStr) {
        case "restore":
            template = getRestoreTemplate(savedSession, modal, spinner, input, header, text);
            break;
        case "save":
            template = getSaveTemplate(modal, spinner, confirmation, input);
            break;        
        case "delete":
            template = getDeleteTemplate(modal, confirmation);
            break; 
    }
    header.innerHTML = template.header;
    text.innerHTML = template.text;
    acceptBtn.innerHTML = template.accept;
    rejectBtn.innerHTML = template.reject;

    if (template.wrapperHidden) {
        wrapper.style.visibility = 'hidden';
        wrapper.style.opacity = '0';
    } else {
        wrapper.style.filter = "blur(10px)";
    }

    if (template.input) {
        inputWrapper.style.display = "flex";
        text.style.margin = "calc(var(--space-5) * 0.85) 0";
    } else {
        inputWrapper.style.display = "none";
        text.style.margin = "calc(var(--space-5) * 0.85) 0 0 0";
    }

    // Reset
    document.documentElement.style.overflowY = "hidden";
    overlay.style.overflowY = "scroll";
    overlay.style.display = "flex";
    overlay.addEventListener('keydown', trapFocus);
    modal.style.display = "flex";
    spinner.style.display = "none";
    confirmation.style.display = "none";
    (template.input) ? input.focus() : rejectBtn.focus();

    // Button listeners
    const acceptHandler = template.acceptHandler;
    acceptBtn._acceptHandler = acceptHandler;
    acceptBtn.addEventListener("click", acceptHandler);

    const rejectHandler = template.rejectHandler;
    rejectBtn._rejectHandler = rejectHandler;
    rejectBtn.addEventListener("click", rejectHandler);
}

// Restore template
function getRestoreTemplate(savedSession, modal, spinner, input, header, text) {
    const acceptHandler = async () => {
        function updateTextForFail(header, text) {
            header.textContent = "Incorrect passphrase – try again";
            text.textContent = "Please try again or start a new session.";
        }
        
        const passphrase = input.value;
        if (!passphrase) {
            updateTextForFail(header, text);
            input.focus();
            return;
        }

        modal.style.display = "none";
        spinner.style.display = "flex";

        const pass = await loadFromStorage(passphrase, savedSession);
        if (pass) {
            updateToggleEvents();
            announce('Your saved session has been restored.');
            hideModal();
        } else {
            updateTextForFail(header, text);
            spinner.style.display = "none";
            modal.style.display = "flex";
            input.value = '';
            input.focus();
        }
    }
    const rejectHandler = () => { hideModal(); };

    const restoreTemplate = {
        wrapperHidden: true,
        input: true,
        header: "Restore Previous Session?",
        text: "Enter your passphrase to restore your previous session.",
        accept: "Restore",
        acceptHandler,
        reject: "Start New",
        rejectHandler
    }
    return restoreTemplate;
}

// Save template
function getSaveTemplate(modal, spinner, confirmation, input) {
    const acceptHandler = async () => {
        const passphrase = input.value;
        if (!passphrase) {
            input.focus();
            return;
        }

        modal.style.display = "none";
        spinner.style.display = "flex";

        const foundStorage = localStorage.getItem("savedSession");
        const pass = await saveToStorage(passphrase);
        spinner.style.display = "none";
        if (pass) {
            confirmation.style.display = "flex";
            confirmation.innerHTML = 
                (foundStorage
                    ? `<p class="fadeIn modal-message">Your saved session has been updated.</p>`
                    : `<p class="fadeIn modal-message">Your session has been saved.</p>`
                );
            announce(confirmation.textContent);
        } else {
            confirmation.innerHTML = `<p class="fadeIn modal-message">An error occured. Please try again.</p>`;
            announce(confirmation.textContent);
        }
        setTimeout(() => hideModal(), 1250);
    }
    const rejectHandler = () => { hideModal(); };

    const saveTemplate = {
        wrapperHidden: false,
        input: true,
        header: "Save This Session?",
        text: 
            "The current session will be saved to your local storage." +
            "Your data will be encrypted solely on your personal device by this specific " +
            "browser and will persist unless manually deleted or automatically cleared " +
            "by the browser itself." +
            "\n\nTo proceed, provide a passphrase to encrypt this session " +
            "to your local storage. This passphrase is not saved in any way and is not " +
            "recoverable if lost.",
        accept: "Save",
        acceptHandler,
        reject: "Cancel",
        rejectHandler
    }
    return saveTemplate;
}

// Delete template
function getDeleteTemplate(modal, confirmation) {
    const acceptHandler = async () => {
        const pass = await clearSessions();
        modal.style.display = "none";
        confirmation.style.display = "flex";
        if (pass) {
            confirmation.innerHTML = `<p class="fadeIn modal-message">Your sessions have been deleted.</p></div>`
            announce(confirmation.textContent);
        } else {
            confirmation.innerHTML = `<p class="fadeIn modal-message">An error occured. Please try again.</p>`;
            announce(confirmation.textContent);
        }
        setTimeout(() => hideModal(), 1250);
    }
    const rejectHandler = () => { hideModal(); };

    const deleteTemplate = {
        wrapperHidden: false,
        input: false,
        header: "Confirm Deletion?",
        text: "All current and saved session data will be deleted.",
        accept: "Delete",
        acceptHandler,
        reject: "Cancel",
        rejectHandler
    }
    return deleteTemplate;
}