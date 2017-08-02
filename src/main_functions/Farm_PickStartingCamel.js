//Adds the first camel to the player's list of owned camels
//
//Arguments
//args.camelName - name of the camel
//args.baseAcc
//args.baseSpeed
//args.baseGallop
//args.baseStamina
handlers.pickStartingCamel = function (args, context) {
    //first of all, we need to make sure that the player does not already own a camel (starting camel can only be picked once)
    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //Json data of the Camels list
    var camelsJSON = JSON.parse("{}");

    if ((camels.Data.Camels != undefined && camels.Data.Camels != null))
        camelsJSON = JSON.parse(camels.Data.Camels.Value);

    //if the player already owns at least one camel, they cannot pick a starting camel again. So, return a fail object
    if (camelsJSON.OwnedCamelsList != undefined
        && camelsJSON.OwnedCamelsList != null
        && camelsJSON.OwnedCamelsList.length > 0
        && (camelsJSON.OwnedCamelsList[0].name != undefined || camelsJSON[0].OwnedCamelsList.name != null))
        return generateFailObj("Player already owns a camel");

    //so far, everything seems to be ok

    //set selected camel to 0
    camelsJSON.SelectedCamel = 0;

    var baseAcc = Number(0);
    if (args.baseAcc != undefined && args.baseAcc != null && !isNaN(Number(args.baseAcc)))
        baseAcc = args.baseAcc;

    var baseSpeed = Number(0);
    if (args.baseSpeed != undefined && args.baseSpeed != null && !isNaN(Number(args.baseSpeed)))
        baseSpeed = args.baseSpeed;

    var baseGallop = Number(0);
    if (args.baseGallop != undefined && args.baseGallop != null && !isNaN(Number(args.baseGallop)))
        baseGallop = args.baseGallop;

    var baseStamina = Number(0);
    if (args.baseStamina != undefined && args.baseStamina != null && !isNaN(Number(args.baseStamina)))
        baseStamina = args.baseStamina;

    //create the new camel object, and add it to the list of owned camels
    var newCamelParams = {
        "baseAcc": baseAcc,
        "baseSpeed": baseSpeed,
        "baseGallop": baseGallop,
        "baseStamina": baseStamina
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    //base stats
    newCamelJson.BaseAcc = baseAcc;
    newCamelJson.BaseSpeed = baseSpeed;
    newCamelJson.BaseGallop = baseGallop;
    newCamelJson.BaseStamina = baseStamina;

    //current stats (with training and upgrade bonuses)
    newCamelJson.CurrentAcc = baseAcc;
    newCamelJson.CurrentSpeed = baseSpeed;
    newCamelJson.CurrentGallop = baseGallop;
    newCamelJson.CurrentStamina = baseStamina;

    camelsJSON.OwnedCamelsList = new Array();
    camelsJSON.OwnedCamelsList.push(newCamelJson);

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return {
        Result: "OK",
        CamelProfile: newCamelJson
    }
}
