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
    log.debug("server time: " + serverTime);

    //check if the wait time has passed for the oasis
    if (lastOasis.Data.lastClaimedOasisTimestamp != undefined && lastOasis.Data.lastClaimedOasisTimestamp.Value != undefined) {
        if (Number(lastOasis.Data.lastClaimedOasisTimestamp.Value) + Number(oasisBalancingJSON.rechargeInterval * 3600 * 1000) >= serverTime) {
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

handlers.raceEnd = function (args, context) {

    if (args != null && args.endRaceReward && Number(args.endRaceReward)) {
        addCurrency("SC", Number(args.endRaceReward));
    }

    return { Result: "OK" };
}
