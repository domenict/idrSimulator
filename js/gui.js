/* -------------------------------------------------
    GLOBAL VARIABLES / PROTOTYPES
------------------------------------------------- */
let incTimer, scrollTimer, announcementTimeout, cryptoWorker, workerUrl;
const cache = {};
const announcer = document.getElementById('live-announcements');

Object.defineProperty(String.prototype, 'strToNum', {
    value: function() {
        const clean = this.replace(/[^\d.-]/g, '');
        return clean === '' ? NaN : parseFloat(clean);
    },
    enumerable: false
});

Object.defineProperty(Number.prototype, 'numToStr', {
    value: function(ref = "") {
        if (isNaN(this)) return "";
        const hasDecimal = ref.includes('.');
        const decimalsPlaces = hasDecimal ? 2 : 0; 
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimalsPlaces,
            maximumFractionDigits: decimalsPlaces,
            roundingMode: 'floor'
        }).format(this);
    },
    enumerable: false
});


/* *************************************************************************************************
************************                      DOM LOAD                      ************************
************************************************************************************************* */
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

// Theme toggle + transition delay to prevent elements with transitions from flashing
function toggleTheme() {
    delayTransition(false);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');

    const button = document.getElementById('themeToggle');
    button.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
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

// Mostly static listeners that are form's default state
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

    // Add custom select drop downs
    document.querySelectorAll('.select-wrapper').forEach(wrapper => createSelectListeners(wrapper));

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
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(document.documentElement);
}


/* *************************************************************************************************
************************                   MODAL FUNCTIONS                  ************************
************************************************************************************************* */

/* -------------------------------------------------
    MODAL LISTENER FUNCTIONS
------------------------------------------------- */
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

/* -------------------------------------------------
    MODAL HELPER FUNCTIONS
------------------------------------------------- */
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

/* -------------------------------------------------
    MODAL MAIN AND TEMPLATES
------------------------------------------------- */
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


/* *************************************************************************************************
************************                STORAGE AND ENCRYPTION              ************************
************************************************************************************************* */

