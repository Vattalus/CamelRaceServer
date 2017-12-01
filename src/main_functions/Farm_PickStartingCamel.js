//Adds the first camel to the player's list of owned camels
//
//Arguments
//args.camelName - name of the camel
//args.BaseAcc
//args.BaseSpeed
//args.BaseGallop
//args.BaseStamina
handlers.pickStartingCamel = function (args, context) {
    //first of all, we need to make sure that the player does not already own a camel (starting camel can only be picked once)
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == null)
        ownedCamels = [];

    //if the player already owns at least one camel, they cannot pick a starting camel again. So, return a fail object
    if (ownedCamels != undefined && ownedCamels.length > 0 && (ownedCamels[0].name != undefined || ownedCamels[0].name != null))
        return generateFailObj("Player already owns a camel");

    //so far, everything seems to be ok

    var BaseAcc = Number(0);
    if (args.BaseAcc != undefined && args.BaseAcc != null && !isNaN(Number(args.BaseAcc)))
        BaseAcc = args.BaseAcc;

    var BaseSpeed = Number(0);
    if (args.BaseSpeed != undefined && args.BaseSpeed != null && !isNaN(Number(args.BaseSpeed)))
        BaseSpeed = args.BaseSpeed;

    var BaseGallop = Number(0);
    if (args.BaseGallop != undefined && args.BaseGallop != null && !isNaN(Number(args.BaseGallop)))
        BaseGallop = args.BaseGallop;

    var BaseStamina = Number(0);
    if (args.BaseStamina != undefined && args.BaseStamina != null && !isNaN(Number(args.BaseStamina)))
        BaseStamina = args.BaseStamina;

    //create the new camel object, and add it to the list of owned camels
    var newCamelParams = {
        "BaseAcc": BaseAcc,
        "BaseSpeed": BaseSpeed,
        "BaseGallop": BaseGallop,
        "BaseStamina": BaseStamina
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    ownedCamels = new Array();
    ownedCamels.push(newCamelJson);

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
    });

    return {
        Result: "OK",
        CamelProfile: newCamelJson
    }
}
