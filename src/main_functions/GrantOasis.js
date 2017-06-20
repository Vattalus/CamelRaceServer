handlers.grantOasis = function (args, context) {

    //load the oasis balancing json from title data
    var oasisBalancingJSON = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancingJSON == undefined || oasisBalancingJSON == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    //load the player's oasis data
    var lastOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["lastOasis"]
    });

    var serverTime = new Date().getTime();

    //check if the wait time has passed for the oasis
    if (lastOasis.Data.lastOasis != undefined && lastOasis.Data.lastOasis.Value != undefined) {
        if (lastOasis.Data.lastOasis.Value + Number(oasisBalancingJSON.rechargeInterval * 3600 * 1000) >= serverTime) {
            //player's timestamp is greater than current server time (time not elapsed yet). Return failed status with the next oasis timestamp in the 'Data' field.
            return generateFailObj("Oasis not ready yet", nextOasis.Data.nextOasis.Value);
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
                Data: { "lastOasis": serverTime }
            }
        );

    var userInventoryObject = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var VirtualCurrencyObject = userInventoryObject.VirtualCurrency;

    //return new timestamp and new inventory
    return {
        nextOasisTimestamp: serverTime,
        VirtualCurrency: VirtualCurrencyObject
    }
}