var GitArchDataGetter = require('./gitArchDataGetter-lib');
var GitDataPusherElasticModule = require('../../gitDataManager/gitDataPusherElasticModule');

function convertDateFormatGithubArchive(date) {
    var d = verifyIfTwoDigits(date.getDate());
    var m = verifyIfTwoDigits(date.getMonth() + 1);
    var y = date.getFullYear();
    var h = date.getHours();

    var res = y + '-' + m + '-' + d + '-' + h;
    return res;
}

function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
}

function verifyIfTwoDigits(number) {
    if(number < 10) {
        return ('0' + number);
    }
    return number;
}

exports.syncGithubArchive = function syncGithubArchive(startDate) {
    var targetDate = new Date();

    targetDate.setMonth(targetDate.getMonth() - 6);
    startDate = typeof startDate !== 'undefined' ? startDate : targetDate;

    startDate.setHours(0);
    startDate.setMinutes(0);

    var currentDate = {
        date: startDate,
        dateGAFormat: convertDateFormatGithubArchive(startDate),
        getDate: function() {
            return this.date;
        },
        getDateGAFormat: function() {
            return this.dateGAFormat;
        },
        updateDateGAFormat: function() {
            this.dateGAFormat = convertDateFormatGithubArchive(this.date);
        },
        incrementDay: function() {
            this.date.setDate(this.date.getDate() + 1);
            this.date.setHours(0);
            this.updateDateGAFormat();
        },
        incrementHour: function() {
            this.date.setHours(this.date.getHours() + 1);
            this.updateDateGAFormat();
        }
    }

    var numberOfDays = ((new Date()).getTime() - currentDate.getDate().getTime()) / (24 * 3600 * 1000);

    console.log("Debug syncGithubArchive : since "+ currentDate);
    console.log("Debug syncGithubArchive : to "+ (new Date()).getTime());
    console.log("Debug syncGithubArchive : numberOfDays "+ numberOfDays);

    // go through all days since startDate
    // days
    // while (numberOfDays >= 0) {
    //     // hours
    //     var numberOfHours = 24;
    //     if (numberOfDays < 1) {
    //         numberOfHours = (new Date().getHours());
    //     }
    //     while (numberOfHours > 0) {
    //         downloadArchive(currentDate.getDateGAFormat());
    //         numberOfHours--;
    //         if (numberOfHours > 0) {
    //             currentDate.incrementHour();
    //         }
    //     }
    //     numberOfDays--;
    //     currentDate.incrementDay();
    // }
    // 
    // 
    recursifLauncher(4320, currentDate);

    
}

function recursifLauncher(numberOfHours, currentDate) {
    if(numberOfHours >= 0) {
        currentDate.incrementHour();

                console.log("Debug downloadArchive for " + currentDate.getDateGAFormat());
                GitArchDataGetter.getArchive(currentDate.getDateGAFormat(), function(events) {
                    console.log("Entries successfully retrieved: " + events.length);
                    console.log("Pushing events.");
                    GitDataPusherElasticModule.init(function() {
                        var fct = recursifLauncher;
                        GitDataPusherElasticModule.pushEvents(events, function() {
                            recursifLauncher(numberOfHours--, currentDate);
                        }, function(err) {
                            console.log("FAIL:\n");
                            if (err) {
                                console.log("" + err.toString());
                            }
                            return;
                        });
                    });
                }, function(err) {console.log(err.toString());});
    }
}

// @deprecated
function downloadArchive(targetDate) {
    console.log("Debug downloadArchive for " + targetDate);
    GitArchDataGetter.getArchive(targetDate, function(events) {
        console.log("Entries successfully retrieved: " + events.length);
        console.log("Pushing events.");
        GitDataPusherElasticModule.init();
        try{
            GitDataPusherElasticModule.pushEvents(events);
        }
        catch(err) {
            if(typeof err !== 'errorMurat') {
                //err detected so we need to repush the events
                
                downloadArchive
            }
        }
    });
}


