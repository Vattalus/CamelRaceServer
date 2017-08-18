function generateFailObj(mess, data) {
    var retObj = {
        Result: "Failed",
        Message: mess,
        Data: data
    };
    return retObj;
}

function generateErrObj(mess, data) {
    var retObj = {
        Result: "Error",
        Message: mess,
        Data: data
    };
    return retObj;
}

function loadTitleDataJson(key) {
    var tData = server.GetTitleData(
    {
        PlayFabId: currentPlayerId,
        Keys: [key]
    }
    );

    if (tData == undefined || tData.Data == undefined || tData.Data[key] == undefined)
        return null;

    var tDataJSON = JSON.parse(tData.Data[key]);

    if (tDataJSON == undefined)
        return null;

    return tDataJSON;
}

//get the current server time timestamp (seconds)
function getServerTime() {
    return Math.floor((new Date().getTime() / 1000));
}

//random int between min and max (both inclusive)
function randomRange(min, max) {
    return Math.round(Math.random() * (Number(max) - Number(min))) + Number(min);
}

//Add Virtual Currency
function addCurrency(currCode, amount) {
    server.AddUserVirtualCurrency(
{
    PlayFabId: currentPlayerId,
    "VirtualCurrency": currCode,
    "Amount": amount
});
}

//Pay Virtual Currency (returns null if cannot afford)
function payCurrency(scAmount, hcAmount, tkAmount) {
    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    if ((scAmount != undefined && scAmount != null && scAmount > VirtualCurrencyObject.SC) ||
    (hcAmount != undefined && hcAmount != null && hcAmount > VirtualCurrencyObject.HC) ||
    (tkAmount != undefined && tkAmount != null && tkAmount > VirtualCurrencyObject.TK))
        return null;

    //subtract currency
    if (scAmount != undefined && scAmount != null && Number(scAmount) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "SC", "Amount": scAmount });
        VirtualCurrencyObject.SC -= scAmount;
    }

    if (hcAmount != undefined && hcAmount != null && Number(hcAmount) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "HC", "Amount": hcAmount });
        VirtualCurrencyObject.HC -= hcAmount;
    }

    if (tkAmount != undefined && tkAmount != null && Number(tkAmount) > 0) {
        server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "VirtualCurrency": "TK", "Amount": tkAmount });
        VirtualCurrencyObject.HC -= tkAmount;
    }

    return VirtualCurrencyObject;
}

//Add Experience
function addExperience(expGain) {

    //read the 'LevelProgress' variable from player's read-only data
    var playerData = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["LevelProgress"]
    });

    var playerLevelProgressJSON = {};

    if (playerData.Data.LevelProgress != undefined && playerData.Data.LevelProgress != null) {
        //successfully loaded player's level data
        playerLevelProgressJSON = JSON.parse(playerData.Data.LevelProgress.Value);
        if (playerLevelProgressJSON != undefined && playerLevelProgressJSON != null) {
            return null; //Failed to convert to JSON
        }
    } else {
        //player's level data does not exist yet, initialize
        playerLevelProgressJSON.Experience = 0;
        playerLevelProgressJSON.Level = 0;
        playerLevelProgressJSON.LastLevelReward = 0;
    }

    //Increment Experience value
    playerLevelProgressJSON.Experience = Number(playerLevelProgressJSON.Experience) + Number(expGain);

    //Recalculate level (Load the level thresholds from title data)
    var levelsBalancingJSON = loadTitleDataJson("Balancing_PlayerLevels");

    if (levelsBalancingJSON == undefined || levelsBalancingJSON == null || levelsBalancingJSON.length == 0)
        return null; //Failed to load balancing data

    //Recalculate level
    var currLvl = 0;
    for (var i = 0; i < levelsBalancingJSON.length; i++) {
        currLvl = i;
        if (playerLevelProgressJSON.Experience < Number(levelsBalancingJSON[i].Threshold)) {
            break;
        }
    }

    //Update level value
    playerLevelProgressJSON.Level = currLvl;

    //update the player's level data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {"LevelProgress": JSON.stringify(playerLevelProgressJSON)}
    });

    //return the updated level data value
    return playerLevelProgressJSON;
}
