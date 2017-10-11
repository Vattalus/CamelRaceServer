//Trains the given stat
//
//Arguments
//args.camelIndex
//args.statType
handlers.startTraining = function (args, context) {

    //first of all, load the player's owned camels list
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    var serverTime = getServerTime();

    //check if camel is 'fully grown'
    if (Number(selectedCamel.BreedingCompletionTimestamp) > serverTime)
        return generateFailObj("Selected camel is not fully grown yet");

    //check if any camel is currently training
    for (var i = 0; i < ownedCamels.length; i++) {
        if (Number(ownedCamels[i].TrainingEnds) > 0)
            return generateFailObj("A camel is already training");
    }

    //make sure there is another available camel left after this one starts training
    var nrOfAvailableCamels = getNumberOfAvailableCamels(ownedCamels);

    if (nrOfAvailableCamels == undefined || nrOfAvailableCamels == null || isNaN(Number(nrOfAvailableCamels)) || Number(nrOfAvailableCamels) <= 1)
        return generateFailObj("Cannot train last available camel");

    //the training level for the given stat
    var currentLevel = Number(selectedCamel.TrainingLevels[args.statType]);

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
    selectedCamel.TrainingLevels[args.statType] = currentLevel + Number(1);

    //grant stat gains
    selectedCamel[args.statType] = Number(selectedCamel[args.statType]) + Number(trainingValues.StatGain);

    //Set current training type and wait time
    selectedCamel.CurrentlyTrainingStat = args.statType;
    selectedCamel.TrainingEnds = serverTime + Number(trainingValues.WaitTimeMins) * Number(60);

    //TODO increment camel value

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
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
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + " not found.");

    //make sure the selected camel is eligible for finishing training
    if (selectedCamel.CurrentlyTrainingStat == "none" || isNaN(Number(selectedCamel.TrainingEnds)) || Number(selectedCamel.TrainingEnds <= 0 || Number(selectedCamel.TrainingEnds > getServerTime()))) {
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
    if (trainingBalancing.QteBonuses.length > 0 && trainingBalancing.QteBonuses.length > Number(args.qteOutcome))
        statBonus = Number(trainingBalancing.QteBonuses[Number(args.qteOutcome)]);

    //increment the stat by the value defined in the balancing
    selectedCamel[selectedCamel.CurrentlyTrainingStat] = Number(selectedCamel[selectedCamel.CurrentlyTrainingStat]) + statBonus;

    //reset the training timestamp
    selectedCamel.TrainingEnds = 0;
    selectedCamel.CurrentlyTrainingStat = "none";

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
    });

    return {
        Result: "OK",
        BonusStat: statBonus,
        CamelData: selectedCamel
    }
}