handlers.grantOasis = function (args, context) {

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });


    return { nextOasisTimestamp: nextOasis };
}