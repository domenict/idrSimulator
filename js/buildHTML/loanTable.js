function getLoansFromTemplate(borrower) {
    const divHTML = 
        `<!-- ==================== ${borrower.toUpperCase()} LOANS ==================== -->
        <div class="loan-table-wrapper ${borrower + 'LoanTable'}">
            <table id="${borrower}Loans" class="loan-table" aria-describedby="live-announcements">
                <thead>
                    <tr>
                        <td></td>
                        <th>Principal Amount</th>
                        <th>Accrued Interest</th>
                        <th>Interest Rate</th>
                        <td></td>
                    </tr>
                </thead>
                <tbody>
                    ${getRowTemplate(borrower)}
                </tbody>
            </table>
        </div>`;
    return divHTML;
}

function getRowTemplate(borrower, loanNumber = 1) {
    const isSpouse = borrower === 'spouse';
    const disabled = isSpouse && window.getComputedStyle(document.getElementById("spouseSection")).getPropertyValue('display') === 'none';
    const labelPrefix = `Your${(borrower === 'spouse') ? ' spouse\'s ' : ' '}loan ${loanNumber}`;

    const trHTML = 
        `<tr id="${borrower}_loan${loanNumber}" aria-disabled="false">
            <td class="row-label">
                <span id="${borrower}_loan${loanNumber}_span">Loan ${loanNumber}</span>
            </td>
            <td>
                <div class="input-wrapper dollar">
                    <span class="unit">$</span>
                    <input id="${borrower}_loan${loanNumber}_principal"
                        name="${borrower}_loan${loanNumber}_principal"
                        type="text"
                        data-storage="localStorage"
                        data-type="number"
                        data-tag="${borrower}LoanField"
                        autocomplete="off"
                        aria-label="${labelPrefix} principal balance"
                        step="0.01"
                        min="0.01"
                        max="999999.99"
                        required
                        ${(disabled) ? 'disabled' : ''}>
                    <span class="error-message"></span>
                    <button type="button" class="spinner-btn spinner-up" aria-label="Increase loan ${loanNumber} principal amount" tabindex="-1"></button>
                    <button type="button" class="spinner-btn spinner-down" aria-label="Decrease loan ${loanNumber} principal amount" tabindex="-1"></button>
                </div>
            </td>
            <td>
                <div class="input-wrapper dollar">
                    <span class="unit">$</span>
                    <input id="${borrower}_loan${loanNumber}_interest"
                        name="${borrower}_loan${loanNumber}_interest"
                        type="text"
                        data-storage="localStorage" 
                        data-type="number"
                        data-tag="${borrower}LoanField"
                        autocomplete="off"
                        aria-label="${labelPrefix} accrued interest"
                        step="0.01"
                        min="0"
                        max="999999.99"
                        required
                        ${(disabled) ? 'disabled' : ''}>
                    <span class="error-message"></span>
                    <button type="button" class="spinner-btn spinner-up" aria-label="Increase loan ${loanNumber} accrued interest" tabindex="-1"></button>
                    <button type="button" class="spinner-btn spinner-down" aria-label="Decrease loan ${loanNumber} accrued interest" tabindex="-1"></button>
                </div>
            </td>
            <td>
                <div class="input-wrapper percent">
                    <span class="unit">%</span>
                    <input id="${borrower}_loan${loanNumber}_rate"
                        name="${borrower}_loan${loanNumber}_rate"
                        type="text"
                        data-storage="localStorage" 
                        data-type="number"
                        data-tag="${borrower}LoanField"
                        autocomplete="off"
                        aria-label="${labelPrefix} interest rate"
                        step="0.01"
                        min="0"
                        max="99.99"
                        required
                        ${(disabled) ? 'disabled' : ''}>
                    <span class="error-message"></span>
                    <button type="button" class="spinner-btn spinner-up" aria-label="Increase loan ${loanNumber} interest rate" tabindex="-1"></button>
                    <button type="button" class="spinner-btn spinner-down" aria-label="Decrease loan ${loanNumber} interest rate" tabindex="-1"></button>
                </div>
            </td>
            <td class="btn-cell">
                <button id="${borrower}_loan${loanNumber}_toggle" type="button" class="toggleLoan" data-enabled="true" aria-label="Disable loan ${loanNumber}" tabindex="0">
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="disable-button-svg">
                        <circle cx="5.5" cy="5.5" r="5"/>
                        <line class="slash" x1="2" y1="2" x2="9" y2="9" stroke-width="1"/>
                    </svg>
                </button>
                <button id="${borrower}_loan${loanNumber}_add" type="button" class="addLoan" aria-label="Add new loan after loan ${loanNumber}" tabindex="0">+</button>
                <button id="${borrower}_loan${loanNumber}_delete" type="button" class="deleteLoan" aria-label="Remove loan ${loanNumber}" tabindex="0">−</button>
            </td>
        </tr>`;

    const formattedTR = html_beautify(trHTML, {
        indent_size: 4,
        indent_level: 7,
        indent_char: ' ',
        max_preserve_newlines: 1,
        preserve_newlines: true,
        wrap_line_length: 0
    });
    return formattedTR;
}