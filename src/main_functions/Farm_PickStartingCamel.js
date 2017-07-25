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

    if (camels.Data.Camels == undefined || camels.Data.Camels == null || camels.Data.Camels.length == undefined || camels.Data.Camels.length == null || camels.Data.Camels.length == 0) {
        log.debug("is all good");
    }

    log.debug({
        "undefined ": camels.Data.Camels == undefined,
        "null ": camels.Data.Camels == null,
        "length ": camels.Data.Camels.length,
        "lenght undefined:": camels.Data.Camels.length == undefined,
        "lenght null:": camels.Data.Camels.length == null,
    });

}
