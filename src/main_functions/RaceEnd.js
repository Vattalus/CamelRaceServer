//Arguments
//args.camelIndex
//args.finishPosition - placement of player (0- first, 1-seconds etc)
//args.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//args.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
handlers.endRace_quick = function (args, context) {

    //first we load the race reward parameters for the quick race.
    var raceRewardJSON = loadTitleDataJson("RaceRewards_Quick");

    if (raceRewardJSON == undefined || raceRewardJSON == null)
        return generateErrObj("RaceRewards_Quick JSON undefined or null");

    //calculate sc bonus based on player level
    var scBonusFromLevel = Number(0);
    if (raceRewardJSON.ScBonusPerPlayerLevel != undefined && raceRewardJSON.ScBonusPerPlayerLevel != null && raceRewardJSON.ScBonusPerPlayerLevel.length > args.finishPosition)
        scBonusFromLevel = Number(raceRewardJSON.ScBonusPerPlayerLevel[args.finishPosition]);

    //calculate and give rewards based on placement, start qte, finish speed
    var receivedRewards = GiveRaceRewards(args, raceRewardJSON, scBonusFromLevel);

    //check for errors
    if (receivedRewards == undefined || receivedRewards == null || receivedRewards.ErrorMessage != null)
        return generateErrObj(receivedRewards.ErrorMessage);

    //update camel statistics
    var camelObject = CamelFinishedRace(args);

    //return new currency balance
    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    }
}

//Arguments
//args.camelIndex
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

    //cache the series json
    var seriesJSON = eventRewardsJSON[args.seriesIndex];

    //check the series index exists
    if (seriesJSON == undefined || seriesJSON == null)
        return generateErrObj("Series with index: " + args.seriesIndex + " not found");

    //check if the list of events exists
    if (seriesJSON.EventsList == undefined || seriesJSON.EventsList == null)
        return generateErrObj("List of events not found for series with index: " + args.seriesIndex);

    //at this point, we have found the series and the list of events for that series, we don't need the entire eventRewardsJSON any more.
    eventRewardsJSON = null;

    //now, we need to check if the player is eligible for this reward

    //initialize the reached season and event values to 0 (in case they do not exist yet)
    var currSeries = Number(0);
    var currEvent = Number(0);

    //read the 'CurrentSeries' and 'CurrentEvent' variable from player's read-only data
    var playerData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["CurrentSeries", "CurrentEvent"]
    });

    if (playerData.Data.CurrentSeries != undefined && playerData.Data.CurrentSeries != null && !isNaN(playerData.Data.CurrentSeries.Value)) {
        currSeries = Number(playerData.Data.CurrentSeries.Value);
    }

    if (playerData.Data.CurrentEvent != undefined && playerData.Data.CurrentEvent != null && !isNaN(playerData.Data.CurrentEvent.Value)) {
        currEvent = Number(playerData.Data.CurrentEvent.Value);
    }

    //check if player is eligible for reward
    if (currSeries != args.seriesIndex || currEvent != args.eventIndex)
        return generateFailObj("Player is not eligible for this event");

    //calculate and give rewards based on placement, start qte, finish speed
    var receivedRewards = GiveRaceRewards(args, raceRewardJSON);

    //check for errors
    if (receivedRewards == undefined || receivedRewards == null || receivedRewards.ErrorMessage != null)
        return generateErrObj(receivedRewards.ErrorMessage);

    //give experience
    var newLevelProgress = null;

    //update camel statistics
    var camelObject = CamelFinishedRace(args);

    //if the player won, increment the current event value
    if (args.finishPosition == 0) {
        //increment series and set event to 0, if event was last in the list
        if (args.eventIndex == seriesJSON.EventsList.length) {

            //TODO here we give the series completion reward for the currSeries

            currSeries++;
            currEvent = 0;
        } else {
            currEvent++;
        }

        //Grant Experience
        newLevelProgress = addExperience(seriesJSON.EventsList[args.eventIndex].ExpGain);
    }

    //update the current season and event values in the player's read-only data
    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "CurrentSeries": currSeries, "CurrentEvent": currEvent }
        }
    );

    //return the updated virtual currency and current series/event values
    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency,
        CurrentSeries: currSeries,
        CurrentEvent: currEvent,
        LevelProgress: newLevelProgress
    }
}

