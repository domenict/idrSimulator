function getRepaymentOrders(loans) { 
    const findAvalanche = (loanPool) => (loanPool.sort((a,b) => {
        if (b.data.interestRate !== a.data.interestRate) {
            return b.data.interestRate - a.data.interestRate;
        }

        const aBalance = a.data.principal + a.data.interestAccrual;
        const bBalance = b.data.principal + b.data.interestAccrual;
        return aBalance - bBalance;
    }));

    const borrowers = Object.keys(loans);
    const repaymentOrders = {};
    borrowers.forEach(borrower => {
        const borrowerLoans = Object.entries(loans[borrower]).map(([id, val]) => ({id, owner: borrower, data: val}));
        const borrowerSortedLoans = findAvalanche([...borrowerLoans]);
        borrowerSortedLoans.forEach(loan => { delete loan.data });
        repaymentOrders[borrower] = borrowerSortedLoans;
    });
    return repaymentOrders;
} 