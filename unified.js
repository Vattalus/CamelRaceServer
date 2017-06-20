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

function randomRange(min, max) {
    return Math.round(Math.random() * (max-min)) + min;
}handlers.grantOasis = function (args, context) {

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

    //grant rewards
    log.debug("sc reward: ", randomRange(oasisBalancingJSON.scRewardBase, oasisBalancingJSON.scRewardBase * 2));
    log.debug("hc reward: ", randomRange(oasisBalancingJSON.hcRewardMin, oasisBalancingJSON.hcRewardMax));
    log.debug("tk reward: ", randomRange(oasisBalancingJSON.ticketsRewardMin, oasisBalancingJSON.ticketsRewardMax));

    //calculate the timestamp of the next oasis
    var newOasisTimestep = serverTime.getTime() + Number(oasisBalancingJSON.rechargeInterval);

    //update the player's next oasis timestamp variable
    server.UpdateUserReadOnlyData(
            {
                PlayFabId: currentPlayerId,
                Data: { "nextOasis": newOasisTimestep }
            }
        );

    return { nextOasisTimestamp: nextOasis.Data.nextOasis };
}