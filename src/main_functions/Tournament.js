//sets the player's tournament rank based on player level
//returns the player's TournamentData Json object. In case of error, returns null
function GetCurrentTournament(args) {

    var currentTournament = null;

    //load the player's tournament data
    var playerReadOnlyData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: "CurrentTournament"
    });

    if (playerReadOnlyData != undefined && playerReadOnlyData.Data != undefined && playerReadOnlyData.Data.CurrentTournament != undefined) {
        currentTournament = playerReadOnlyData.Data.CurrentTournament.Value;
    }

    if (currentTournament == undefined || currentTournament == null) {
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

        var currentTournament = "TournamentBronze";

        //determine tournament rank based on player level
        switch (playerLevel) {
            case 0:
            case 1:
            case 2:
                currentTournament = "TournamentBronze";
                break;

            case 3:
            case 4:
            case 5:
                currentTournament = "TournamentSilver";
                break;

            case 6:
            case 7:
            case 8:
                currentTournament = "TournamentGold";
                break;

            case 9:
            case 10:
            case 11:
                currentTournament = "TournamentPlatinum";
                break;

            case 12:
            case 13:
            case 14:
                currentTournament = "TournamentDiamond";
                break;
        }

        //update player's readonly data
        server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { CurrentTournament: currentTournament }
            }
        );
    }

    return currentTournament;
}

//save race recording into the "LastTournamentRaceRecording" player data
function SaveTournamentRecording(startQteOutcome, camelActions, camelData) {

    var recording = {
        camelName: camelData.Name,
        camelAcceleration: camelData.Acceleration,
        camelSpeed: camelData.Speed,
        camelGallop: camelData.Gallop,
        //Stamina irrelevant for recordings, as it does not influence speed
        camelCustomization: camelData.Customization,
        startQteOutcome: Number(startQteOutcome),
        camelActions: camelActions
    }

    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { LastTournamentRaceRecording: JSON.stringify(recording) }
    });
}

function AddToTournamentPlayersList(tournamentName) {

    var playerListKey = "Recordings_" + tournamentName;

    var playerListJSON = loadTitleInternalDataJson(playerListKey);

    if (playerListJSON == undefined || playerListJSON == null)
        return null;

    //add the player to the list of players that recently played a tournament race (ONLY IF NOT ALREADY ON LIST)
    if (playerListJSON.indexOf(currentPlayerId) < 0) {

        playerListJSON.push(currentPlayerId);

        //if list of recordings exceeds maximum length, delete first entry
        if (playerListJSON.length > 400) {
            playerListJSON.splice(0, 1);
        }

        //update the recordings object in titledata
        server.SetTitleInternalData(
        {
            Key: playerListKey,
            Value: JSON.stringify(playerListJSON)
        });
    }
}

//get a set of random playerIDs from the list and get the recordings from each player respectively
function GetListOfOpponentRecordings(nrOfOpponents) {

    //get the tournament name the player is currently competing in
    var currentTournament = GetCurrentTournament();

    //load the list of player ids from the list of players that recently played tournament
    var playerListKey = "Recordings_" + currentTournament;

    var playerListJSON = loadTitleInternalDataJson(playerListKey);

    if (playerListJSON == undefined || playerListJSON == null || playerListJSON.count <= 0)
        return null;

    //shuffle the list, to randomize the elements
    shuffleArray(playerListJSON);

    var nrOfSelected = 0;
    var checkingIndex = 0;

    var listOfRecordings = [];

    while (nrOfSelected < nrOfOpponents) {
        //make sure index is not out of range
        if (checkingIndex >= playerListJSON.length) break;

        //skip current player's entry if encountered
        if (playerListJSON[checkingIndex] != currentPlayerId) {
            //load this player's last tournament race data
            var lastTournamentRecording = loadPlayerReadOnlyDataJson("LastTournamentRaceRecording", playerListJSON[checkingIndex]);

            if (lastTournamentRecording != undefined && lastTournamentRecording != null) {
                listOfRecordings.push(lastTournamentRecording);
                nrOfSelected++;
            }
        }
        checkingIndex++;
    }

    return listOfRecordings;
}

