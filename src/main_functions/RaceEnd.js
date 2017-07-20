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
    var raceRewardJSON = loadTitleDataJson("RaceRewards_Quick");

    if (raceRewardJSON == undefined || raceRewardJSON == null)
        return generateErrObj("RaceRewards_Quick JSON undefined or null");

    //calculate and give rewards based on placement, start qte, finish speed
    var errorMessage = GiveRaceRewards(args, raceRewardJSON);

    //check for errors
    if (errorMessage != null)
        return generateErrObj(errorMessage);

    var userInventoryObject = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var VirtualCurrencyObject = userInventoryObject.VirtualCurrency;

    //return new inventory
    return {
        VirtualCurrency: VirtualCurrencyObject
    }
}

function GiveRaceRewards(args, raceRewardJSON) {

    var scReward = Number(0);
    var hcReward = Number(0);
    var tkReward = Number(0);


    if (placementRwrd_SC != undefined && placementRwrd_SC != null) {
        //there a reward defined for this placement
        scReward += raceRewardJSON.Placement_SC[args.finishPosition];
    };

    //SC from start qte
    scReward += Number(raceRewardJSON.MaxStartBonus);

    //SC from finish speed
    scReward += Number(raceRewardJSON.MaxFinishBonus);

    log.debug("sc reward: ", scReward);

    return placementRwrd_SC;

    return null;
}
