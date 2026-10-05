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
function resizeTooltip() {
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