//Upgrades the given item on a camel
//
//Arguments
//args.camelIndex
handlers.takeSteroids = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    if (Number(selectedCamel.SteroidsLeft) > Number(0))
        return generateFailObj("Camel already on steroids");

    //load the steroids balancing values from title data
    var steroidsBalancing = loadTitleDataJson("Balancing_Steroids");

    if (steroidsBalancing == undefined || steroidsBalancing == null)
        return generateErrObj("Steroids Balancing JSON undefined or null");

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(steroidsBalancing.CostSC, steroidsBalancing.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford steroids");

    //set steroids charges left
    selectedCamel.SteroidsLeft = steroidsBalancing.EffectDuration;

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsData) }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        VirtualCurrency: VirtualCurrencyObject
    }
}
