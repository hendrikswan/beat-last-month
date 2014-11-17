$(function(){
    window.modelStore = {
        transactions: []
    };

    var sessionToken = localStorage.getItem('token');
    $.ajaxSetup({
        beforeSend: function(xhr) {
            xhr.setRequestHeader("X-SESSION-TOKEN", sessionToken)
        }
    });

    var customerId = localStorage.getItem('customer_id');



    function getAggregate(){
        console.log('calling aggregate');
        $.get('https://api.22seven.com/customer/' + customerId + '/aggregate?version=7&deltas=false', function(aggregateResponse){
            //window.transactions = aggregateResponse.transactions;
            console.log('got aggregate result');

            var transactions = _.uniq(aggregateResponse.transactions, 'id');
            console.log('agg response: ' + aggregateResponse.transactions.length + ', deduped: ' + transactions.length);

            function updateModelStore(){
                console.time('model store update');

                _(transactions).each(function(delta) {
                    var match = _(modelStore.transactions).find(function(item) {
                        return item.id === delta.id;
                    });

                    if (match){
                        var index = modelStore.transactions.indexOf(match);
                        modelStore.transactions[index] = delta;
                    }else{
                        modelStore.transactions.push(delta);
                    }
                });
                console.timeEnd('model store update');
            }


            function updateInDb(){
                console.time('storing in DB');
                db.open( {
                    server: 'my-app',
                    version: 3,
                    schema: {
                        transactions: {
                            key: { keyPath: 'id' , autoIncrement: false },
                            indexes: {
                                payPeriod: { },
                            }
                        }
                    }
                } ).then( function ( s ) {
                    window.server = s;
                    // server.people.add( {
                    //     firstName: 'Aaron',
                    //     lastName: 'Powell',
                    //     answer: 42
                    // } ).then( function ( item ) {
                    //     console.log('saved the item');
                    // } );
                    var insertOps = _.map(transactions, function(tx){
                        return function(cb){
                            //console.log('saved transaction : ', tx.id);
                            server.transactions.add(tx)
                            .then( function ( item ) {
                                //console.log('saved an item to the db');
                                cb(null);
                            })
                            .fail(function(err){
                                debugger;
                                cb(err);
                            });
                        };
                    });

                    async.series(insertOps, function(err){
                        if(err){
                            return console.error('an error occurred while trying to insert the transactions: ', err);
                        }

                        console.timeEnd('storing in DB');
                    });


                } );
            }


            updateModelStore();

            updateInDb();



        });
    }

    $("#do-agg").click(function(e){
        getAggregate();
    });


    function getByPayPeriod(){
        var payperiod = $("#payperiod").val();

        (function(){
            console.time('getting from memory store');

            var transactions = modelStore.transactions || [];
            transactions.filter(function(t){
                return t.payPeriod == +payperiod;
            });

            console.log('found ' + transactions.length + ' transactions from memory store');
            console.timeEnd('getting from memory store');
        })();

        (function(){
            console.time('getting from index store');
            window.server.transactions.query()
                  .filter( 'payPeriod', +payperiod )
                  .execute()
                  .then( function ( results ) {
                        console.log('found ' + results.length + ' transactions from index store');
                  } );
            console.timeEnd('getting from index store');
        })();


    }

    $("#btn-pay").click(function(e){
        getByPayPeriod();
    });



});












