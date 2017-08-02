//Returns the list of breeding candidates. If they are expired, it generates a new list of candidates
handlers.getBreedingCandidates = function (args, context) {

    //First, load the player's list of candidates and check if they are still valid
    var breedingCandidatesObj = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["BreedingCandidates"]
    });

    //Json data of the breeding candidates object
    var breedingCandidatesJSON = JSON.parse("");

    log.debug(
    {
        "Undefined: ": breedingCandidatesJSON == undefined,
        "Null: ": breedingCandidatesJSON == null
    })

    //if (breedingCandidatesObj == undefined || breedingCandidatesObj == null)
}

function GenerateBreedingCandidates(args) {

}
