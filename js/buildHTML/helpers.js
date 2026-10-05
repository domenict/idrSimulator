function getToolTipFromTemplate(template, id) {
    const tooltipID = "tooltip-" + id;
    const spanHTML = 
        `<span class="help-wrapper"
            role="button"
            tabindex="0"
            aria-label="${template.ariaLabel}"
            aria-describedby="${tooltipID}"
            aria-expanded="false">
            <svg class="help-icon" focusable="false" tabIndex="-1">
                <use href="#help-hover"></use>
            </svg>
            <div id="${tooltipID}" class="tooltip" role="tooltip" aria-hidden="true" tabIndex="-1"><!-- beautify ignore:start -->${template.text}<!-- beautify ignore:end -->
            </div>
        </span>`;
    return spanHTML;
}

function getDataAttributesFromTemplate(template, additionalAttributes = null) {
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const attribute = keys[i] + '="' + template[keys[i]] + '"';
        (!output) ? output = attribute : output += attribute;
        if (i !== keys.length - 1) output += ' ';
    }
    output = (additionalAttributes) ? output + additionalAttributes : output;
    return output;
}