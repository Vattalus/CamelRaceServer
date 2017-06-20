handlers.grantOasis = function (args, context) {

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });

    log.debug("nextOasis:", nextOasis);
    log.debug("nextOasis.Data:", nextOasis.Data);
    log.debug("nextOasis.Data.nextOasis": nextOasis.Data.nextOasis);

    //if non-existant, create it
    //if (nextOasis == undefined || nextOasis.Data.nextOasis == undefined)

    return { nextOasisTimestamp: nextOasis };
}