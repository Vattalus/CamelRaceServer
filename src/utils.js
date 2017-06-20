function generateFailObj(mess, data) {
    var retObj = {
        Result: "Failed",
        Message: mess,
        Data: data
    };
    return retObj;
}

function generateErrObj(mess, data) {
    var retObj = {
        Result: "Error",
        Message: mess,
        Data: data
    };
    return retObj;
}

function loadTitleDataJson(key) {
    var tData = server.GetTitleData(
    {
        PlayFabId: currentPlayerId,
        Keys: [key]
    }
    );

    if (tData == undefined || tData.Data == undefined || tData.Data[key] == undefined)
        return null;

    var tDataJSON = JSON.parse(tData.Data[key]);

    if (tDataJSON == undefined)
        return null;

    return tDataJSON;
}

function randomRange(min, max) {
    return Math.round(Math.random() * (max-min)) + min;
}