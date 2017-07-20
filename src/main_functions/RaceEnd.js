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
    var raceRewardObject = loadTitleDataJson("RaceRewards_Quick");

    if (raceRewardObject == undefined || raceRewardObject == null)
        return generateErrObj("RaceRewards_Quick JSON undefined or null");

    var errorMessage = GiveRaceRewards(args, raceRewardObject);

    //check for errors
    if (errorMessage != null)
        return generateErrObj(errorMessage);

    //todo create virtual currency object and return it
}

function GiveRaceRewards(args, raceRewardObject) {
    return "something went wrong lol";
}

