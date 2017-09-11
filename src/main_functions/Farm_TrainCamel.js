//Trains the given stat
//
//Arguments
//args.camelIndex
//args.statType
handlers.startTraining = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
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
    var currentLevel = Number(selectedCamel[trainingLevelKey]);

    //Now, load the balancing information to find out if next level would exceed level limit
    var trainingBalancing = loadTitleDataJson("Balancing_Training");

    if (trainingBalancing == undefined || trainingBalancing == null)
        return generateErrObj("Training Balancing JSON undefined or null");

    //check if limit information is defined
    if (trainingBalancing.TrainingLimits == undefined || trainingBalancing.TrainingLimits == null)
        return generateErrObj("Training Limits not defined");

    var trainingLimit = Number(trainingBalancing.TrainingLimits[selectedCamel.Quality]);

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

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(trainingValues.CostSC, trainingValues.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford training");

    //increment stat trained level
    selectedCamel[trainingLevelKey] = currentLevel + Number(1);

    //grant stat gains
    selectedCamel[currentStatKey] = Number(selectedCamel[currentStatKey]) + Number(trainingValues.StatGain);

    //Set current training type and wait time
    selectedCamel.CurrentTrainingType = args.statType;
    selectedCamel.TrainingEnds = serverTime + Number(trainingValues.WaitTimeMins) * Number(60);

    //TODO increment camel value

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        VirtualCurrency: VirtualCurrencyObject
    }
}

//args.camelIndex
//args.qteOutcome index (0-perfect,4-Slow)
handlers.finishTraining = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + " not found.");

    //make sure the selected camel is eligible for finishing training
    if (selectedCamel.CurrentTrainingType == "none" || isNaN(Number(selectedCamel.TrainingEnds)) || Number(selectedCamel.TrainingEnds <= 0 || Number(selectedCamel.TrainingEnds > getServerTime()))) {
        return generateFailObj("Camel cannot finish training");
    }

    //camel eligible to finish training

    //Now, load the balancing information to find out how much extra stats does the camel receive
    var trainingBalancing = loadTitleDataJson("Balancing_Training");

    if (trainingBalancing == undefined || trainingBalancing == null)
        return generateErrObj("Training Balancing JSON undefined or null");

    //check if qte bonuses information is defined
    if (trainingBalancing.QteBonuses == undefined || trainingBalancing.QteBonuses == null)
        return generateErrObj("Training Qte bonuses not defined or corrupt");

    var statBonus = Number(0);
    if (trainingBalancing.QteBonuses.length > 0 && trainingBalancing.QteBonuses.length < Number(args.qteOutcome))
        statBonus = Number(trainingBalancing.QteBonuses[Number(args.qteOutcome)]);

    var currentStatKey = ""; // the key of the value that defines the current value of the given stat
    switch (args.statType) {
        case "Acceleration":
            currentStatKey = "CurrentAcc";
            break;

        case "Speed":
            currentStatKey = "CurrentSpeed";
            break;

        case "Gallop":
            currentStatKey = "CurrentGallop";
            break;

        case "Stamina":
            currentStatKey = "CurrentStamina";
            break;
    }

    //increment the stat by the value defined in the balancing
    selectedCamel.currentStatKey = Number(selectedCamel.currentStatKey) + statBonus;

    //reset the training timestamp
    selectedCamel.TrainingEnds = 0;

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });


    return {
        Result: "OK",
        BonusStat: Number(trainingBalancing.QteBonuses[args.qteOutcome])
    }
}