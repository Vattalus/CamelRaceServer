//Sells the camel with the given index, and returns the new currency balance
//Arguments
//args.camelIndex
handlers.retireCamel = function (args, context) {
    //first of all, load the player's owned camels list
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //check if there is another available camel left after retirement
    //if (Number(ownedCamels.length) <= Number(1))
    //    return generateFailObj("Last camel");

    //var nrOfAvailableCamels = getNumberOfAvailableCamels(ownedCamels);

    //if (nrOfAvailableCamels == undefined || nrOfAvailableCamels == null || isNaN(Number(nrOfAvailableCamels)) || Number(nrOfAvailableCamels) <= 1)
    //    return generateFailObj("No available camel");

    //calculate rewards
    var scReward = 30;

    switch (selectedCamel.Quality) {
        case 0:
            scReward = 30;
            break;
        case 1:
            scReward = 40;
            break;
        case 2:
            scReward = 50;
            break;
    }

    //increment virtual currency
    addCurrency("SC", scReward);

    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    ownedCamels.splice(args.camelIndex, 1);

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
    });

    //return camels data new inventory
    return {
        Result: "OK",
        "OwnedCamels": JSON.stringify(ownedCamels),
        VirtualCurrency: VirtualCurrencyObject
    }
}
