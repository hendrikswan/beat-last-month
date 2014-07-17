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

var time = {hour:0, minute:0, second: 0};
var fromDate = new Date().add(-65).days().at(time);
var toDate = Date.today().at(time);

var dates = [];
var loopDate = new Date(fromDate);

while(loopDate < toDate){
    dates.push(loopDate);
    loopDate = new Date(loopDate).add(1).days();
}


var grouped = _(transactions)
    .filter(function(tx){
        return tx.spendingGroupName  != 'Income'
        && tx.spendingGroupName != 'Exceptions'
        && tx.categoryName != 'Investments'
        && tx.categoryName != 'Savings'
        && tx.spendingGroupName != 'Transfer'
        && new Date(tx.transactionDate) > fromDate
        && (tx.accountClass == 'Bank' || tx.accountClass == 'Credit Card' );
        // && tx.categoryName != 'Card Repayments' //card needs to be linked then?
        // && tx.categoryName != 'Home Loan Repayments'; //HL needs to be linked then?
    })
    .map(function(tx){
        return {
            date: new Date(tx.transactionDate).at(time),
            amount: toRealAmount(tx.amount),

        }
    })
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
    .sortBy(function(t){
        return t.date;
    })
    .value();


var padded = _(dates)
    .map(function(d){
        var total = _.find(summed, function(t){return t.date.toString() == d.toString();});
        if(total){
            // console.log('found total for date %s: %s', d, total.total);
            return total;
        }

        return {
            date: d,
            total: 0
        };
    })
    .value();



var averaged = _(padded)
    .map(function(total, i){
        if(i >= 2){
            var avg = (padded[i-2].total
                + padded[i-1].total
                + padded[i].total)/3;
            total.avg = avg;
        }

        return total;

    })
    .value();

console.log(averaged);

function createDateSeries(fromDate, toDate){

    var totalsForPeriod = _(averaged)
        .filter(function(data){
            var date = new Date(data.date);
            var matched = date >= fromDate   && date < toDate;
            //console.log('%s >= %s  && %s < %s == %s', date, fromDate, date, toDate, matched);
            return matched;
        })
        .map(function(data, i){
            data.index = i;
            return data;
        })
        .value();

    return totalsForPeriod;
}



var recentStart = new Date().at(time).add(-31).days();
//console.log(recentStart)
var recent = createDateSeries(recentStart, new Date());

var oldStart = new Date().at(time).add(-61).days();
// console.log(oldStart);
var old = createDateSeries(oldStart, recentStart);



// // console.log(averaged);
console.log(recent);
console.log(old);


var cLabels = _(recent)
    .map(function(d){
        return d.index + 1;
    })
    .value();



function drawChart(canvasId, plotAttribute){

    var recentPoints = _(recent)
        .map(function(d){
            return d[plotAttribute];
        })
        .value();

    var oldPoints = _(old)
        .map(function(d){
            return d[plotAttribute];
        })
        .value();


    var lineChartData = {
        labels : cLabels,
        datasets : [
            {
                label: "Old self",
                fillColor : "rgba(220,220,220,0.2)",
                strokeColor : "rgba(220,220,220,1)",
                pointColor : "rgba(220,220,220,1)",
                pointStrokeColor : "#fff",
                pointHighlightFill : "#fff",
                pointHighlightStroke : "rgba(220,220,220,1)",
                data : oldPoints
            },
            {
                label: "Recent self",
                fillColor : "rgba(151,187,205,0.2)",
                strokeColor : "rgba(151,187,205,1)",
                pointColor : "rgba(151,187,205,1)",
                pointStrokeColor : "#fff",
                pointHighlightFill : "#fff",
                pointHighlightStroke : "rgba(151,187,205,1)",
                data : recentPoints
            }
        ]
    };

    var ctx = document.getElementById(canvasId).getContext("2d");
    new Chart(ctx).Line(lineChartData, {
        responsive: true,
    });

}

window.onload = function(){
    drawChart("raw-chart", "total");
    drawChart("avg-chart", "avg");
}










