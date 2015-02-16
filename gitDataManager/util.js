var fs = require('fs');
var logFilePath = "../log/log-gitrank.json";

function generateLogStructure(logMsg){
    return {
        "date" : new Date().toISOString(),
        "log" : logMsg 
    };
}

function writeToFile(jsonInput){
    fs.appendFile(logFilePath, JSON.stringify(jsonInput)+"\n\r", function(err){
        if(err){
            console.log(err);
        }
    });
}

exports.logGitRank = function logGitRank(logToStore){
    writeToFile(generateLogStructure(logToStore))
}
