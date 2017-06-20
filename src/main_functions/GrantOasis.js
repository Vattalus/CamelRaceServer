handlers.grantOasis = function (args, context) {

    //load the oasis balancing json from title data
    var oasisBalancingJSON = loadTitleDataJson("Balancing_Oasis");

    if (oasisBalancingJSON == undefined || oasisBalancingJSON == null)
        return generateErrObj("Oasis Balancing JSON undefined or null");

    //load the player's oasis data
    var nextOasis = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["nextOasis"]
    });

    var serverTime = new Date();

    //check if next oasis timestamp has passed
    if (nextOasis.Data.nextOasis != undefined && nextOasis.Data.nextOasis.Value != undefined) {
        if (nextOasis.Data.nextOasis.Value >= serverTime.getTime()) {
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

    //calculate the timestamp of the next oasis
    var newOasisTimestep = serverTime.getTime() + Number(oasisBalancingJSON.rechargeInterval);

    //update the player's next oasis timestamp variable
    server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { "nextOasis": newOasisTimestep }
            }
        );

    var userInventoryObject = server.GetUserInventory({ PlayFabId: currentPlayerId });
    var VirtualCurrencyObject = userInventoryObject.VirtualCurrency;

    //return new timestamp and new inventory
    return {
        nextOasisTimestamp: newOasisTimestep,
        VirtualCurrency: VirtualCurrencyObject
    }
}