var fs = require('fs');
var logFilePath = "../log/log-gitrank.json";
var lastArchiveDLPath = "../log/log-gitrank-lastDLArchive.json";

function generateLogStructure(logMsg){
    return {
        "date" : new Date().toISOString(),
        "log" : logMsg 
    };
}

function generateLastDLStructure(dateLastArchive){
    return {
        "dateLog" : new Date().toISOString(),
        "dateLastArchive" : dateLastArchive 
    };
}

function writeToLogFile(jsonInput){
    fs.appendFile(logFilePath, JSON.stringify(jsonInput)+"\n\r", function(err){
        if(err){
            console.log(err);
        }
    });
}

function writeLastDLArchiveFile(jsonInput){
    fs.writeFile(lastArchiveDLPath, JSON.stringify(jsonInput)+"\n\r", function(err){
        if(err){
            console.log(err);
        }
    });
}

exports.logGitRank = function logGitRank(logToStore){
    writeToLogFile(generateLogStructure(logToStore))
}

exports.logLastDLArchiveDate = function logLastDLArchiveDate(dateLastArchive){
    writeLastDLArchiveFile(generateLastDLStructure(dateLastArchive))
}
