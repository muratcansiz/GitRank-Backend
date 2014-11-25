var GitArchDataGetter = require('gitArch-dataGetter');

function convertDateFormatGithubArchive(date) {
    var d = date.getDate();
    var m = date.getMonth() + 1;
    var y = date.getFullYear();
    var h = date.getHours();

    var res = y + '-' + m + '-' + d + '-' + h;
    return res;
}

function daysInMonth(month, year) {
    return new Date(year, month, 0).getDate();
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
    // go through all days since startDate
    // days
    while (numberOfDays >= 0) {
        // hours
        var numberOfHours = 24;
        if (numberOfDays < 1) {
            numberOfHours = (new Date().getHours());
        }
        while (numberOfHours > 0) {
            toto(currentDate.getDateGAFormat());
            numberOfHours--;
            if (numberOfHours > 0) {
                currentDate.incrementHour();
            }
        }
        numberOfDays--;
        currentDate.incrementDay();
    }
}

function toto(blabla) {
    console.log("LINK " + blabla);
}
