$(function(){
    var sessionToken = localStorage.getItem('token');
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader("X-SESSION-TOKEN", sessionToken)
        }
    });



    function renderPage(transactions, toDate){
            var time = {hour:0, minute:0, second: 0};
            var toDate = new Date(toDate).at(time);
            var fromDate = new Date(toDate).add(-65).days().at(time);

            $("#date-range").text(fromDate.toString("MMM yyyy") + " to " + toDate.toString("MMM yyyy"));

            var dates = [];
            var loopDate = new Date(fromDate);

            while(loopDate < toDate){
                dates.push(loopDate);
                loopDate = new Date(loopDate).add(1).days();
            }

            // console.log(dates);
            window.transactions = transactions;

            var expenseTransactions = _(transactions)
                .filter(function(tx){
                    //console.log('checking tx. spending group: ' + tx.spendingGroupName  +', category name: ' + tx.categoryName + ', accountClass: ' + tx.accountClass);
                    return tx.spendingGroupName  != 'Income'
                    && tx.spendingGroupName != 'Exceptions'
                    && tx.categoryName != 'Investments'
                    && tx.categoryName != 'Savings'
                    && tx.spendingGroupName != 'Transfer'
                    && new Date(tx.transactionDate) > fromDate && new Date(tx.transactionDate) < toDate
                    && (tx.accountClass == 'Bank' || tx.accountClass == 'Credit Card' )
                    && tx.categoryName != 'Card Repayments' //card needs to be linked then?
                    && tx.categoryName != 'Home Loan Repayments'; //HL needs to be linked then?
                })
                .sortBy(function(tx){return - tx.transactionDate})
                .map(function(tx){
                    // console.log('mapping transaction on ' + tx.transactionDate + ' with amount ' + tx.amount.amount);
                    return {
                        date: new Date(tx.transactionDate).at(time),
                        amount: tx.amount.amount,
                        categoryName: tx.categoryName,
                        spendingGroupName: tx.spendingGroupName,
                        date: new Date(tx.transactionDate).at(time)
                    }
                })
                .value();

            // console.log(expenseTransactions);

                //console.log(expenseTransactions );
            var grouped = _(expenseTransactions)
                .groupBy(function(tx){
                    return new Date(tx.date);
                })
                .value();

            // console.log(grouped);

            //console.log('found ' + grouped.keys().length + ' days with transactions');

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

            // console.log(summed)


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

            // console.log(padded);



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

            //uses average to create the series
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

                totalsForPeriod.forEach(function(t, i){
                    if(i==0){
                        t.avgSum = Math.abs(t.avg);
                    }else{
                        t.avgSum = totalsForPeriod[i-1].avgSum + Math.abs(t.avg);
                    }
                });

                return totalsForPeriod;
            }



            var recentStart = new Date(toDate).add(-31).days();
            //console.log(recentStart)
            var recent = createDateSeries(recentStart, toDate);

            var oldStart = new Date(toDate).add(-61).days();
            // console.log(oldStart);
            var old = createDateSeries(oldStart, recentStart);


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

            drawChart("raw-chart", "total");
            drawChart("avg-chart", "avg");
            drawChart("avg-count-up-chart", "avgSum");

            // var rp3 = radialProgress($(".blm-control-container")[0] )
            //     .label("RADIAL 3")
            //     //.onClick(onClick3)
            //     .diameter(150)
            //     .minValue(100)
            //     .maxValue(200)
            //     .value(150)
            //     .render();


            var recentTotal = _.last(recent).avgSum;
            var oldTotal = _.last(old).avgSum;



            var rp2 = radialProgress($(".blm-control-container")[0])
                    .label("RADIAL 2")
                    .diameter(300)
                    .value(recentTotal/oldTotal * 100)
                    .render();
    }



    function renderRecent(){
        var toDate = new Date().add(-30).days();
        if(localStorage.getItem('transactions')){
            var transactions = JSON.parse(localStorage.getItem('transactions'));
            return renderPage(transactions, toDate);
        }
        $.get('https://api.22seven.com/customer/4e76f2441e56ea0b4cdf71fe/aggregate?version=7', function(aggregateResponse){
            var transactions = aggregateResponse.transactions;

            localStorage.setItem('transactions', JSON.stringify(aggregateResponse.transactions));
            renderPage(transactions, toDate);
        });
    }

    renderRecent();
});












