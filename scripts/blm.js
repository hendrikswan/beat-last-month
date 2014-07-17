function toRealAmount(amount){
    return (amount.debit_or_credit === 'credit') ?
        amount.amount :
        -amount.amount;
}

/*
    {
      "id": "53c7a7ab51dfa611f0261431",
      "customerId": "4e76f2441e56ea0b4cdf71fe",
      "description": "Notific Fee Sms Notifyme 12 Sms Notifications",
      "accountId": "4e7894f268f3760f44ede12a",
      "accountName": "ABSA Cheque *2239",
      "accountClass": "Bank",
      "isDeleted": false,
      "payPeriod": 201407,
      "amount": {
        "amount": 0.0,
        "currencyCode": "ZAR",
        "debitOrCredit": "credit"
      },
      "transactionDateYear": 2014,
      "transactionDateMonth": 7,
      "transactionDateDay": 17,
      "transactionDate": 1405580400000.0,
      "isParentTransaction": false,
      "childTransactions": [],
      "isChildTransaction": false,
      "parentId": "000000000000000000000000",
      "categoryId": "4d9c5dfc8aafd90828000023",
      "categoryName": "Transfer",
      "spendingGroupId": "4d9c747850610817942e45ab",
      "spendingGroupName": "Transfer",
      "createdAt": 1405593515885.0,
      "updatedAt": 1405593515885.0
    },
*/


var grouped = _(transactions)
    .filter(function(tx){
        return tx.spendingGroupName  != 'Income'
        && tx.spendingGroupName != 'Exceptions'
        && tx.categoryName != 'Investments'
        && tx.categoryName != 'Savings'
        && tx.spendingGroupName != 'Transfer'
        && (tx.accountClass == 'Bank' ||tx.accountClass == 'Credit Card' );
        // && tx.categoryName != 'Card Repayments' //card needs to be linked then?
        // && tx.categoryName != 'Home Loan Repayments'; //HL needs to be linked then?
    })
    .map(function(tx){
        return {
            date: tx.transactionDate,
            amount: toRealAmount(tx.amount),

        }
    })
    .sortBy(function(tx){return tx.date;})
    .groupBy(function(tx){
        return new Date(tx.date);
    })
    .value();

var summed = _(grouped)
    .keys()
    .map(function(k){

        var sum = grouped[k].reduce(function(result, tx) {
            return result+= tx.amount;
        }, 0);

        return {date: k, total: sum};
    })
    .value();


var averaged = _(summed)
    .map(function(total, i){
        if(i >= 2){
            var avg = (summed[i-2].total
                + summed[i-1].total
                + summed[i].total)/3;
            total.avg = avg;
        }

        return total;

    })
    .value();

function createDateSeries(fromDate, toDate){
    var dates = [];
    var loopDate = new Date(fromDate);

    while(loopDate < toDate){
        dates.push(loopDate);
        loopDate = new Date(loopDate).add(1).days();
    }

    console.log(dates);

    var totalsForPeriod = _(averaged)
        .filter(function(data){
            var date = new Date(data.date);
            return date >= fromDate  && date < toDate;
        })
        // .map(function(data, i){
        //     data.index = i;
        //     return data;
        // })
        .value();

    var paddedTotals = [];

    _(dates).forEach(function(d){
        var totalForDate = _.find(totalsForPeriod, function(t){
            return t.date == d;
        });
    })

    return totalsForPeriod;
}



var recentStart = new Date().add(-30).days();
console.log(recentStart)
var recent = createDateSeries(recentStart, new Date());

var oldStart = new Date().add(-60).days();
console.log(oldStart);
var old = createDateSeries(oldStart, recentStart);



// console.log(averaged);
console.log(recent);
console.log(old);










