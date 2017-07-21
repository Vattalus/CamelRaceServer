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

//Arguments
//arg.seriesIndex - index of the series
//arg.eventIndex - index of the event
//arg.finishPosition - placement of player (0- first, 1-seconds etc)
//arg.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//arg.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
handlers.endRace_event = function (args, context) {

    //first we load the race reward parameters from the title data
    var eventRewardsJSON = loadTitleDataJson("RaceRewards_Events");

    if (eventRewardsJSON == undefined || eventRewardsJSON == null)
        return generateErrObj("RaceRewards_Events JSON undefined or null");

    //cache the season json
    var seriesJSON = eventRewardsJSON[args.seriesIndex];

    //check the series index exists
    if (seriesJSON == undefined || seriesJSON == null)
        return generateErrObj("Series with index: " + args.seriesIndex + " not found");

    //check if the list of events exists
    if (seriesJSON.EventsList == undefined || seriesJSON.EventsList == null)
        return generateErrObj("List of events not found for series with index: " + args.seriesIndex);

    log.debug("1st place SC reward: ", seriesJSON.EventsList[args.eventIndex]);

    //now, check if the event with given index exists

}

function GiveRaceRewards(args, raceRewardJSON) {

    var scReward = Number(0);
    var hcReward = Number(0);
    var tkReward = Number(0);

    //check if JSON is valid
    if (raceRewardJSON.Placement_SC == undefined || raceRewardJSON.Placement_HC == undefined || raceRewardJSON.Placement_TK == undefined)
        return "race rewards JSON is not valid";

    //Placement SC
    var placementRwrd_SC = raceRewardJSON.Placement_SC[args.finishPosition];
    if (placementRwrd_SC != undefined && placementRwrd_SC != null && !isNaN(Number(placementRwrd_SC))) {
        //there a reward defined for this placement
        scReward += Number(placementRwrd_SC);
    };

    //Placement HC
    var placementRwrd_HC = raceRewardJSON.Placement_HC[args.finishPosition];
    if (placementRwrd_HC != undefined && placementRwrd_HC != null && !isNaN(Number(placementRwrd_HC))) {
        //there a reward defined for this placement
        hcReward += Number(placementRwrd_HC);
    };

    //Placement TK
    var placementRwrd_TK = raceRewardJSON.Placement_TK[args.finishPosition];
    if (placementRwrd_TK != undefined && placementRwrd_TK != null && !isNaN(Number(placementRwrd_TK))) {
        //there a reward defined for this placement
        tkReward += Number(placementRwrd_TK);
    };

    //TODO actually use the start qte outcome index to modify the scReward value
    //SC from start qte
    if (!isNaN(Number(raceRewardJSON.MaxStartBonus)))
        scReward += Number(raceRewardJSON.MaxStartBonus);

    //SC from finish speed
    if (!isNaN(Number(args.finishSpeedFactor)) && !isNaN(Number(raceRewardJSON.MaxFinishBonus)))
        scReward += Math.round(Number(raceRewardJSON.MaxFinishBonus) * Number(args.finishSpeedFactor));

    //Give currencies to player
    if (scReward > 0)
        addCurrency("SC", scReward);

    if (hcReward > 0)
        addCurrency("HC", hcReward);

    if (tkReward > 0)
        addCurrency("TK", tkReward);

    return null;
}
