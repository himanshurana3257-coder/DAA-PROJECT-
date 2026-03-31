// =====================================================
//  BudgetBalancer — script.js
//  Team BYTEX | Event Budget Balancing System
// =====================================================


// ---- Data ----
var sponsors = [];
var expenses = [];
var sponsorIdCounter = 1;
var expenseIdCounter = 1;

// ---- Theme ----
function toggleTheme() {
    var body = document.body;
    if (body.classList.contains('dark')) {
        body.classList.remove('dark');
        body.classList.add('light');
    } else {
        body.classList.remove('light');
        body.classList.add('dark');
    }
}

// ---- Page Navigation ----
function showBalancerPage() {
    document.getElementById('landingPage').classList.add('hidden');
    document.getElementById('balancerPage').classList.remove('hidden');
    window.scrollTo(0, 0);
}

function showLandingPage() {
    document.getElementById('balancerPage').classList.add('hidden');
    document.getElementById('landingPage').classList.remove('hidden');
    window.scrollTo(0, 0);
}

// ---- ADD SPONSOR ----
function addSponsor() {
    var nameInput   = document.getElementById('sponsorName');
    var amountInput = document.getElementById('sponsorAmount');

    var name   = nameInput.value.trim();
    var amount = parseFloat(amountInput.value);

    if (!name) {
        showToast('Please enter a contributor name.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid contribution amount.');
        return;
    }

    sponsors.push({ id: sponsorIdCounter++, name: name, amount: amount });
    nameInput.value   = '';
    amountInput.value = '';
    renderSponsorList();
}

// ---- ADD EXPENSE ----
function addExpense() {
    var nameInput   = document.getElementById('expenseName');
    var amountInput = document.getElementById('expenseAmount');

    var name   = nameInput.value.trim();
    var amount = parseFloat(amountInput.value);

    if (!name) {
        showToast('Please enter an expense title.');
        return;
    }
    if (isNaN(amount) || amount <= 0) {
        showToast('Please enter a valid expense amount.');
        return;
    }

    expenses.push({ id: expenseIdCounter++, name: name, amount: amount });
    nameInput.value   = '';
    amountInput.value = '';
    renderExpenseList();
}

// ---- REMOVE ----
function removeSponsor(id) {
    sponsors = sponsors.filter(function(s) { return s.id !== id; });
    renderSponsorList();
}

function removeExpense(id) {
    expenses = expenses.filter(function(e) { return e.id !== id; });
    renderExpenseList();
}

