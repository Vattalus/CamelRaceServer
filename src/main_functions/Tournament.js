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

    return JSON.stringify(currentTournament);
}

function AddToTournamentPlayersList(tournamentName) {

    AddToTournamentPlayersList(tournamentName);
    var recordingsObjectKey = "Recordings_" + tournamentName;

    var tournamentRecordingsJSON = loadTitleInternalDataJson(recordingsObjectKey);

    if (tournamentRecordingsJSON == undefined || tournamentRecordingsJSON == null)
        return null;

    //add the player to the list of players that recently played a tournament race (ONLY IF NOT ALREADY ON LIST)
    if (tournamentRecordingsJSON.indexOf(currentPlayerId) < 0) {
        tournamentRecordingsJSON.push(currentPlayerId);
    }

    //if list of recordings exceeds maximum length, delete first entry
    if (tournamentRecordingsJSON.length > 400) {
        tournamentRecordingsJSON.splice(0, 1);
    }

    //TODO if size ever becomes an issue, a workaround would be to store a player's last recording on their player data, and only store playerIDs in the tournamentRecordingsJSON as a list.
    //TODO Therefore we could just get a set of random playerIDs and get the recordings from each player respectively

    //update the recordings object in titledata
    server.SetTitleInternalData(
    {
        Key: recordingsObjectKey,
        Value: JSON.stringify(tournamentRecordingsJSON)
    });
}

//save race recording into the "LastTournamentRaceRecording" player data
function SaveTournamentRecording(startQteOutcome, finishTime, camelData) {

    server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: {
                "LastTournamentRaceRecording": {
                    camelName: camelData.Name,
                    camelCustomization: camelData.Customization,
                    startQteOutcome: Number(startQteOutcome),
                    finishTime: Number(finishTime),
                }
            }
        });
}
