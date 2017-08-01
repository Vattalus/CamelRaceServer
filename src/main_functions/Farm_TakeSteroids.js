//Upgrades the given item on a camel
//
//Arguments
//args.camelIndex
handlers.takeSteroids = function (args, context) {

    //first of all, load the player's owned camels list
    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //check existance of Camels object
    if ((camels.Data.Camels == undefined || camels.Data.Camels == null))
        return generateErrObj("Player's 'Camels' object was not found");

    var camelsJSON = JSON.parse(camels.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (camelObject == undefined || camelObject == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    if (Number(camelObject.SteroidsLeft) > Number(0))
        return generateFailObj("Camel already steroids left");

    //load the steroids balancing values from title data
    var steroidsBalancing = loadTitleDataJson("Balancing_Steroids");

    if (steroidsBalancing == undefined || steroidsBalancing == null)
        return generateErrObj("Steroids Balancing JSON undefined or null");

    //Now, load player's virtual currency, to check if they can afford the training
    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    if (steroidsBalancing.CostSC > VirtualCurrencyObject.SC || steroidsBalancing.CostHC > VirtualCurrencyObject.HC)
        return generateFailObj("Can't afford training");

    //subtract currency
    if (Number(steroidsBalancing.CostSC) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "SC", "Amount": steroidsBalancing.CostSC });
        VirtualCurrencyObject.SC -= steroidsBalancing.CostSC;
    }

    if (Number(steroidsBalancing.CostHC) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "HC", "Amount": steroidsBalancing.CostHC });
        VirtualCurrencyObject.HC -= steroidsBalancing.CostHC;
    }

    //set steroids charges left
    camelObject.SteroidsLeft = steroidsBalancing.EffectDuration;

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: VirtualCurrencyObject
    }
}
