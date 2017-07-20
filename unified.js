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

handlers.grantOasis = function (args, context) {

    //first of all, let's load the oasis balancing variables
    var oasisBalancing = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancing == undefined || oasisBalancing == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    //balancing loaded correctly

    //get the timestamp of the next oasis
    var nextOasisTimestamp = getNextOasisTime(oasisBalancing.rechargeInterval);

    //correctly loaded next oasis timestamp

    //check if the wait time has passed for the oasis
    var serverTime = getServerTime();

    if (nextOasisTimestamp > serverTime) {
        //time not elapsed yet. Return failed status with the timestamp of the next oasis in the 'Data' field.
        return generateFailObj("Oasis not ready yet", nextOasisTimestamp);
    }

    //the oasis is ready to be granted

    //calculate rewards
    var scReward = randomRange(oasisBalancing.scRewardBase, oasisBalancing.scRewardBase * 2);
    var hcReward = randomRange(oasisBalancing.hcRewardMin, oasisBalancing.hcRewardMax);
    var tkReward = randomRange(oasisBalancing.ticketsRewardMin, oasisBalancing.ticketsRewardMax);

    //increment virtual currency
    addCurrency("SC", scReward);
    addCurrency("HC", hcReward);
    addCurrency("TK", tkReward);

    //update the player's last claimed oasis timestamp
    server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { "lastClaimedOasisTimestamp": serverTime }
            }
        );

    var userInventoryObject = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var VirtualCurrencyObject = userInventoryObject.VirtualCurrency;

    //return new timestamp and new inventory
    return {
        lastOasisTimestamp: serverTime,
        VirtualCurrency: VirtualCurrencyObject
    }
}

handlers.getOasisData = function (args, context) {

    //first of all, let's load the oasis balancing variables
    var oasisBalancing = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancing == undefined || oasisBalancing == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    return getNextOasisTime(oasisBalancing.rechargeInterval);
}

//get the timestamp of the next oasis
function getNextOasisTime(oasisWaitTime) {

    //load the player's oasis data
    var lastOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["lastClaimedOasisTimestamp"]
    });

    var lastClaimedOasisTimestamp = 0;

    if (lastOasis.Data.lastClaimedOasisTimestamp != undefined && lastOasis.Data.lastClaimedOasisTimestamp.Value != undefined) {
        lastClaimedOasisTimestamp = Number(lastOasis.Data.lastClaimedOasisTimestamp.Value);
    }

    return lastClaimedOasisTimestamp + Number(oasisWaitTime) * 3600;
}
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

    log.debug("placement index: ", args.finishPosition);

    var placementRwrd_SC = raceRewardJSON.Placement_SC[args.finishPosition];

    if (placementRwrd_SC == undefined || placementRwrd_SC == null) {
        //there is no reward defined for this placement
        log.debug("debug:", { "Undefined": placementRwrd_SC == undefined, "Null": placementRwrd_SC == null });
    };

    return placementRwrd_SC;

    return null;
}