function GetDummyCharacterId() {
    var titleData = server.GetTitleData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["DummyPlayer"]
    });

    if (titleData == undefined || titleData.Data == undefined)
        return null;

    return titleData.Data.DummyPlayer;
}


handlers.endTournamentPlayer = function (args, context) {

    var playerLeaderboardPositionData = GetPlayerLeaderboardPercentagePosition();

    if (playerLeaderboardPositionData == undefined || playerLeaderboardPositionData == null) return null;

    //load the tournament end rewards
    var tournamentEndRewards = loadTitleDataJson("Balancing_TournamentEndRewards");
    if (tournamentEndRewards == undefined || tournamentEndRewards == null || tournamentEndRewards.length <= 0) return null;

    var rewardsObject = null;

    for (var i = 0; i < tournamentEndRewards.length; i++) {

        //check if player fall inside this percentage bracket
        if (playerLeaderboardPositionData.TopPercent <= Number(tournamentEndRewards[i].TopPercent)) {
            rewardsObject = tournamentEndRewards[i];
            break; //remove this if we wish that all players receive something (last element in list) 
        }
    }

    if (rewardsObject == null) return null; //player receives no reward OR an error occured

    //Create the "LastTournamentRewards" object in the player's readonly data
    var tournamentRewardsObject = {};
    tournamentRewardsObject.PlayerLeaderboardPosition = playerLeaderboardPositionData.Position;
    tournamentRewardsObject.PlayerLeaderboardPercentagePosition = playerLeaderboardPositionData.TopPercent;
    tournamentRewardsObject.RewardSC = rewardsObject.RewardSC;
    tournamentRewardsObject.RewardHC = rewardsObject.RewardHC;

    //save the tournament end rewards and clear the current tournament name and recordings
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            LastTournamentRewards: JSON.stringify(tournamentRewardsObject),
            CurrentTournament: null,
            LastTournamentRaceRecording: null
        }
    }
    );
}

function GetPlayerLeaderboardPercentagePosition() {

    //load the player's current Tournament Rank
    var currentTournament = GetCurrentTournament();

    var LeaderboardData = server.GetLeaderboardAroundUser({
        StatisticName: currentTournament,
        PlayFabId: currentPlayerId,
        MaxResultsCount: 1
    });

    var playerStatValue = 0;
    var playerPosition = -1;

    if (LeaderboardData != undefined && LeaderboardData.Leaderboard != undefined && LeaderboardData.Leaderboard.length > 0) {

        playerStatValue = Number(LeaderboardData.Leaderboard[0].StatValue),
        playerPosition = Number(LeaderboardData.Leaderboard[0].Position);
    }

    var DummyPlayerId = GetDummyCharacterId();

    if (DummyPlayerId != undefined && DummyPlayerId != null) {
        //Load the dummy player's position (always be last), in order to find out how many players participated in the leaderboard
        LeaderboardData = server.GetLeaderboardAroundUser({
            StatisticName: currentTournament,
            PlayFabId: DummyPlayerId,
            MaxResultsCount: 1
        });
    }

    var lastPosition = -1;

    if (LeaderboardData != undefined && LeaderboardData.Leaderboard != undefined && LeaderboardData.Leaderboard.length > 0) {

        lastPosition = Number(LeaderboardData.Leaderboard[0].Position);
    }

    //error loading leaderboards
    if (playerPosition < 0 || lastPosition < 0) return null;

    return {
        "StatName": currentTournament,
        "StatValue": playerStatValue,
        "Position": playerPosition,
        "TopPercent": (playerPosition / lastPosition) * 100
    }
}

