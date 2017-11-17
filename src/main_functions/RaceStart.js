//Arguments
//args.camelIndex
//args.raceType
handlers.startRace = function (args, context) {

    //first of all, load the player's owned camels list
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //TODO increment stats (races started, decrement steroids etc)


    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
    });

    //for tournaments, make sure the player has at least one ticket
    if (args.raceType == "Tournament") {

        var VirtualCurrencyObject = payCurrency(0, 0, 1);

        if (VirtualCurrencyObject == null)
            return generateFailObj("Can't afford customization");

        //TODO return opponent data
    }

    return {
        Result: "OK"
        //CamelData: camelObject
    }
}