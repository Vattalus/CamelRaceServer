handlers.grantOasis = function (args, context) {

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });

    log.debug("nextOasis undefined:", nextOasis==undefined);
    log.debug("nextOasis.Data undefined:", nextOasis.Data == undefined);
    log.debug("nextOasis.Data.nextOasis undefined:", nextOasis.Data.nextOasis == undefined);

    //if non-existant, create it
    if (nextOasis.Data == undefined || nextOasis.Data.nextOasis == undefined)

    return { nextOasisTimestamp: nextOasis };
}