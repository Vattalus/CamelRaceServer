function generateFailObj(mess) {
    var retObj = {
        Result: "Failed",
        Message: mess
    };
    return retObj;
}

function generateErrObj(mess) {
    var retObj = {
        Result: "Error",
        Message: mess
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

    log.debug("tData key: ", tData.Data[key]);

    if (tData == undefined || tData.Data == undefined || tData.Data[key] == undefined)
        return null;

    var tDataJSON = JSON.parse(tData.Data.key);

    log.debug("tData JSON value: ", tDataJSON);

    if (tDataJSON == undefined)
        return null;

    return tDataJSON;
}