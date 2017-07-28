//Upgrades the given item on a camel
//
//Arguments
//args.camelIndex
//args.itemType
handlers.upgradeCamelItem = function (args, context) {

    //first of all, we need to make sure that the player does not already own a camel (starting camel can only be picked once)
    var camels = server.GetUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Keys: ["Camels"]
    });

    //check existance of Camels object
    if ((camels.Data.Camels == undefined || camels.Data.Camels == null))
        return generateFailObj("Player's 'Camels' object was not found")

    var camelsJSON = JSON.parse(camels.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (camelObject == undefined || camelObject == null)
        return generateFailObj("Camel with index: " + args.camelIndex + "not found.")

    var nextItemLevel = camelObject[args.itemType] + Number(1);

    log.debug("next level: " + nextItemLevel)

    //update the player's readonly data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });
}
