/* -------------------------------------------------
    LISTENER HANDLING
------------------------------------------------- */
function createTooltipListeners(wrapper) {
    const tooltip = wrapper.querySelector(".tooltip");
    const show = (e) => {
        const wrapper = e.target;
        const inFocus = tooltip.classList.contains("tooltip-open");
        const locked = tooltip.classList.contains("tooltip-locked");
        if(!locked && !inFocus) {
            wrapper.setAttribute('aria-expanded', 'true');
            tooltipBoundingBox(tooltip);
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
    wrapper.addEventListener('click', clickFocusTooltipHandler);
    wrapper.addEventListener('focusin', () => {
        if (!wrapper.matches(':focus-visible')) return;
        focusTooltip(tooltip);
    });
}

// Focuses tooltip for accessability and locks other tooltips from hover
const clickFocusTooltipHandler = (e) => {
    e.stopPropagation();
    e.preventDefault();
    const tooltip = e.target.closest('.help-wrapper').querySelector(".tooltip");

    let isOpen = tooltip.classList.contains('tooltip-open');
    if (!isOpen) {
        const alreadyOpenTooltip = document.querySelector('.tooltip-open');
        if (alreadyOpenTooltip) closeTooltip(alreadyOpenTooltip);
        focusTooltip(tooltip);
    } else {
        closeTooltipHandler(e);
    }
}

const closeTooltipHandler = (e) => {
    const targetWrapper = e.target.closest('.help-wrapper');
    const tooltip = (targetWrapper) ? targetWrapper.querySelector('.tooltip') : document.querySelector('.tooltip-open');

    // Allows highlighting inside focused tooltips
    if (e && e.type === 'click') {
        const rect = tooltip.getBoundingClientRect();
        const isClickInsideTooltipBox = 
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom;
        if (isClickInsideTooltipBox) return;
    }

    closeTooltip(tooltip);
    if (e.type === 'keydown' && e.key !== 'Tab') {
        const field = e.target.closest('.field');
        const nextInput = field.querySelector('.input-wrapper input, .select-wrapper button');
        nextInput.focus();
    }
};

const keydownCloseTooltipHandler = (e) => {
    const closeKeys = ['Escape', 'Enter', ' ', 'Tab'];
    if (closeKeys.includes(e.key)) {
        if (e.key !== 'Tab') {
            e.stopPropagation();
            e.preventDefault();
        }
        closeTooltipHandler(e); 
    }
};

function focusTooltip(tooltip) {
    const wrapper = tooltip.closest('.help-wrapper');

    tooltip.classList.add('tooltip-open');
    tooltip.setAttribute('aria-hidden', 'false');
    tooltipBoundingBox(tooltip);
    wrapper.setAttribute('aria-expanded', 'true');

    Array.from(document.getElementsByClassName("tooltip")).forEach(el => {
        if (el.id !== tooltip.id) el.classList.add("tooltip-locked");
    });

    setTimeout(() => {
        document.addEventListener('click', closeTooltipHandler);
        wrapper.addEventListener('keydown', keydownCloseTooltipHandler);
    }, 10);
}

function closeTooltip(tooltip) {
    const wrapper = tooltip.closest('.help-wrapper');
    const isHovered = wrapper.matches(':hover');

    tooltip.blur();
    tooltip.classList.remove('tooltip-open');
    tooltip.setAttribute('aria-hidden', 'true');
    if (!isHovered) wrapper.setAttribute('aria-expanded', 'false');
    announcer.textContent = "";

    Array.from(document.getElementsByClassName("tooltip-locked")).forEach(el => {
        el.classList.remove("tooltip-locked");
    });

    document.removeEventListener('click', closeTooltipHandler);
    wrapper.removeEventListener('keydown', keydownCloseTooltipHandler);
}



/* -------------------------------------------------
    BOUNDING BOX
------------------------------------------------- */
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
function resizeTooltip() {
    const openTooltip = document.querySelector('.tooltip-open');
    tooltipBoundingBox(openTooltip);
}

// Sets bounding box for tooltips
function tooltipBoundingBox(tooltip) {
    if (!tooltip) return;
    const wrapper = tooltip.closest('.help-wrapper');
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
