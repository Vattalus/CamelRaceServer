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


    log.debug("curr timestamp: ", serverTime.getTime().timeStamp);

    //check if next oasis timestamp has passed
    if (nextOasis.Data.nextOasis != undefined && nextOasis.Data.nextOasis.Value != undefined) {
        if (nextOasis.Data.nextOasis.Value >= serverTime.getTime().timeStamp) {
            //player's timestamp is greater than current server time (time not elapsed yet). Return failed status with the next oasis timestamp in the 'Data' field.
            return generateFailObj("Oasis not ready yet", nextOasis.Data.nextOasis.Value);
        }
    }
    var nextOasisTimestep = 0;

    log.debug("nextOasis.Data.nextOasis undefined: ", nextOasis.Data.nextOasis == undefined);

    var nextOasisTimestep = nextOasis.Data.nextOasis.Value;


    log.debug("Next Oasis timestep undefined: ", nextOasisTimestep == undefined);
    log.debug("Next Oasis timestep null: ", nextOasisTimestep == null);

    //if player did not have that value, add it
    //if (nextOasisTimestep == null)

    //var nextOasisTimestamp = new Date().timeStamp;

    ////if non-existant, create it
    //if (nextOasis.Data.nextOasis == undefined) {
    //    server.UpdateUserReadOnlyData(
    //        {
    //            PlayFabId: currentPlayerId,
    //            Data: { "nextOasis": nextOasisTimestamp }
    //        }
    //    );
    //} else {
    //    nextOasisTimestamp = nextOasis.Data.nextOasis;
    //}

    return { nextOasisTimestamp: nextOasis.Data.nextOasis };
}