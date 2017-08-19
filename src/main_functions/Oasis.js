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

    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    //return new timestamp and new inventory
    return {
        Result: "OK",
        NextOasisTime: serverTime + Number(oasisBalancing.rechargeInterval) * 3600,
        VirtualCurrency: VirtualCurrencyObject
    }
}

handlers.getOasisData = function (args, context) {

    //first of all, let's load the oasis balancing variables
    var oasisBalancing = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancing == undefined || oasisBalancing == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    return {
        Result: "OK",
        NextOasisTime: getNextOasisTime(oasisBalancing.rechargeInterval)
    }
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