handlers.endTournamentTitle = function (args, context) {

    //reset the dummy player's statistics to 1
    var DummyPlayerId = GetDummyCharacterId();

    if (DummyPlayerId != undefined && DummyPlayerId != null) {
        server.UpdatePlayerStatistics({
            PlayFabId: DummyPlayerId,
            Statistics: [
                { StatisticName: "TournamentBronze", Value: 1 },
                { StatisticName: "TournamentSilver", Value: 1 },
                { StatisticName: "TournamentGold", Value: 1 },
                { StatisticName: "TournamentPlatinum", Value: 1 },
                { StatisticName: "TournamentDiamond", Value: 1 }
            ]
        });
    }

    //clear the list of players that participated in the tournament
    //update the recordings object in titledata
    server.SetTitleInternalData(
    {
        Key: "Recordings_TournamentBronze",
        Value: "[]"
    });

    server.SetTitleInternalData(
    {
        Key: "Recordings_TournamentSilver",
        Value: "[]"
    });

    server.SetTitleInternalData(
    {
        Key: "Recordings_TournamentGold",
        Value: "[]"
    });

    server.SetTitleInternalData(
    {
        Key: "Recordings_TournamentPlatinum",
        Value: "[]"
    });

    server.SetTitleInternalData(
    {
        Key: "Recordings_TournamentDiamond",
        Value: "[]"
    });

    //calculate the timestamp of the next Tournament start (5 minutes after running this function)
    server.SetTitleData(
    {
        "Key": "NextTournamentStart",
        "Value": getServerTime() + 5 * 60
    });
}

//method for receiving the last tournament rewards (read LastTournamentRewards, give rewards, delete object and return relevant data)
handlers.claimTournamentEndRewards = function (args, context) {

    //load the player's LastTournamentRewards object
    var lastTournamentRewardsJSON = loadPlayerReadOnlyDataJson("LastTournamentRewards");

    if (lastTournamentRewardsJSON == undefined || lastTournamentRewardsJSON == null) {
        return generateErrObj("LastTournamentRewards object not found");
    }

    //Add the currencies
    addCurrency("SC", lastTournamentRewardsJSON.RewardSC);
    addCurrency("HC", lastTournamentRewardsJSON.RewardHC);

    //now clear the  object from player data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { LastTournamentRewards: null }
    });

    return {
        Result: "OK",
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    };
}

function LoadTournamentLeaderboard() {

    //load players leaderboard data (scatistic name, statistic value, position, position percentage)
    var playerLeaderboardPositionData = GetPlayerLeaderboardPercentagePosition();

    if (playerLeaderboardPositionData == undefined || playerLeaderboardPositionData == null) return generateErrObj("Couldnt get current tournament leaderboard position");

    //Load leaderboard data
    var LeaderboardData = server.GetLeaderboard({
        StatisticName: playerLeaderboardPositionData.StatName,
        StartPosition: 0,
        MaxResultsCount: 100
    });

    var LeaderboardEntries = [];
    var DummyPlayerId = GetDummyCharacterId();

    if (LeaderboardData != undefined && LeaderboardData.Leaderboard != undefined && LeaderboardData.Leaderboard.length > 0) {

        for (var i = 0; i < LeaderboardData.Leaderboard.length; i++) {

            //ignore the dummy player
            if (LeaderboardData.Leaderboard[i].PlayFabId == DummyPlayerId) continue;

            LeaderboardEntries.push(
            {
                "PlayFabId": LeaderboardData.Leaderboard[i].PlayFabId,
                "DisplayName": LeaderboardData.Leaderboard[i].DisplayName,
                "StatValue": LeaderboardData.Leaderboard[i].StatValue,
                "Position": LeaderboardData.Leaderboard[i].Position
            });
        }
    }

    return {
        Result: "OK",
        "CurrentTournament": playerLeaderboardPositionData.StatName,
        "PlayerScore": playerLeaderboardPositionData.StatValue,
        "PlayerPosition": playerLeaderboardPositionData.Position,
        "PlayerPositionPercentage": playerLeaderboardPositionData.TopPercent,
        "LeaderboardEntries": LeaderboardEntries
    }
}

//retrieve leaderboard information to the client (first x players, player position)
handlers.RetrieveTournamentLeaderboard = function (args, context) {
    return LoadTournamentLeaderboard();
}
