//Returns the list of breeding candidates. If they are expired, it generates a new list of candidates
handlers.getBreedingCandidates = function (args, context) {

    //First, load the player's list of candidates and check if they are still valid
    var breedingCandidatesObj = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["BreedingCandidates"]
    });

    //Json data of the breeding candidates object
    var breedingCandidatesJSON = {};

    if (breedingCandidatesObj.Data.BreedingCandidates != undefined && breedingCandidatesObj.Data.BreedingCandidates != null)
        breedingCandidatesJSON = JSON.parse(breedingCandidatesObj.Data.BreedingCandidates.Value);

    //if json parsing failed, OR json does not contain expiration timestamp OR expiration timestamp has passed, generate a new breedingCandidatesJSON
    if (breedingCandidatesJSON == undefined || breedingCandidatesJSON == null ||
        breedingCandidatesJSON.ExpirationTimestamp == undefined || breedingCandidatesJSON.ExpirationTimestamp == null ||
        Number(breedingCandidatesJSON.ExpirationTimestamp) >= getServerTime()) {
        //Generate new Breeding Candidates
        breedingCandidatesJSON = GenerateBreedingCandidates();
    }

    if (breedingCandidatesJSON == undefined || breedingCandidatesJSON == null)
        return generateErrObj("Something went wrong");

    return {
        Result: "OK",
        BreedingCandidatesData: breedingCandidatesJSON
    }
}

//generates a new list of breeding camel candidates, based on balancing values found in title data.
//returns null, if something went wrong
function GenerateBreedingCandidates() {

    //Load the balancing values from title data
    var breedingCandidatesBalancing = loadTitleDataJson("Balancing_Breeding");

    if (breedingCandidatesBalancing == undefined || breedingCandidatesBalancing == null)
        return null;

    //Check Validity
    if (breedingCandidatesBalancing.CandidatesResetTimeHours == undefined || breedingCandidatesBalancing.CandidatesResetTimeHours == null ||
        breedingCandidatesBalancing.BreedingCandidates == undefined || breedingCandidatesBalancing.BreedingCandidates == null ||
        breedingCandidatesBalancing.BreedingCandidates.length == 0) {
        return null;
    }

    //Create a new object to store the player's breeding candidates
    var breedingCandidatesJSON = {};

    //Add expiration timestamp
    breedingCandidatesJSON.ExpirationTimestamp = getServerTime() + (Number(breedingCandidatesBalancing.CandidatesResetTimeHours) * Number(3600));

    //Create candidate list
    breedingCandidatesJSON.CandidateList = [];
    for (var i = 0; i < breedingCandidatesBalancing.BreedingCandidates.length; i++) {
        var newBreedingCandidate = {};

        newBreedingCandidate.Available = true;
        newBreedingCandidate.Quality = breedingCandidatesBalancing.BreedingCandidates[i].Quality;
        newBreedingCandidate.CostSC = breedingCandidatesBalancing.BreedingCandidates[i].CostSC;
        newBreedingCandidate.CostHC = breedingCandidatesBalancing.BreedingCandidates[i].CostHC;

        //distribute stats
        var acceleration = Number(0);
        var speed = Number(0);
        var gallop = Number(0);
        var stamina = Number(0);

        var statsToDistribute = Number(breedingCandidatesBalancing.BreedingCandidates[i].TotalStats);

        for (var j = 0; j < statsToDistribute; j++) {
            var randomDistribution = Math.random() * Number(4);

            if (randomDistribution < Number(1)) {
                //Acceleration
                acceleration++;
            } else {
                if (randomDistribution < Number(2)) {
                    //Speed
                    speed++;
                } else {
                    if (randomDistribution < Number(3)) {
                        //Gallop
                        gallop++;
                    } else {
                        //Stamina
                        stamina++;
                    }
                }
            }
        }

        //set stats
        newBreedingCandidate.Acceleration = acceleration;
        newBreedingCandidate.Speed = speed;
        newBreedingCandidate.Gallop = gallop;
        newBreedingCandidate.Stamina = stamina;

        //set wait time
        newBreedingCandidate.WaitTimeHours = breedingCandidatesBalancing.BreedingCandidates[i].WaitTimeHours;

        //Add newly created candidate to list
        breedingCandidatesJSON.CandidateList.push(newBreedingCandidate);
    }

    //save the breeding candidate information to player's read-only data
    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "BreedingCandidates": JSON.stringify(breedingCandidatesJSON) }
        }
    );

    //return the newly created breeding candidate data
    return breedingCandidatesJSON;
}
