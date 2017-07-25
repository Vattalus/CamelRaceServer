//Adds the first camel to the player's list of owned camels
//
//Arguments
//arg.finishPosition - placement of player (0- first, 1-seconds etc)
//arg.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//arg.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
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
        var camelsJSON = JSON.parse(camels.Data.Camels.Value);

    //if the player already owns at least one camel, they cannot pick a starting camel again. So, return a fail object
    if (camelsJSON.length > 0 && (camelsJSON[0].name != undefined || camelsJSON[0].name != null))
        return generateFailObj("Player already owns a camel");
}
