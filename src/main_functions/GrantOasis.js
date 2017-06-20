handlers.grantOasis = function (args, context) {

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });

    var nextOasisTimestamp = new Date();

    //if non-existant, create it
    if (nextOasis.Data.nextOasis == undefined) {
        server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { "nextOasis": nextOasisTimestamp }
            }
        );
    } else {
        nextOasisTimestamp = nextOasis.Data.nextOasis;
    }

    return { nextOasisTimestamp: nextOasis };
}