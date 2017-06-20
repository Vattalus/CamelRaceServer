handlers.grantOasis = function (args, context) {

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });

    //default value for oasis wait time
    var hoursTillNextOasis = 12;

    //load the oasis balancing values from title data
    var tDataBalancing_Oasis = server.GetTitleData(
     {
         PlayFabId: currentPlayerId,
         Keys: ["Balancing_Oasis"]
     }
   );

    log.debug("balancing oasis: ", tDataBalancing_Oasis.Data.Balancing_Oasis);

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