// Runs worker to keep main thread clear during encryption/decryption
async function runWorkerTask(task, data) {
    cryptoWorker = createCryptoWorker();

    return new Promise((resolve, reject) => {
        cryptoWorker.onmessage = (e) => {
            resolve(e.data);
            cryptoWorker.terminate();
            cryptoWorker = null;
        };
        cryptoWorker.onerror = (err) => {
            reject(err);
            cryptoWorker.terminate();
            cryptoWorker = null;
        };
        cryptoWorker.postMessage({ task, data });
    });
}

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
    const VALID = /^(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?|(?:yes|no)|(?:old|new|rap)|(?:none|self|spouse)|(?:us|ak|hi)$/i
    const keysFromLocalStorage = Object.keys(fromLocalStorageObject);
    for (const key of keysFromLocalStorage) {
        const value = fromLocalStorageObject[key];
        const element = document.getElementById(key);

        if (!VALID.test(value)) {
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
    const VALID = /^(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{1,2})?|(?:yes|no)|(?:old|new|rap)|(?:none|self|spouse)|(?:us|ak|hi)$/i
    for (const key of keysToLocalStorageObject) {
        const value = toLocalStorageObject[key];
        if (value && !VALID.test(value)) {
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

// Creates worker blob to offload heavy encryption compute for improved UI -- code by Grok
function createCryptoWorker() {
    const libPath = new URL('js/dependencies/argon2-bundled.min.js', window.location.href).href;
    const workerScript = `
        importScripts('${libPath}');

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        async function getKeyFromPassphrase(passphrase, salt) {
            try {
                const params = {
                    pass: passphrase,
                    salt: salt,
                    time: 3,
                    mem: 64 * 1024,
                    parallelism: 1,
                    hashLen: 32,
                    type: argon2.ArgonType.Argon2id
                };
                const { hash } = await argon2.hash(params);
                return await crypto.subtle.importKey(
                    'raw',
                    hash,
                    { name: 'AES-GCM' },
                    false,
                    ['encrypt', 'decrypt']
                );
            } catch (e) {
                throw new Error('Key derivation failed: ' + e.message);
            }
        }

        async function encryptData(passphrase, plainObj) {
            if (typeof passphrase !== 'string' || passphrase.length === 0) {
                throw new Error('Passphrase must be a non-empty string');
            }
            if (plainObj === null || plainObj === undefined) {
                throw new Error('Data to encrypt cannot be null/undefined');
            }

            const salt = crypto.getRandomValues(new Uint8Array(16));
            const iv   = crypto.getRandomValues(new Uint8Array(12));
            const key  = await getKeyFromPassphrase(passphrase, salt);

            const jsonString = JSON.stringify(plainObj);
            const data = encoder.encode(jsonString);

            const ciphertext = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );

            return btoa(JSON.stringify({
                s: Array.from(salt),
                i: Array.from(iv),
                c: Array.from(new Uint8Array(ciphertext))
            }));
        }

        async function decryptData(passphrase, encryptedB64) {
            if (typeof passphrase !== 'string' || passphrase.length === 0) {
                throw new Error('Passphrase must be a non-empty string');
            }
            if (typeof encryptedB64 !== 'string' || encryptedB64.length === 0) {
                throw new Error('Encrypted data must be a non-empty Base64 string');
            }

            let envelope;
            try {
                envelope = JSON.parse(atob(encryptedB64));
            } catch (_) {
                throw new Error('Invalid Base64 or corrupted envelope');
            }

            const { s, i, c } = envelope;
            if (!Array.isArray(s) || !Array.isArray(i) || !Array.isArray(c)) {
                throw new Error('Envelope missing required arrays (s, i, c)');
            }
            if (s.length < 16) throw new Error('Salt too short (expected ≥16 bytes)');
            if (i.length !== 12) throw new Error('IV must be exactly 12 bytes');
            if (c.length === 0) throw new Error('Ciphertext is empty');

            const salt = new Uint8Array(s);
            const iv   = new Uint8Array(i);
            const ciphertext = new Uint8Array(c);

            const key = await getKeyFromPassphrase(passphrase, salt);
            let plain;
            try {
                plain = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv },
                    key,
                    ciphertext
                );
            } catch (e) {
                throw new Error('Decryption failed: wrong passphrase or corrupted data');
            }

            const jsonString = decoder.decode(plain);
            try {
                return JSON.parse(jsonString);
            } catch (_) {
                throw new Error('Decrypted data is not valid JSON');
            }
        }

        self.onmessage = async function(e) {
            const { task, data } = e.data;
            const passphrase = data[0];
            const payload    = data[1];
            let result;

            try {
                if (task === 'encrypt') {
                    result = await encryptData(passphrase, payload);
                } else if (task === 'decrypt') {
                    result = await decryptData(passphrase, payload);
                } else {
                    throw new Error('Unknown task: ' + task);
                }
            } catch (err) {
                result = { error: err.message };
            }

            self.postMessage(result);
        };

        self.onerror = function(err) {
            self.postMessage({ error: 'Worker crashed: ' + err.message });
        };
    `;

    const blob = new Blob([workerScript], { type: 'application/javascript' });
    workerUrl = URL.createObjectURL(blob);
    cryptoWorker = new Worker(workerUrl);

    // revoke immediately for clean-up
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;

    return cryptoWorker;
}


/* *************************************************************************************************
************************                  LISTENER FUNCTIONS                ************************
************************************************************************************************* */

// Sumission form to ./backEnd.js
function submitForm(event) {
    event.preventDefault();
    const results = document.getElementById('results');
    const form = document.getElementById("calcForm");
    const formData = new FormData(form);
    const formObject = Object.fromEntries(formData);

    const pass = formObjectValidation(formObject);
    if (!pass) return;

    const output = calculatePayments(formObject);
    if (output !== undefined && output.length > 0) {
        const elements = document.getElementsByClassName('submitAnimation');
        Array.from(elements).forEach(element => {
            element.style.display = "flex";
            element.classList.remove('animated-' + element.id);
            element.offsetHeight;
            element.classList.add('animated-' + element.id);
        });
        results.textContent = output;
        announce(output);

        smoothScroll("resultsContainer");
        results.parentElement.focus();
    }
}

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
        console.log(inserted)
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

/* *************************************************************************************************
************************             INCREMENT SPINNER FUNCTIONS            ************************
************************************************************************************************* */

// Steps integer number inputs for custom spinners, supports holding
function startIncrement(inc, input) {
    let multiplier = 250;
    startTimer(inc, input, multiplier);

    function startTimer(inc, input, multiplier) {
        const accelerate = (inc) => {
            if (!incTimer) return;
            addStep(inc, input);
            multiplier = Math.max(10, multiplier / 1.25);
            incTimer = setTimeout(() => accelerate(inc), multiplier);
        };
        clearTimeout(incTimer);
        addStep(inc, input);
        incTimer = setTimeout(() => accelerate(inc), multiplier);
    };

    function addStep(inc, input) {
        const min = parseFloat(input.min);
        const max = parseFloat(input.max);
        const value = input.value.strToNum();
        if (input.value === "" || isNaN(value)) {
            input.value = inc.numToStr(input.step);
            return;
        }

        let newValue = (value + inc).roundDecimals(2);
        if (newValue != value) {
            newValue = Math.max(min, Math.min(max, newValue));
            input.value = newValue.numToStr(input.value);
        }
    }
}

const stopIncrement = () => (clearTimeout(incTimer), incTimer = null);

function handleIncUp(e) {
    e.preventDefault();
    const input = e.target.closest('.input-wrapper').querySelector('input');
    const step = parseFloat(input.step);
    startIncrement( step, input);
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function handleIncDown(e) {
    e.preventDefault();
    const input = e.target.closest('.input-wrapper').querySelector('input');
    const step = parseFloat(input.step);
    startIncrement( -(step), input);
    input.dispatchEvent(new Event('change', { bubbles: true }));
}

function createSpinnerListeners(wrapper) {
    const up = wrapper.querySelector('.spinner-up');
    const down = wrapper.querySelector('.spinner-down')
    up.addEventListener('pointerdown', handleIncUp);
    up.addEventListener('pointerup', stopIncrement);
    up.addEventListener('pointerleave', stopIncrement);
    up.addEventListener('pointercancel', stopIncrement);
    down.addEventListener('pointerdown', handleIncDown);
    down.addEventListener('pointerup', stopIncrement);
    down.addEventListener('pointerleave', stopIncrement);
    down.addEventListener('pointercancel', stopIncrement);
}

function removeSpinnerListeners(wrapper) {
    const up = wrapper.querySelector('.spinner-up');
    const down = wrapper.querySelector('.spinner-down')
    up.removeEventListener('pointerdown', handleIncUp);
    up.removeEventListener('pointerup', stopIncrement);
    up.removeEventListener('pointerleave', stopIncrement);
    up.removeEventListener('pointercancel', stopIncrement);
    down.removeEventListener('pointerdown', handleIncDown);
    down.removeEventListener('pointerup', stopIncrement);
    down.removeEventListener('pointerleave', stopIncrement);
    down.removeEventListener('pointercancel', stopIncrement);
}


/* *************************************************************************************************
************************              LISTENER HELPER FUNCTIONS             ************************
************************************************************************************************* */
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

// Scrolling to top of specific div
function smoothScroll(targetId, duration = 1000) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;
  
    const startPosition = window.scrollY;
    const targetPosition = targetElement.getBoundingClientRect().top + startPosition;
    const distance = targetPosition - startPosition;
    let startTime = null;
  
    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    }
  
    // Easing function for a smoother start and end
    function ease(t, b, c, d) {
      t /= d / 2;
      if (t < 1) return c / 2 * t * t + b;
      t--;
      return -c / 2 * (t * (t - 2) - 1) + b;
    }
    requestAnimationFrame(animation);
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

function announce(message) {
    clearTimeout(announcementTimeout);
    announcementTimeout = setTimeout(() => {
        announcer.textContent = '';
        requestAnimationFrame(() => {
            announcer.textContent = message;
        });
    }, 50);
}


/* *************************************************************************************************
************************              CUSTOM SELECT FUNCTIONS               ************************
************************************************************************************************* */
function getSelectComponents(target) {
    const wrapper = target.closest('.select-wrapper');
    return {
        trigger: wrapper.querySelector('.select-trigger'),
        dropdown: wrapper.querySelector('.select-dropdown'),
        options: [...wrapper.querySelectorAll('li')],
        valueSpan: wrapper.querySelector('.select-value'),
        hiddenInput: wrapper.querySelector('input[type="hidden"]')
    }
}

function setSelectOption(option, suppressEvents = false) {
    const { dropdown, options, valueSpan, hiddenInput } = getSelectComponents(option);
    options.forEach(o => o.removeAttribute('aria-selected'));
    option.setAttribute('aria-selected', 'true');
    dropdown.setAttribute('aria-activedescendant', option.id);
    valueSpan.textContent = option.textContent;
    hiddenInput.value = option.dataset.value;

    if (!suppressEvents) {
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function handleSelectOpen(e) {
    const { trigger, dropdown } = getSelectComponents(e.target);
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.style.display = 'block';

    requestAnimationFrame(() => {
        if (dropdown.getBoundingClientRect().bottom + 16 > document.documentElement.clientHeight) {
            dropdown.style.transform = 'translateY(-100%)';
            dropdown.style.top = 'calc(0% - 1px)';
        }
        dropdown.focus();
    });
}

function handleSelectClose(e) {
    const { trigger, dropdown } = getSelectComponents(e.target);
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.style.display = 'none';

    requestAnimationFrame(() => {
        dropdown.style.transform = 'none';
        dropdown.style.top = 'calc(100% + 1px)';
        dropdown.blur();
    });
}

function handleSelectTriggerClick(e) {
    e.stopPropagation();
    const { trigger } = getSelectComponents(e.target);
    const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
    (isExpanded) ? handleSelectClose(e) : handleSelectOpen(e);
}

function handleSelectTriggerKeydown(e) {
    const { dropdown } = getSelectComponents(e.target);
    if (['Enter',' '].includes(e.key)) {
        e.preventDefault();
        handleSelectOpen(e);
        dropdown.focus();
        return;
    }
    if(['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        handleSelectKeydownNavigation(e);
    }
}

function handleSelectDropdownBlur(e) {
    if (e.target.style.display !== 'none') handleSelectClose(e);
}

function handleSelectDropdownKeydown(e) {
    const { trigger } = getSelectComponents(e.target);
    if (['Escape', 'Enter',' '].includes(e.key)) {
        e.preventDefault();
        handleSelectClose;
        trigger.focus();
        return;
    }
    if(['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        handleSelectKeydownNavigation(e);
    }
}

function handleSelectKeydownNavigation(e) {
    const { options } = getSelectComponents(e.target);
    let index = options.findIndex(o => o.hasAttribute('aria-selected'));
    if (index === -1) index = 0;

    let newindex = index;
    if (e.key === 'ArrowDown') { e.preventDefault(); newindex = Math.min(index + 1, options.length - 1); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); newindex = Math.max(index - 1, 0); }
    if (e.key === 'Home')      { e.preventDefault(); newindex = 0; }
    if (e.key === 'End')       { e.preventDefault(); newindex = options.length - 1; }

    if (newindex !== index) {
        const opt = options[newindex];
        setSelectOption(opt);
    }
}

function handleSelectOptionClick(e) {
    e.stopPropagation();
    const option = e.target;
    const { trigger } = getSelectComponents(option);
    setSelectOption(option);
    handleSelectClose;
    trigger.focus();
}

function createSelectListeners(wrapper) {
    const { trigger, dropdown, options } = getSelectComponents(wrapper);
    trigger.addEventListener('pointerdown', handleSelectTriggerClick);
    trigger.addEventListener('keydown', handleSelectTriggerKeydown);
    dropdown.addEventListener('blur', handleSelectDropdownBlur);
    dropdown.addEventListener('keydown', handleSelectDropdownKeydown);
    options.forEach( opt => { opt.addEventListener('click', handleSelectOptionClick) });
}


/* *************************************************************************************************
************************                  TOOLTIP FUNCTIONS                 ************************
************************************************************************************************* */

// Checks if tooltip is expanded 
function createTooltipListeners(wrapper) {
    const tooltip = wrapper.querySelector(".tooltip");
    const show = (e) => {
        const wrapper = e.target;
        const message = tooltip.textContent.replace(/&#10;/g, '\n').trim();
        const locked = tooltip.classList.contains("tooltip-locked");
        if(!locked) {
            announce(message);
            wrapper.setAttribute('aria-expanded', 'true');
        }
    }
    const hide = (e) => {
        const wrapper = e.target;
        const inFocus = tooltip.classList.contains("tooltip-open");
        const locked = tooltip.classList.contains("tooltip-locked");
        if (!inFocus && !locked) {
            announcer.textContent = "";
            wrapper.setAttribute('aria-expanded', 'false');
        }
    }

    wrapper.addEventListener('mouseenter', show);
    wrapper.addEventListener('mouseleave', hide);
    wrapper.addEventListener('click', focusTooltip);
    wrapper.addEventListener('focus', focusTooltip);
}

// Reset tooltip to defaults on hide
function resetBoundingBox(tooltip) {
    tooltip.style.setProperty('--tooltip-transform', 'translateX(-50%) translateY(0%)');
    tooltip.style.setProperty('--tooltip-top', '100%');
    tooltip.style.setProperty('--tooltip-margin-top', 'var(--space-3)');
    tooltip.style.setProperty('--tooltip-arrow-top', 'auto');
    tooltip.style.setProperty('--tooltip-arrow-bottom', '100%');
    tooltip.style.setProperty('--tooltip-arrow-left', '50%');
    tooltip.style.setProperty('--tooltip-arrow-transform', 'translateX(-50%) rotate(0deg)');
    tooltip.style.width = 'max-content';
}

// Resizes tooltips if orientation changes while open
function resize() {
    document.querySelectorAll('.help-wrapper:hover .tooltip, .help-wrapper:focus-within .tooltip').forEach(tooltip => {
        const wrapper = tooltip.closest('.help-wrapper');
        if (wrapper) tooltipBoundingBox({ target: wrapper });
    });
}

// Sets bounding box for tooltips
function tooltipBoundingBox(e) {
    const wrapper = e.target.closest('.help-wrapper');
    const tooltip = wrapper.querySelector('.tooltip');
    if (!tooltip) return;
    resetBoundingBox(tooltip);

    // Set globals and set width
    let tooltipWidth, slide, shift;
    const defaultMax = 280;
    const pad = 16; 
    const arrowWidth = 8;
    const clientWidth = document.documentElement.clientWidth;
    const clientHeight = document.documentElement.clientHeight;
    const boundingWidth = clientWidth - pad * 2;
    (defaultMax > boundingWidth) ? tooltipWidth = boundingWidth : tooltipWidth = defaultMax;
    tooltip.style.width = tooltipWidth + 'px';
    
    requestAnimationFrame( () => {
        // Slide X if off the screen 
        let box = tooltip.getBoundingClientRect();
        slide = Math.min(box.left - pad, 0);
        if(!slide) slide = Math.max((box.right - clientWidth + pad), 0);
        if (slide) {
            if (tooltipWidth === boundingWidth) {
                slide = (slide > pad) ? box.left - pad : box.left - pad / 2;
            }
            shift = slide / tooltipWidth * 100;
            tooltip.style.setProperty('--tooltip-transform', `translateX(${-50 - shift}%)`);
            tooltip.style.setProperty('--tooltip-arrow-left', `${50 + shift}%`);

            // Shifts right a little if tooltip box goes beyond bounding icon
            const originBox = wrapper.getBoundingClientRect();
            box = tooltip.getBoundingClientRect();
            if (originBox.right + arrowWidth > box.right) {
                shift += ((box.right - arrowWidth - originBox.right) / tooltipWidth * 100);
                tooltip.style.setProperty('--tooltip-transform', `translateX(${-50 - shift}%)`);
                tooltip.style.setProperty('--tooltip-arrow-left', `${50 + shift}%`);
            }
        }

        // Flip if tooltip extends past bottom of page
        if (box.bottom + pad > clientHeight) { 
            if (!shift) shift = 0;
            tooltip.style.setProperty('--tooltip-transform', `translateX(${-50 - shift}%) translateY(-100%)`);
            tooltip.style.setProperty('--tooltip-top', '0%');
            tooltip.style.setProperty('--tooltip-margin-top', 'calc(var(--space-3) * -1)');
            tooltip.style.setProperty('--tooltip-arrow-top', '100%');
            tooltip.style.setProperty('--tooltip-arrow-bottom', '0%');
            tooltip.style.setProperty('--tooltip-arrow-transform', 'translateX(-50%) rotate(180deg)');
        }
    });
}

// Focuses tooltip for accessability and locks other tooltips from hover
function focusTooltip(e) {
    e.stopPropagation();
    e.preventDefault();
    const wrapper = e.target.closest('.help-wrapper');
    const tooltip = wrapper.querySelector(".tooltip");

    const close = () => {
        tooltip.classList.remove('tooltip-open');
        tooltip.setAttribute('aria-hidden', 'true');
        tooltip.blur();
        tooltip.tabIndex = -1;
        wrapper.tabIndex = 0;
        wrapper.setAttribute('aria-expanded', 'false');
        announcer.textContent = "";

        Array.from(document.getElementsByClassName("tooltip-locked")).forEach(el => {
            el.classList.remove("tooltip-locked");
        });

        tooltip.removeEventListener("focusout", close);
        document.removeEventListener('click', close);
        document.removeEventListener('keydown', escClose);
    };
    const escClose = (e) => { if (e.key === 'Escape' || e.key === "Enter" || e.key === " ") close(); };

    const isOpen = tooltip.classList.toggle('tooltip-open');
    if (isOpen) {
        tooltip.setAttribute('role', 'tooltip'); // purely for screen readers
        tooltip.setAttribute('aria-hidden', 'false');
        tooltip.focus();
        tooltip.tabIndex = 0;
        wrapper.tabIndex = -1;
        wrapper.setAttribute('aria-expanded', 'true');

        Array.from(document.getElementsByClassName("tooltip")).forEach(el => {
            if (el.id !== tooltip.id) el.classList.add("tooltip-locked");
        });

        setTimeout(() => {
            tooltip.addEventListener("focusout", close, { once: true });
            document.addEventListener('click', close, { once: true });
            document.addEventListener('keydown', escClose);
        }, 10);
    }
}


/* *************************************************************************************************
************************               DOM ROW HELPER FUNCTIONS             ************************
************************************************************************************************* */
// Helper for add/loan event delegation
function handleLoanButtonClick(e) {
    const btn = e.target.closest('.addLoan, .deleteLoan, .toggleLoan');
    if (!btn || !document.body.contains(btn) || btn.disabled) return;

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


/* *************************************************************************************************
************************                   SPACER FUNCTIONS                 ************************
************************************************************************************************* */

// Creates spacer to maintain scrollY when removing or hiding elements
function addToSpacer(amountToAdd, storedDocHeight = null, storedScrollY = null, storedWindowHeight = null) {
    const spacer = document.getElementById("spacer");
    const docHeight = (storedDocHeight) ? storedDocHeight: document.documentElement.scrollHeight;
    const scrollY = (storedScrollY) ? storedScrollY : window.scrollY;
    const windowHeight = (storedWindowHeight) ? storedWindowHeight : window.innerHeight;

    const nearBottom = scrollY + windowHeight >= docHeight - amountToAdd - 1; //prevents subpixels
    const hasScrollbar = docHeight > windowHeight;
    if (nearBottom && hasScrollbar) {
        if (spacer.offsetHeight === 0) window.addEventListener("scroll", checkSpacer, {passive:true});
        spacer.style.height = (parseInt(spacer.style.height || '0') + amountToAdd) + "px";
        window.scrollTo(0, scrollY);
        checkSpacer();
    }
}

// Remove from spacer when adding or showing elements
function removeFromSpacer(amountToRemove) {
    const spacer = document.getElementById("spacer");
    if(parseInt(spacer.style.height)) {
        spacer.style.height = Math.max(0, (parseInt(spacer.style.height || '0') - amountToRemove)) + "px";
        checkSpacer();
    }
}

// Listens for scroll and reduce spacer height; remove listener if height is zero
function checkSpacer() {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
        const spacer = document.getElementById("spacer");
        if (!spacer) return;

        const spacerTop = spacer.offsetTop; //Body is parent so this measures from top of page
        const pageBottom = window.scrollY + window.innerHeight;
        spacer.style.height = Math.max(0, pageBottom - spacerTop) + "px";
        
        const fullScreen = document.documentElement.scrollHeight <= window.innerHeight + 1;
        if (fullScreen || spacer.offsetHeight <= 1) {
            spacer.style.height = "0px";
            window.removeEventListener("scroll", checkSpacer);
        }
    }, 25);
}
