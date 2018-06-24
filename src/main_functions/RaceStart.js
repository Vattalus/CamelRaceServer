//Arguments
//args.camelIndex
//args.raceType
//args.raceLength [int]
handlers.startRace = function (args, context) {

    //first of all, load the player's owned camels list
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //TODO increment statistics (races started, decrement steroids etc)

    //if camel too old
    if (selectedCamel.Retire <= 0)
        if (VirtualCurrencyObject == null)
            return generateFailObj("Camel Too Old");

    //recalculate fatigue
    var serverTime = getServerTime();

    if (selectedCamel.FatigueChangeTimestamp == undefined || selectedCamel.FatigueChangeTimestamp == null)
        selectedCamel.FatigueChangeTimestamp = serverTime;

    if (selectedCamel.Fatigue < 100) {
        var fatigueRechargeTime = 10;

        while ((serverTime - selectedCamel.FatigueChangeTimestamp) >= (fatigueRechargeTime * 60) && selectedCamel.Fatigue < 100) {
            selectedCamel.Fatigue += 10;
            selectedCamel.FatigueChangeTimestamp += (fatigueRechargeTime * 60);

            if (selectedCamel.Fatigue >= 100) {
                //fully recharged
                selectedCamel.Fatigue = 100;
                selectedCamel.FatigueChangeTimestamp = serverTime;
            }
        }
    }

    //add fatigue and retirement
    var fatigueVal = Number(10);
    var retireVal = Number(10);

    switch (args.raceLength) {
        case 0:
            fatigueVal = 10;
            retireVal = 10;
            break;
        case 1:
            fatigueVal = 20;
            retireVal = 20;
            break;
        case 2:
            fatigueVal = 30;
            retireVal = 30;
            break;
        default:
            fatigueVal = 10;
            retireVal = 10;
            break;
    }

    selectedCamel.Fatigue -= fatigueVal;
    selectedCamel.Retire -= retireVal;


    //decrement steroid charges
    if (Number(selectedCamel.SteroidsLeft) > Number(1))
        selectedCamel.SteroidsLeft = Number(selectedCamel.SteroidsLeft) - Number(1);

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
    });

    var OpponentData = null;

    //for tournaments, make sure the player has at least one ticket
    if (args.raceType == "Tournament") {

        var VirtualCurrencyObject = payCurrency(0, 0, 1);

        if (VirtualCurrencyObject == null)
            return generateFailObj("Not enough tickets");

        //get opponent data
        OpponentData = GetListOfOpponentRecordings(5);
    }

    return {
        Result: "OK",
        //CamelData: camelObject
        OpponentData: JSON.stringify(OpponentData)
    }
}