//Arguments
//args.camelIndex
//arg.finishPosition - placement of player (0- first, 1-seconds etc)
//arg.startQteOutcome - outcome of the start qte (0-perfect, 1-great, 2-good etc)
//arg.finishSpeedFactor - speed factor when crossing finish line (0-top speed, 1-top speed+max boost speed bonus)
//args.finishTime - time it took to finish the race (for recordings)
handlers.endRace_tournament = function (args, context) {

    //first we load the race reward parameters for the quick race.
    var raceRewardJSON = loadTitleDataJson("RaceRewards_Tournament");

    if (raceRewardJSON == undefined || raceRewardJSON == null)
        return generateErrObj("RaceRewards_Tournament JSON undefined or null");

    //TODO maybe implement bonus per player level
    //TODO also, what does the bonus per level mean? level*bonus? (only if first place?? O.o)

    //calculate and give rewards based on placement, start qte, finish speed
    var receivedRewards = GiveRaceRewards(args, raceRewardJSON);

    //check for errors
    if (receivedRewards == undefined || receivedRewards == null || receivedRewards.ErrorMessage != null)
        return generateErrObj(receivedRewards.ErrorMessage);

    var tournamentDataJSON = SetPlayerTournamentData();

    if (tournamentDataJSON == undefined || tournamentDataJSON == null)
        return generateErrObj("error setting player tournamend data");

    //TODO increment tournament leaderboard

    //update camel statistics
    var camelObject = CamelFinishedRace(args);

    //TODO perform tournament statistics update (update leaderboard, add recording etc)
    //TODO store recordings in a titledata object, each player represented by a [playerid][recording data] object, in a list. When adding a new recording:
    //if player already has a recording, replace it
    //if player not on the list, add them at the beggining of the list, and if the list exceeds max length, delete last element

    //return new currency balance
    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    }
}

function GiveRaceRewards(args, raceRewardJSON, playerLevelBonusSC) {

    //if error message is != null, something went wrong
    var returnObject = {
        "RewardsReceived": {
            "SC": 0,
            "HC": 0,
            "TK": 0
        },
        "ErrorMessage": null
    }

    var scReward = Number(0);
    var hcReward = Number(0);
    var tkReward = Number(0);

    //check if JSON is valid
    if (raceRewardJSON.Placement_SC == undefined || raceRewardJSON.Placement_HC == undefined || raceRewardJSON.Placement_TK == undefined) {
        returnObject.ErrorMessage = "race rewards JSON is not valid";
        return returnObject;
    }

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

    //SC from player level bonus
    if (playerLevelBonusSC != undefined && playerLevelBonusSC != null && !isNaN(Number(playerLevelBonusSC)))
        scReward += Number(playerLevelBonusSC);

    //Give currencies to player
    if (scReward > 0)
        addCurrency("SC", scReward);

    if (hcReward > 0)
        addCurrency("HC", hcReward);

    if (tkReward > 0)
        addCurrency("TK", tkReward);

    //return the received currencies
    returnObject.RewardsReceived.SC = scReward;
    returnObject.RewardsReceived.HC = hcReward;
    returnObject.RewardsReceived.TK = tkReward;

    return returnObject;
}

//this function will do all the operations on the camel that finished the race (update statistics, decrement steroids charges etc)
//args.camelIndex
function CamelFinishedRace(args) {

    //first of all, load the player's owned camels list
    var ownedCamels = loadOwnedCamels();

    //check existance of Camels object
    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    //check validity of JSON
    if (selectedCamel == undefined || selectedCamel == null)
        return;

    //TODO increment statistics

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
    });

    return selectedCamel;
}

//sets the player's tournament rank based on player level
//returns the player's TournamentData Json object. In case of error, returns null
function SetPlayerTournamentData() {

    //load the player's tournament data
    var tournamentDataJSON = null;

    var tournamentData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["TournamentData"]
    });

    if (tournamentData != undefined && tournamentData != null && tournamentData.Data.TournamentData != undefined && tournamentData.Data.TournamentData != null) {
        tournamentDataJSON = JSON.parse(tournamentData.Data.TournamentData.Value);
    }

    if (tournamentDataJSON == undefined || tournamentDataJSON == null ||
        tournamentDataJSON.StatisticName == undefined || tournamentDataJSON.StatisticName == null || tournamentDataJSON.StatisticName.length <= 0) {
        //create new tournament object

        //load player's current level
        var playerLevelProgress = server.GetUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Keys: ["LevelProgress"]
        });

        var playerLevel = 0;

        if (playerLevelProgress != undefined && playerLevelProgress != null && playerLevelProgress.Data.LevelProgress != undefined && playerLevelProgress.Data.LevelProgress != null) {
            var playerLevelProgressJSON = JSON.parse(playerLevelProgress.Data.LevelProgress.Value);

            if (playerLevelProgressJSON != undefined && playerLevelProgressJSON != null && !isNaN(Number(playerLevelProgressJSON.Level))) {
                playerLevel = Number(playerLevelProgressJSON.Level);
            }
        }

        var tournamentName = "TournamentBronze";

        //determine tournament rank based on player level
        switch (playerLevel) {
            case 0:
            case 1:
            case 2:
                tournamentName = "TournamentBronze";
                break;

            case 3:
            case 4:
            case 5:
                tournamentName = "TournamentSilver";
                break;

            case 6:
            case 7:
            case 8:
                tournamentName = "TournamentGold";
                break;

            case 9:
            case 10:
            case 11:
                tournamentName = "TournamentPlatinum";
                break;

            case 12:
            case 13:
            case 14:
                tournamentName = "TournamentDiamond";
                break;
        }

        tournamentDataJSON = {};
        tournamentDataJSON.StatisticName = tournamentName;
    }

    return tournamentDataJSON;
}
