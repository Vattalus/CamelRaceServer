//Breeds the player's camel of given index, with the breeding candidate of given index
//args.camelIndex
//args.candidateIndex
handlers.breedCamel = function (args, context) {
    //first of all, load the player's owned camels list
    var readonlyData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["OwnedCamels", "BreedingCandidates"]
    });

    //check existance of Camels object
    if ((readonlyData.Data.OwnedCamels == undefined || readonlyData.Data.OwnedCamels == null))
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var camelsJSON = JSON.parse(readonlyData.Data.OwnedCamels.Value);
    var selectedCamel = camelsJSON[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //check if number of owned camels has reached limit
    if (Number(camelsJSON.length) >= Number(loadTitleDataJson("MaxCamelSlots")))
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
        "BaseAcc": randomRange(selectedCamel.Acceleration, selectedCandidate.Acceleration) + statBonusFromLevel,
        "BaseSpeed": randomRange(selectedCamel.Speed, selectedCandidate.Speed) + statBonusFromLevel,
        "BaseGallop": randomRange(selectedCamel.Gallop, selectedCandidate.Gallop) + statBonusFromLevel,
        "BaseStamina": randomRange(selectedCamel.Stamina, selectedCandidate.Stamina) + statBonusFromLevel
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    //quality
    newCamelJson.Quality = Math.floor(Number(selectedCamel.Quality) + Number(selectedCandidate.Quality));

    //retire based on qlty
    switch (newCamelJson.Quality) {
        case 0:
            newCamelJson.Retire = 30;
            break;
        case 1:
            newCamelJson.Retire = 40;
            break;
        case 2:
            newCamelJson.Retire = 50;
            break;
        default:
            newCamelJson.Retire = 30;
            break;
    }

    //add wait time
    newCamelJson.BreedingCompletionTimestamp = getServerTime() + (Number(selectedCandidate.WaitTimeHours) * 3600);

    //add the newly created camel to the player's list of owned camels
    camelsJSON.push(newCamelJson);

    //mark the selected candidate as non-available
    selectedCandidate.Available = false;

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            "OwnedCamels": JSON.stringify(camelsJSON),
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
