handlers.raceEnd = function (args, context) {

    if (args != null && args.endRaceReward && Number(args.endRaceReward)) {
        addCurrency("SC", Number(args.endRaceReward));
    }

    return { Result: "OK" };
}

//Arguments
//arg.finishPosition - placement of player (0- first, 1-seconds etc)
//arg.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//arg.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
handlers.endRace_quick = function (args, context) {

    //first we load the race reward parameters for the quick race.
    var raceRewardJSON = JSON.parse(loadTitleDataJson("RaceRewards_Quick"));

    if (raceRewardJSON == undefined || raceRewardJSON == null)
        return generateErrObj("RaceRewards_Quick JSON undefined or null");

    //calculate and give rewards based on placement, start qte, finish speed
    var errorMessage = GiveRaceRewards(args, raceRewardJSON);

    //check for errors
    if (errorMessage != null)
        return generateErrObj(errorMessage);

    var VirtualCurrencyObject = userInventoryObject.VirtualCurrency;

    //return new inventory
    return {
        VirtualCurrency: VirtualCurrencyObject
    }
}

function GiveRaceRewards(args, raceRewardJSON) {

    var placementRwrd_SC = raceRewardJSON.Placement_SC[args.finishPosition] != undefined;

    if (placementRwrd_SC == undefined || placementRwrd_SC == null) {
        //there is no reward defined for this placement
        log.debug("debug:", { "Undefined": placementRwrd_SC == undefined, "Null": placementRwrd_SC == null });
    };

    return placementRwrd_SC;

    return null;
}

