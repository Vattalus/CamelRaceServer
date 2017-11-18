//sets the player's tournament rank based on player level
//returns the player's TournamentData Json object. In case of error, returns null
function SetPlayerTournamentData(args) {

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
        tournamentDataJSON.TournamentName == undefined || tournamentDataJSON.TournamentName == null || tournamentDataJSON.TournamentName.length <= 0) {
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
        tournamentDataJSON.TournamentName = tournamentName;

        //update player's readonly data
        server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { "TournamentData": JSON.stringify(tournamentDataJSON) }
            }
        );
    }

    return tournamentDataJSON;
}

function AddTournamentRecording(tournamentName, finishTime, camelData) {

    var recordingsObjectKey = "Recordings_" + tournamentName;
    var tournamentRecordingsJSON = loadTitleDataJson(recordingsObjectKey);

    if (tournamentRecordingsJSON == undefined || tournamentRecordingsJSON == null)
        return null;

    //add new recording. Player's id is the key, so a player can only have 1 recording active
    tournamentRecordingsJSON.currentPlayerId = {
        camelName: camelData.Name,
        camelCustomization: camelData.Customization,
        finishTime: finishTime
    };

    //if list of recordings exceeds maximum length, delete first entry
    if (Object.keys(tournamentRecordingsJSON).length > 200) {
        delete tournamentRecordingsJSON[Object.keys(fruitObject)[0]];
    }

    //update the recordings object in titledata
    server.SetTitleData(
    {
        Key: recordingsObjectKey,
        Value: tournamentRecordingsJSON
    });
}
