handlers.grantOasis = function (args, context) {

    //load the oasis balancing json from title data
    var oasisBalancingJSON = loadTitleDataJson("Balancing_Oasis");
    log.debug("Balancing Oasis: ", oasisBalancingJSON);

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