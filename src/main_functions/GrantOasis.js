handlers.grantOasis = function (args, context) {

    //load the oasis balancing json from title data
    var oasisBalancingJSON = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancingJSON == undefined || oasisBalancingJSON == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    //load the player's oasis data
    var lastOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["lastClaimedOasisTimestamp"]
    });

    var serverTime = getServerTime();

    log.debug("var undefined: ", lastOasis.Data.lastClaimedOasisTimestamp == undefined);
    log.debug("value undefined: ", lastOasis.Data.lastClaimedOasisTimestamp.Value == undefined);
    log.debug("value: ", lastOasis.Data.lastClaimedOasisTimestamp.Value);
    log.debug("recharge interval: ", Number(oasisBalancingJSON.rechargeInterval * 3600));
    log.debug("ready at: ", Number(lastOasis.Data.lastClaimedOasisTimestamp.Value) + Number(oasisBalancingJSON.rechargeInterval * 3600));
    log.debug("server time: " , serverTime);
    log.debug("Should be ready: ", Number(lastOasis.Data.lastClaimedOasisTimestamp.Value) + Number(oasisBalancingJSON.rechargeInterval * 3600 * 1000) < Number(serverTime));

    //check if the wait time has passed for the oasis
    if (lastOasis.Data.lastClaimedOasisTimestamp != undefined && lastOasis.Data.lastClaimedOasisTimestamp.Value != undefined) {
        if (Number(lastOasis.Data.lastClaimedOasisTimestamp.Value) + Number(oasisBalancingJSON.rechargeInterval * 3600 * 1000) > Number(serverTime)) {
            //time not elapsed yet. Return failed status with the last oasis timestamp in the 'Data' field.
            return generateFailObj("Oasis not ready yet", lastOasis.Data.lastClaimedOasisTimestamp.Value);
        }
    }

    //the oasis is ready to be granted

    //calculate rewards
    var scReward = randomRange(oasisBalancingJSON.scRewardBase, oasisBalancingJSON.scRewardBase * 2);
    var hcReward = randomRange(oasisBalancingJSON.hcRewardMin, oasisBalancingJSON.hcRewardMax);
    var tkReward = randomRange(oasisBalancingJSON.ticketsRewardMin, oasisBalancingJSON.ticketsRewardMax);

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

