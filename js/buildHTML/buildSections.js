function buildSection(template) {
    const header = template.borrower || 'family';
    const borrower = template.borrower;
    const sectionHTML = `
        <h2 id="${header}-heading" class="field-header">${header.toUpperCase()}</h2>
        
        ${buildRows(template)}
        ${(borrower) ? getLoansFromTemplate(template.borrower) : ''}
    `;

    const formattedHTML = html_beautify(sectionHTML, {
        indent_size: 4,
        indent_level: 4,
        indent_char: ' ',
        max_preserve_newlines: 1,
        preserve_newlines: true,
        wrap_line_length: 0
    });
    return `\n${formattedHTML}`;
}

function buildRows(template) {
    const borrower = template.borrower;
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        if (keys[i] === 'borrower') continue;
        const row = buildRowFromTemplate(template[keys[i]], borrower);
        (!output) ? output = row : output += row;
        if (i !== keys.length - 2) output += `\n`;
    }
    return output;
}

function buildRowFromTemplate(template, borrower) {
    const comment = template.comment;
    const id = (template.id) ? 'id="' + template.id + '"' : null;
    const classes = template.class;
    const fields = template.fields;

    const rowHTML = 
        `${(comment) ? comment : ''}
        <div ${(id) ? id : ''} class="${classes}">
            ${buildFieldsFromTemplate(fields, borrower)}
        </div>`;
    return rowHTML;
}

function buildFieldsFromTemplate(template, borrower) {
    let output;
    const keys = Object.keys(template);
    for (let i = 0; i < keys.length; i++) {
        const type = template[keys[i]].input;
        let field;
        switch (type) {
            case ('number'):
                field = getNumberInputFromTemplate(template[keys[i]], borrower);
                break
            case ('select'):
                field = getSelectFromTemplate(template[keys[i]], borrower);
                break;
            case ('radio'):
                field = getRadioFromTemplate(template[keys[i]]);
                break;
        }
        (!output) ? output = field : output += field;
        if (i !== keys.length - 1) output += `\n`;
    }
    return output;
}