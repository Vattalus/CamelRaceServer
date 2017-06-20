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

    if (tData == undefined || tData.Data == undefined || tData.Data.key == undefined)
        return null;

    var tDataJSON = JSON.parse(tData.Data.key);

    if (tDataJSON == undefined)
        return null;

    return tDataJSON;
}handlers.grantOasis = function (args, context) {

    //load the oasis balancing json from title data
    var oasisBalancingJSON = loadTitleDataJson(Balancing_Oasis);
    log.debug("Balancing Oasis: ", loadTitleDataJson(Balancing_Oasis));

    if (oasisBalancingJSON == null)
        log.error("oasis balancing null");

    if (oasisBalancingJSON == undefined)
        log.error("oasis balancing undefined");

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });

    //load the oasis balancing values from title data

    var tData = server.GetTitleData(
     {
         PlayFabId: currentPlayerId,
         Keys: ["DailyMissionData"]
     }
   );

    //var nextOasisTimestamp = new Date().timeStamp;

    ////if non-existant, create it
    //if (nextOasis.Data.nextOasis == undefined) {
    //    server.UpdateUserReadOnlyData(
    //        {
    //            PlayFabId: currentPlayerId,
    //            Data: { "nextOasis": nextOasisTimestamp }
    //        }
    //    );
    //} else {
    //    nextOasisTimestamp = nextOasis.Data.nextOasis;
    //}

    return { nextOasisTimestamp: nextOasis.Data.nextOasis };
}