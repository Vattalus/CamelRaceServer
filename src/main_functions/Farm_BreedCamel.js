//Breeds the player's camel of given index, with the breeding candidate of given index
//args.camelIndex
//args.candidateIndex
handlers.breedCamel = function (args, context) {
    //first of all, load the player's owned camels list
    var readonlyData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels", "BreedingCandidates"]
    });

    //check existance of Camels object
    if ((readonlyData.Data.Camels == undefined || readonlyData.Data.Camels == null))
        return generateErrObj("Player's 'Camels' object was not found");

    var camelsJSON = JSON.parse(readonlyData.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (camelObject == undefined || camelObject == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //check if number of owned camels has reached limit
    if (Number(camelsJSON.OwnedCamelsList.length) >= Number(loadTitleDataJson("MaxCamelSlots")))
        return generateFailObj("Number of owned camels reached max limit");

    //Now, find the breeding candidate of index [candidateIndex]

    //check if loaded data is valid
    if (readonlyData.Data.BreedingCandidates == undefined || readonlyData.Data.BreedingCandidates == null)
        return generateErrObj("Player's breeding candidates not found");

    var breedingCandidatesData = JSON.parse(readonlyData.Data.BreedingCandidates.Value);

    //make sure candidate of index [candidateIndex] exists
    if (breedingCandidatesData == undefined || breedingCandidatesData == null ||
        breedingCandidatesData.CandidateList == undefined || breedingCandidatesData.CandidateList == null ||
        breedingCandidatesData.CandidateList.length <= Number(args.candidateIndex) ||
        breedingCandidatesData.CandidateList[Number(args.candidateIndex)] == undefined ||
        breedingCandidatesData.CandidateList[Number(args.candidateIndex)] == null)
        return generateErrObj("Breeding candidate of index" + args.candidateIndex + " not found");

    var selectedCandidate = breedingCandidatesData.CandidateList[Number(args.candidateIndex)];

    //check if selected candidate is available
    if (selectedCandidate.Available == false)
        return generateFailObj("Selected candidate is not available");

    //Now, pay the virtual currency cost
    var VirtualCurrencyObject = payCurrency(selectedCandidate.CostSC, selectedCandidate.CostHC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford breeding");

    //determine level bonus to stat
    var statBonusFromLevel = Number(0);

    if (newLevelProgress != null && newLevelProgress.Level != undefined && newLevelProgress.Level != null) {
        statBonusFromLevel = Number(newLevelProgress.Level);
    }

    //so far everything is ok, let's create a new camel json object and populate it based on selected camel and selected candidate
    var newCamelParams = {
        "BaseAcc": randomRange(camelObject.CurrentAcc, selectedCandidate.Acceleration) + statBonusFromLevel,
        "BaseSpeed": randomRange(camelObject.CurrentSpeed, selectedCandidate.Speed) + statBonusFromLevel,
        "BaseGallop": randomRange(camelObject.CurrentGallop, selectedCandidate.Gallop) + statBonusFromLevel,
        "BaseStamina": randomRange(camelObject.CurrentStamina, selectedCandidate.Stamina) + statBonusFromLevel
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    //determine quality
    newCamelJson.Quality = Math.floor(Number(camelObject.Quality) + Number(selectedCandidate.Quality));

    //add wait time
    newCamelJson.BreedingCompletionTimestamp = getServerTime() + (Number(selectedCandidate.WaitTimeHours) * 3600);

    //add the newly created camel to the player's list of owned camels
    camelsJSON.OwnedCamelsList.push(newCamelJson);

    //mark the selected candidate as non-available
    selectedCandidate.Available = false;

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            "Camels": JSON.stringify(camelsJSON),
            "BreedingCandidates": JSON.stringify(breedingCandidatesData)
        }
    });

    //add xp
    var newLevelProgress = null;
    var breedingBalancing = loadTitleDataJson("Balancing_Breeding");
    if (breedingBalancing != undefined && breedingBalancing != null && breedingBalancing.ExpGain != undefined && breedingBalancing.ExpGain != null && breedingBalancing.ExpGain.length > newCamelJson.Quality) {
        newLevelProgress = addExperience(Number(breedingBalancing.ExpGain[newCamelJson.Quality]));
    }

    //return the profile data of the newly created camel, and the new currency balance
    return {
        Result: "OK",
        NewCamelProfile: newCamelJson,
        VirtualCurrency: VirtualCurrencyObject,
        LevelProgress: newLevelProgress //Add XP
    }
}