// ---- RENDER SPONSOR LIST ----
function renderSponsorList() {
    var container = document.getElementById('sponsorList');
    var badge     = document.getElementById('sponsorCount');
    badge.textContent = sponsors.length;

    if (sponsors.length === 0) {
        container.innerHTML = '<p class="empty-note">No contributors added yet.</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < sponsors.length; i++) {
        var s = sponsors[i];
        html += '<div class="list-item">';
        html +=   '<span class="list-item-name">' + escapeHtml(s.name) + '</span>';
        html +=   '<span class="list-item-amount">₹' + formatNum(s.amount) + '</span>';
        html +=   '<button class="btn-remove" onclick="removeSponsor(' + s.id + ')" title="Remove">✕</button>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ---- RENDER EXPENSE LIST ----
function renderExpenseList() {
    var container = document.getElementById('expenseList');
    var badge     = document.getElementById('expenseCount');
    badge.textContent = expenses.length;

    if (expenses.length === 0) {
        container.innerHTML = '<p class="empty-note">No expenses added yet.</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < expenses.length; i++) {
        var e = expenses[i];
        html += '<div class="list-item">';
        html +=   '<span class="list-item-name">' + escapeHtml(e.name) + '</span>';
        html +=   '<span class="list-item-amount">₹' + formatNum(e.amount) + '</span>';
        html +=   '<button class="btn-remove" onclick="removeExpense(' + e.id + ')" title="Remove">✕</button>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ---- CALCULATE ----
function calculate() {
    if (sponsors.length === 0) {
        showToast('Add at least one contributor first.');
        return;
    }
    if (expenses.length === 0) {
        showToast('Add at least one expense first.');
        return;
    }

    var totalContrib  = getTotalContrib();
    var totalExpenses = getTotalExpenses();
    var netOverall    = totalContrib - totalExpenses;

    // Summary bar
    document.getElementById('sumContrib').textContent  = '₹' + formatNum(totalContrib);
    document.getElementById('sumExpense').textContent  = '₹' + formatNum(totalExpenses);
    var netEl = document.getElementById('sumNet');
    netEl.textContent = (netOverall >= 0 ? '+' : '-') + '₹' + formatNum(Math.abs(netOverall));
    netEl.className = 's-value ' + (netOverall >= 0 ? 'green' : 'red');
    document.getElementById('summaryBar').classList.remove('hidden');

    // Per-person net balance (equal expense split)
    var shareEach = totalExpenses / sponsors.length;
    var balances  = [];
    for (var i = 0; i < sponsors.length; i++) {
        var net = sponsors[i].amount - shareEach;
        balances.push({
            name:        sponsors[i].name,
            contributed: sponsors[i].amount,
            share:       shareEach,
            net:         Math.round(net * 100) / 100
        });
    }

    renderBalanceTable(balances);

    var transactions = settleDebts(balances);
    renderTransactions(transactions);

    document.getElementById('outputSection').classList.remove('hidden');
    setTimeout(function() {
        document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

// =====================================================
//  GREEDY SETTLEMENT ALGORITHM
//  - Split into creditors (net > 0) and debtors (net < 0)
//  - Sort both descending by absolute amount
//  - Match largest creditor with largest debtor
//  - Repeat until all settled
// =====================================================
function settleDebts(balances) {
    var transactions = [];

    var creditors = [];
    var debtors   = [];

    for (var i = 0; i < balances.length; i++) {
        var net = balances[i].net;
        if (net > 0.01) {
            creditors.push({ name: balances[i].name, amount: net });
        } else if (net < -0.01) {
            debtors.push({ name: balances[i].name, amount: Math.abs(net) });
        }
    }

    // Sort descending (greedy: handle largest imbalances first)
    creditors.sort(function(a, b) { return b.amount - a.amount; });
    debtors.sort(function(a, b)   { return b.amount - a.amount; });

    var ci = 0;
    var di = 0;

    while (ci < creditors.length && di < debtors.length) {
        var creditor = creditors[ci];
        var debtor   = debtors[di];

        var settle = Math.min(creditor.amount, debtor.amount);
        settle = Math.round(settle * 100) / 100;

        if (settle > 0.01) {
            transactions.push({
                from:   debtor.name,
                to:     creditor.name,
                amount: settle
            });
        }

        creditor.amount = Math.round((creditor.amount - settle) * 100) / 100;
        debtor.amount   = Math.round((debtor.amount   - settle) * 100) / 100;

        if (creditor.amount < 0.01) ci++;
        if (debtor.amount   < 0.01) di++;
    }

    return transactions;
}

// ---- RENDER BALANCE TABLE ----
function renderBalanceTable(balances) {
    var tbody = document.getElementById('balanceBody');
    var html  = '';

    for (var i = 0; i < balances.length; i++) {
        var b   = balances[i];
        var net = b.net;

        var statusLabel, statusClass;
        if (net > 0.01) {
            statusLabel = 'To Receive';
            statusClass = 'creditor';
        } else if (net < -0.01) {
            statusLabel = 'Owes';
            statusClass = 'debtor';
        } else {
            statusLabel = 'Settled';
            statusClass = 'settled';
        }

        var netClass = net >= 0 ? 'amount-positive' : 'amount-negative';
        var netSign  = net >= 0 ? '+' : '-';

        html += '<tr>';
        html +=   '<td>' + (i + 1) + '</td>';
        html +=   '<td class="name-cell">' + escapeHtml(b.name) + '</td>';
        html +=   '<td>₹' + formatNum(b.contributed) + '</td>';
        html +=   '<td>₹' + formatNum(b.share) + '</td>';
        html +=   '<td class="' + netClass + '">' + netSign + '₹' + formatNum(Math.abs(net)) + '</td>';
        html +=   '<td><span class="status-pill ' + statusClass + '">' + statusLabel + '</span></td>';
        html += '</tr>';
    }

    tbody.innerHTML = html;
}

// ---- RENDER TRANSACTIONS ----
function renderTransactions(transactions) {
    var container = document.getElementById('transactionList');
    var badge     = document.getElementById('txnCount');

    badge.textContent = transactions.length + ' transaction' + (transactions.length !== 1 ? 's' : '');

    if (transactions.length === 0) {
        container.innerHTML = '<p class="no-txn">Everyone is already settled — no transactions needed! 🎉</p>';
        return;
    }

    var html = '';
    for (var i = 0; i < transactions.length; i++) {
        var t = transactions[i];
        html += '<div class="txn-item">';
        html +=   '<span class="txn-num">' + (i + 1) + '</span>';
        html +=   '<span class="txn-from">' + escapeHtml(t.from) + '</span>';
        html +=   '<span class="txn-arrow">→ pays →</span>';
        html +=   '<span class="txn-to">' + escapeHtml(t.to) + '</span>';
        html +=   '<span class="txn-amount">₹' + formatNum(t.amount) + '</span>';
        html += '</div>';
    }
    container.innerHTML = html;
}

// ---- RESET ----
function resetAll() {
    sponsors = [];
    expenses = [];
    sponsorIdCounter = 1;
    expenseIdCounter = 1;

    renderSponsorList();
    renderExpenseList();

    document.getElementById('summaryBar').classList.add('hidden');
    document.getElementById('outputSection').classList.add('hidden');
    document.getElementById('balanceBody').innerHTML   = '';
    document.getElementById('transactionList').innerHTML = '';

    showToast('All data cleared.');
}

// ---- HELPERS ----
function getTotalContrib() {
    var total = 0;
    for (var i = 0; i < sponsors.length; i++) total += sponsors[i].amount;
    return total;
}

function getTotalExpenses() {
    var total = 0;
    for (var i = 0; i < expenses.length; i++) total += expenses[i].amount;
    return total;
}

function formatNum(n) {
    return parseFloat(n).toFixed(2);
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;');
}

function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function() {
        toast.classList.remove('show');
    }, 2600);
}

// ---- Enter key navigation ----
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('sponsorName').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('sponsorAmount').focus();
    });
    document.getElementById('sponsorAmount').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addSponsor();
    });
    document.getElementById('expenseName').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') document.getElementById('expenseAmount').focus();
    });
    document.getElementById('expenseAmount').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') addExpense();
    });
});

