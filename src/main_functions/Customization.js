//args.camelIndex
//args.customizationType
//args.itemId
handlers.customizeCamel = function (args, context) {

    //first of all, load the player's owned camels list
    var camelsData = loadCamelsData();

    if (camelsData == undefined || camelsData == null)
        return generateErrObj("Player's 'Camels' object was not found");

    var selectedCamel = camelsData.OwnedCamelsList[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //check to see if given item is already owned
    //load title data
    var tData = server.GetTitleData(
    {
        PlayFabId: currentPlayerId,
        Keys: "OwnedCustomizationItems"
    });

    if (tData == undefined || tData.Data == null)
        return generateErrObj("Error retrieving 'OwnedCustomizationItems'.");

    var ownedCustomizationJSON = {};

    if (tData.Data.OwnedCustomizationItems != undefined && tData.Data.OwnedCustomizationItems != null && JSON.parse(tData.Data.OwnedCustomizationItems) != undefined && JSON.parse(tData.Data.OwnedCustomizationItems) != null) {
        ownedCustomizationJSON = JSON.parse(tData.Data.OwnedCustomizationItems);
    }

    if (ownedCustomizationJSON[args.customizationType] == undefined || ownedCustomizationJSON[args.customizationType] == null || ownedCustomizationJSON[args.customizationType].length == 0)
        ownedCustomizationJSON[args.customizationType] = ["Basic"];

    var itemOwned = ownedCustomizationJSON[args.customizationType].contains(args.itemId);

    //var itemOwned = false;

    //for (var i = 0; i < ownedCustomizationJSON[args.customizationType].length; i++) {
    //    if (ownedCustomizationJSON[args.customizationType][i] == args.itemId) {
    //        itemOwned = true;
    //        break;
    //    }
    //}

    log.debug("Item Owned: " + itemOwned);

    //if customization already owned, set it as current customization for the selected camel and return
    if (itemOwned == true) {
        selectedCamel.Customization[args.customizationType] = args.itemId;

        //update the player's Camels data
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "Camels": JSON.stringify(camelsData) }
        });

        return {
            Result: "OK",
            CamelData: selectedCamel,
        }
    }

    //customization not owned

    //check to see it item exists in the catalog
    var catalogData = GetCatalogItems({ "CatalogVersion": "Customization" + customizationType }).data.Catalog;

    var catalogItemsList = JSON.parse(catalogData.data.Catalog);

    //check if data loaded correctly
    if (catalogItemsList == undefined || catalogItemsList == null || catalogItemsList.length == 0)
        return generateErrObj("Catalog version: Customization" + customizationType + "not found or empty");

    var customizationItemData = {};

    for (var i = 0; i < catalogItemsList.length; i++) {
        if (catalogItemsList[i].ItemId == args.itemId) {
            customizationItemData = catalogItemsList[i];
            break;
        }
    }

    if (customizationItemData == null)
        return generateErrObj("Catalog item: " + args.itemId + " not found");

    //Now, pay the virtual currency cost
    //TODO inside the payCurrency function cast the parameters into numbers before checking if > VirtualCurrencyObject.currcode
    var VirtualCurrencyObject = payCurrency(customizationItemData.VirtualCurrencyPrices.SC, customizationItemData.VirtualCurrencyPrices.HC);

    if (VirtualCurrencyObject == null)
        return generateFailObj("Can't afford customization");

    //add the purchased customization item to list of owned items
    ownedCustomizationJSON[args.customizationType].add(args.itemId);

    //set the customization as current customization for the selected camel
    selectedCamel.Customization[args.customizationType] = args.itemId;

    //update the players owned customization list and cameldata in titledata
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            "OwnedCustomizationItems": JSON.stringify(ownedCustomizationJSON),
            "Camels": JSON.stringify(camelsData)
        }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        OwnedCustomizationItems: ownedCustomizationJSON,
        VirtualCurrency: VirtualCurrencyObject
    }
}