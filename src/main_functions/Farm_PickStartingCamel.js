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
    var camelsJSON = JSON.parse("[]");

    if ((camels.Data.Camels != undefined && camels.Data.Camels != null))
        camelsJSON = JSON.parse(camels.Data.Camels.Value);

    //if the player already owns at least one camel, they cannot pick a starting camel again. So, return a fail object
    if (camelsJSON.length > 0 && (camelsJSON[0].name != undefined || camelsJSON[0].name != null))
        return generateFailObj("Player already owns a camel");

    //so far, everything seems to be ok

    camelsJSON = new Array();
    camelsJSON.push({
        "name": "CamelName",
        "baseAcc": 5,
        "baseSpeed": 8,
        "baseGallop": 3,
        "baseStamina": 2
    });

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON), "SelectedCamel": 0 }
    });
}
