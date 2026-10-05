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
    option.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    dropdown.setAttribute('aria-activedescendant', option.id);
    valueSpan.textContent = option.textContent;
    hiddenInput.value = option.dataset.value;

    if (!suppressEvents) {
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

function setSelectDropdownHeight() {
    const expandedTrigger = document.querySelector('.select-trigger[aria-expanded="true"]');
    if (expandedTrigger) {
        const { dropdown, options } = getSelectComponents(expandedTrigger);
        const activeOption = expandedTrigger.closest('.select-wrapper').querySelector('li[aria-selected="true"]');
        const savedVisibleTop = activeOption.offsetTop - dropdown.scrollTop;

        const zoomFactor = window.devicePixelRatio || 1;
        const windowHeight = window.innerHeight;
        const normalizedInnerHeight = windowHeight * zoomFactor;

        const rawCellHeight = activeOption.getBoundingClientRect().height;
        const cellHeight = Math.round(rawCellHeight * zoomFactor) / zoomFactor;
        options.forEach(option => { option.style.height = `${cellHeight}px`; });

        const normalizedMaxHeight = Math.max(1, Math.floor((normalizedInnerHeight * 0.30) / cellHeight)) * cellHeight;
        const scaledMaxHeight = Math.max(1, Math.floor((windowHeight * 0.50) / cellHeight)) * cellHeight;
        const maxHeight = Math.min(normalizedMaxHeight, scaledMaxHeight);
        dropdown.style.setProperty('--dropdown-max-height', `${maxHeight}px`);

        dropdown.offsetHeight; 
        dropdown.scrollTop = activeOption.offsetTop - savedVisibleTop;
    }
}

function handleSelectOpen(e) {
    const { trigger, dropdown, options } = getSelectComponents(e.target);
    trigger.setAttribute('aria-expanded', 'true');
    dropdown.style.display = 'block';

    requestAnimationFrame(() => {
        if (dropdown.getBoundingClientRect().bottom + 16 > document.documentElement.clientHeight) {
            dropdown.style.transform = 'translateY(-100%)';
            dropdown.style.top = 'calc(0% - 2px)';
        }
        dropdown.focus();
    });
    setSelectDropdownHeight();

    const selectedOption = options.find(o => o.getAttribute('aria-selected') === 'true') || options[0];
    if (selectedOption) dropdown.scrollTop = selectedOption.offsetTop;
}

function handleSelectClose(e) {
    const { trigger, dropdown } = getSelectComponents(e.target);
    trigger.setAttribute('aria-expanded', 'false');
    dropdown.style.display = 'none';

    requestAnimationFrame(() => {
        dropdown.style.transform = 'none';
        dropdown.style.top = 'calc(100% + 2px)';
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

    if (/^[a-zA-Z ]$/.test(e.key)) {
        e.preventDefault();
        handleSelectLookAhead(e)
    }
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

    if (/^[a-zA-Z ]$/.test(e.key)) {
        e.preventDefault();
        handleSelectLookAhead(e)
    }
    if (['Escape', 'Enter'].includes(e.key)) {
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

function handleSelectLookAhead(e) {
    const { dropdown, options } = getSelectComponents(e.target);
    clearTimeout(selectSearchTimeout);
        if (selectSearchString == null) selectSearchString = '';

        selectSearchString += e.key.toLowerCase();
        const match = [...options].find(li => li.textContent.trim().toLowerCase().startsWith(selectSearchString));
        if (match) {
            setSelectOption(match);
            dropdown.scrollTop = match.offsetTop;
        }

        selectSearchTimeout = setTimeout(() => {
            selectSearchString = '';
        }, 1000); 
        return;
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