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
    if (camelsJSON.OwnedCamelsList.count >= Number(loadTitleDataJson("MaxCamelSlots")))
        return generateFailObj("Number of owned camels reached max limit");

    //Now, find the breeding candidate of index [candidateIndex]

    //check if loaded data is valid
    if (readonlyData.Data.BreedingCandidates == undefined || readonlyData.Data.BreedingCandidates == null)
        return generateErrObj("Player's breeding candidates not found");

    var breedingCandidatesData = JSON.parse(readonlyData.Data.BreedingCandidates.Value);

    //make sure candidate of index [candidateIndex] exists
    if (breedingCandidatesData == undefined || breedingCandidatesData == null ||
        breedingCandidatesData.CandidateList == undefined || breedingCandidatesData.CandidateList == null ||
        breedingCandidatesData.CandidateList.count <= Number(args.candidateIndex) ||
        breedingCandidatesData.CandidateList[Number(args.candidateIndex)] == undefined ||
        breedingCandidatesData.CandidateList[Number(args.candidateIndex)] == null)
        return generateErrObj("Breeding candidate of index" + args.candidateIndex + " not found");

    var selectedCandidate = breedingCandidatesData.CandidateList[Number(args.candidateIndex)];

    //check if selected candidate is available
    if (selectedCandidate.Available.toLowerCase == "false")
        return generateFailObj("Selected cnadidate is not available");

    //Now, load player's virtuar currency, to check if they can afford the breeding
    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    if (selectedCandidate.CostSC > VirtualCurrencyObject.SC || selectedCandidate.CostHC > VirtualCurrencyObject.HC)
        return generateFailObj("Can't afford breeding");

    //so far everything is ok, let's create a new camel json object and populate it based on selected camel and selected candidate
    var newCamelParams = {
        "baseAcc": randomRange(camelObject.CurrentAcc, breedingCandidatesObj.Acceleration),
        "baseSpeed": randomRange(camelObject.CurrentSpeed, breedingCandidatesObj.Speed),
        "baseGallop": randomRange(camelObject.CurrentGallop, breedingCandidatesObj.Gallop),
        "baseStamina": randomRange(camelObject.CurrentStamina, breedingCandidatesObj.Stamina)
    }
    var newCamelJson = createEmptyCamelProfile(newCamelParams);

    //TODO set quality

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
            "Camels": JSON.stringify(camelsJSON),
            "BreedingCandidates": JSON.stringify(breedingCandidatesData)
        }
    });

    //subtract currency
    if (Number(selectedCandidate.CostSC) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "SC", "Amount": selectedCandidate.CostSC });
        VirtualCurrencyObject.SC -= selectedCandidate.CostSC;
    }

    if (Number(selectedCandidate.CostHC) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "HC", "Amount": selectedCandidate.CostHC });
        VirtualCurrencyObject.HC -= selectedCandidate.CostHC;
    }

    //return the profile data of the newly created camel, and the new currency balance
    return {
        Result: "OK",
        NewCamelProfile: newCamelJson,
        VirtualCurrency: VirtualCurrencyObject
    }
}
