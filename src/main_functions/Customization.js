//args.camelIndex
//args.customizationCategory
//args.itemId
handlers.customizeCamel = function (args, context) {

    //first of all, load the player's owned camels list
    var ownedCamels = loadOwnedCamels();

    if (ownedCamels == undefined || ownedCamels == null)
        return generateErrObj("Player's 'OwnedCamels' object was not found");

    var selectedCamel = ownedCamels[args.camelIndex];

    if (selectedCamel == undefined || selectedCamel == null)
        return generateErrObj("Camel with index: " + args.camelIndex + "not found.");

    //make sure the camel has a customization object
    if (selectedCamel.Customization == undefined || selectedCamel.Customization == null)
        selectedCamel.Customization = createEmptyCustomizationObject;

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

    log.debug(
    {
        "Owned Data: ": tData.Data.OwnedCustomizationItems,
        "Owned undefined: ": tData.Data.OwnedCustomizationItems == undefined,
        "Owned null: ": tData.Data.OwnedCustomizationItems == null,
        //"Owned Json undef: ": JSON.parse(tData.Data.OwnedCustomizationItems.Value) == undefined,
        //"Owned Json null: ": JSON.parse(tData.Data.OwnedCustomizationItems.Value) == null,
    });

    if (tData.Data.OwnedCustomizationItems != undefined && tData.Data.OwnedCustomizationItems != null && JSON.parse(tData.Data.OwnedCustomizationItems.Value) != undefined && JSON.parse(tData.Data.OwnedCustomizationItems.Value) != null) {
        ownedCustomizationJSON = JSON.parse(tData.Data.OwnedCustomizationItems.Value);
    }

    if (ownedCustomizationJSON[args.customizationCategory] == undefined || ownedCustomizationJSON[args.customizationCategory] == null || ownedCustomizationJSON[args.customizationCategory].length == 0) {
        ownedCustomizationJSON[args.customizationCategory] = ["Basic"];

        //update on server
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "OwnedCustomizationItems": JSON.stringify(ownedCustomizationJSON) }
        });
    }


    var itemOwned = contains(ownedCustomizationJSON[args.customizationCategory], args.itemId);

    //if customization already owned, set it as current customization for the selected camel and return
    if (itemOwned == true) {
        selectedCamel.Customization[args.customizationCategory] = args.itemId;

        //update the player's Camels data
        server.UpdateUserReadOnlyData(
        {
            PlayFabId: currentPlayerId,
            Data: { "OwnedCamels": JSON.stringify(ownedCamels) }
        });

        return {
            Result: "OK",
            CamelData: selectedCamel
        }
    }

    //customization not owned

    //check to see it item exists in the catalog
    var catalogItemsList = server.GetCatalogItems({ "CatalogVersion": "Customization" + args.customizationCategory }).Catalog;

    //check if data loaded correctly
    if (catalogItemsList == undefined || catalogItemsList == null || catalogItemsList.length == 0)
        return generateErrObj("Catalog version: Customization" + args.customizationCategory + " not found or empty");

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
    ownedCustomizationJSON[args.customizationCategory].push(args.itemId);

    //set the customization as current customization for the selected camel
    selectedCamel.Customization[args.customizationCategory] = args.itemId;

    //update the players owned customization list and cameldata in titledata
    server.UpdateUserReadOnlyData(
    {
        PlayFabId: currentPlayerId,
        Data: {
            "OwnedCustomizationItems": JSON.stringify(ownedCustomizationJSON),
            "OwnedCamels": JSON.stringify(ownedCamels)
        }
    });

    return {
        Result: "OK",
        CamelData: selectedCamel,
        OwnedCustomizationItems: ownedCustomizationJSON,
        VirtualCurrency: VirtualCurrencyObject
    }
}