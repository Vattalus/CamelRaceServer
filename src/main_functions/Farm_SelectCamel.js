//Sets the selected camel index to the param value
//args.camelIndex
handlers.selectCamel = function (args, context) {
    //first of all, load the player's owned camels list
    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //check existance of Camels object
    if ((camels.Data.Camels == undefined || camels.Data.Camels == null))
        return generateErrObj("Player's 'Camels' object was not found");

    var camelsJSON = JSON.parse(camels.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (camelObject == undefined || camelObject == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    var serverTime = getServerTime();

    //now check if we can select this camel
    if (camelObject.BreedingCompletionTimestamp == undefined || camelObject.BreedingCompletionTimestamp == null || Number(camelObject.BreedingCompletionTimestamp) >= serverTime)
        return generateFailObj("Camel cannot be selected: currently breeding");

    if (camelObject.TrainingEnds == undefined || camelObject.TrainingEnds == null || Number(camelObject.TrainingEnds) >= serverTime)
        return generateFailObj("Camel cannot be selected: currently training");

    //change the slected camel index
    camelsJSON.SelectedCamel = args.camelIndex;

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return {
        Result: "OK"
    }
}
