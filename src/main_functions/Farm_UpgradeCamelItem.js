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
        return generateErrObj("Player's 'Camels' object was not found")

    var camelsJSON = JSON.parse(camels.Data.Camels.Value);
    var camelObject = camelsJSON.OwnedCamelsList[args.camelIndex];

    if (camelObject == undefined || camelObject == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.")

    var currentLevel = Number(camelObject[args.itemType]);


    //Now, load the balancing information to find out if next level would exceed level limit
    var upgradeBalancing = loadTitleDataJson("Balancing_Upgrade");

    if (upgradeBalancing == undefined || upgradeBalancing == null)
        return generateErrObj("Upgrade Balancing JSON undefined or null");

    //check if limit information is defined
    if (upgradeBalancing.UpgradeLimits == undefined || upgradeBalancing.UpgradeLimits == null)
        return generateErrObj("Upgrade Limits not defined");

    var upgradeLimit = Number(upgradeBalancing.UpgradeLimits[camelObject.Quality]);

    if (upgradeLimit == undefined || upgradeLimit == null)
        return generateErrObj("Upgrade limit for this quality not defined");

    if (currentLevel >= upgradeLimit)
        return generateFailObj("Item at max lvl")

    //if we got this far, the camel is not at max level yet

    //check if upgrade values are set for given item, at current level
    if (upgradeBalancing[args.itemType] == undefined || upgradeBalancing[args.itemType] == null ||
        upgradeBalancing[args.itemType][currentLevel] == undefined || upgradeBalancing[args.itemType][currentLevel] == null)
        return generateErrObj("Upgrade values not found");

    var upgradeValues = upgradeBalancing[args.itemType][currentLevel];

    //Now, load player's virtuar currency, to check if they can afford the upgrade
    var VirtualCurrencyObject = server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency;

    if (upgradeValues.CostSC > VirtualCurrencyObject.SC || upgradeValues.CostHC > VirtualCurrencyObject.HC)
        return generateFailObj("Can't afford upgrade");

    //subtract currency
    server.SubtractUserVirtualCurrency({ PlayFabId: currentPlayerId, "SC": upgradeValues.CostSC, "HC": upgradeValues.CostHC });

    //increment item level
    camelObject[args.itemType] = currentLevel + Number(1);

    //grant stat gains
    var splitStats = upgradeValues.StatBonuses.split(",");

    //Acceleration
    if (splitStats.length > 0 && !isNaN(Number(splitStats[0])) && Number(splitStats[0]) > 0)
        camelObject.CurrentAcc += Number(splitStats[0]);

    //Speed
    if (splitStats.length > 1 && !isNaN(Number(splitStats[1])) && Number(splitStats[1]) > 0)
        camelObject.CurrentAcc += Number(splitStats[1]);

    //Gallop
    if (splitStats.length > 2 && !isNaN(Number(splitStats[2])) && Number(splitStats[2]) > 0)
        camelObject.CurrentAcc += Number(splitStats[2]);

    //Stamina
    if (splitStats.length > 3 && !isNaN(Number(splitStats[3])) && Number(splitStats[3]) > 0)
        camelObject.CurrentAcc += Number(splitStats[3]);

    //TODO increment camel value

    //update the player's Camels data
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: { "Camels": JSON.stringify(camelsJSON) }
    });

    return {
        Result: "OK",
        CamelData: camelObject,
        VirtualCurrency: server.GetUserInventory({ PlayFabId: currentPlayerId }).VirtualCurrency
    }
}
