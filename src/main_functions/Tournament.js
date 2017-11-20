//sets the player's tournament rank based on player level
//returns the player's TournamentData Json object. In case of error, returns null
function GetCurrentTournament(args) {

    //load the player's tournament data
    var currentTournament = loadPlayerReadOnlyDataJson("CurrentTournament");

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
                Data: { CurrentTournament: JSON.stringify(currentTournament) }
            }
        );
    }

    return currentTournament;
}

//save race recording into the "LastTournamentRaceRecording" player data
function SaveTournamentRecording(startQteOutcome, finishTime, camelData) {

    var recording = {
        camelName: camelData.Name,
        camelCustomization: camelData.Customization,
        startQteOutcome: Number(startQteOutcome),
        finishTime: Number(finishTime),
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

handlers.resetTournament = function (args, context) {

}
