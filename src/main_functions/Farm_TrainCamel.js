//Trains the given stat
//
//Arguments
//args.camelIndex
//args.statType
handlers.trainCamel = function (args, context) {

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

    //check if any camel is currently training
    var serverTime = getServerTime();

    for (var i = 0; i < camelsJSON.OwnedCamelsList.length; i++) {
        if (Number(camelsJSON.OwnedCamelsList[i].TrainingEnds) > serverTime)
            return generateFailObj("A camel is already training");
    }

    //the training level for the given stat
    var trainingLevelKey = "";
    var currentStatKey = ""; // the key of the value that defines the current value of the given stat
    switch (args.statType) {
        case "Acceleration":
            trainingLevelKey = "AccTrained";
            currentStatKey = "CurrentAcc";
            break;

        case "Speed":
            trainingLevelKey = "SpeedTrained";
            currentStatKey = "CurrentSpeed";
            break;

        case "Gallop":
            trainingLevelKey = "GallopTrained";
            currentStatKey = "CurrentGallop";
            break;

        case "Stamina":
            trainingLevelKey = "StaminaTrained";
            currentStatKey = "CurrentStamina";
            break;
    }
    var currentLevel = Number(camelObject[trainingLevelKey]);

    //Now, load the balancing information to find out if next level would exceed level limit
    var trainingBalancing = loadTitleDataJson("Balancing_Training");

    if (trainingBalancing == undefined || trainingBalancing == null)
        return generateErrObj("Training Balancing JSON undefined or null");

    //check if limit information is defined
    if (trainingBalancing.TrainingLimits == undefined || trainingBalancing.TrainingLimits == null)
        return generateErrObj("Training Limits not defined");

    var trainingLimit = Number(trainingBalancing.TrainingLimits[camelObject.Quality]);

    if (trainingLimit == undefined || trainingLimit == null)
        return generateErrObj("Training limit for this quality not defined");

    if (currentLevel >= trainingLimit)
        return generateFailObj("Stat Training at max lvl");

    //if we got this far, the camel is not at max training level yet

    //check if training values are set for given stat, at current level
    if (trainingBalancing.TrainingStages == undefined || trainingBalancing.TrainingStages == null ||
        trainingBalancing.TrainingStages[currentLevel] == undefined || trainingBalancing.TrainingStages[currentLevel] == null)
        return generateErrObj("Training values not found");

    var trainingValues = trainingBalancing.TrainingStages[currentLevel];

    //Now, load player's virtual currency, to check if they can afford the training
    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    if (trainingValues.CostSC > VirtualCurrencyObject.SC || trainingValues.CostHC > VirtualCurrencyObject.HC)
        return generateFailObj("Can't afford training");

    //subtract currency
    if (Number(trainingValues.CostSC) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "SC", "Amount": trainingValues.CostSC });
        VirtualCurrencyObject.SC -= trainingValues.CostSC;
    }

    if (Number(trainingValues.CostHC) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "HC", "Amount": trainingValues.CostHC });
        VirtualCurrencyObject.HC -= trainingValues.CostHC;
    }

    //increment stat trained level
    camelObject[trainingLevelKey] = currentLevel + Number(1);

    //grant stat gains
    camelObject[currentStatKey] = Number(camelObject[currentStatKey]) + Number(trainingValues.StatGain);

    //Set current training type and wait time
    camelObject.CurrentTrainingType = args.statType;
    camelObject.TrainingEnds = serverTime + Number(trainingValues.WaitTimeMins) * Number(60);

    //TODO increment camel value

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
