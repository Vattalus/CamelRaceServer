handlers.purchaseItems = function(args, context)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  //retrieve user inventory
  //log.debug("RETRIEVING USER INVENTORY");
  var userInventoryObject = server.GetUserInventory(
    {
      PlayFabId: currentPlayerId
    }
  );
  //retrieve player currency
  var playerSC = userInventoryObject.VirtualCurrency.SC;
  var playerHC = userInventoryObject.VirtualCurrency.HC;

  //log.debug("user currency: SC: " + playerSC + " HC: " + playerHC);

  switch(args.purchaseType)
  {
    case "carUpgrade":
      return upgradeCar(args, context, userInventoryObject, playerSC, playerHC);

    case "partUpgrade":
      return upgradePart(args, context, userInventoryObject, playerSC, playerHC);

    case "custPurchase":
    // log.debug("Purchasing Customization: " + args.custId + " with val: " + args.custVal);
    var custCatalog = server.GetCatalogItems(
      {
        CatalogVersion : "Customization"
      }
    );

    var custCatalogItem;
    var custPrice = 0;
    var custCurr = "SC";
    for(var i = 0; i < custCatalog.Catalog.length; i++)
    {
      if(custCatalog.Catalog[i].ItemId == args.custId)
      {
        custCatalogItem = custCatalog.Catalog[i];
        cardInfo = JSON.parse(custCatalog.Catalog[i].CustomData)
        var keyRequestCurr = args.custVal + ",Curr";
        var keyRequestCost = args.custVal + ",Cost";

        custCurr = cardInfo[keyRequestCurr];
        custPrice = cardInfo[keyRequestCost];

        var costCheckObj = checkBalance(custCurr, custPrice, playerSC, playerHC);
        if(costCheckObj != "OK") return costCheckObj;

        // log.debug("custCurr: " + custCurr);
        //   log.debug("custPrice: " + custPrice);

        break;
      }
    }

    if(custCatalogItem == undefined)
    return generateErrObj("Customization does not exist in catalog.");

    //  log.debug("Checking to see if user has said customization");
    var customizationItem;
    var customizationItemInstance;
    for(var i = 0; i < userInventoryObject.Inventory.length; i++)
    {
      if(userInventoryObject.Inventory[i].ItemId == args.custId)
      {
        //       log.debug("user has customization category!");
        customizationItem = userInventoryObject.Inventory[i];
        customizationItemInstance = userInventoryObject.Inventory[i].ItemInstanceId;
        if (customizationItem.CustomData != undefined)
        {
          if (String(args.custVal) in customizationItem.CustomData)
          {
            return generateFailObj("User already has this customization.");
          }
        }
        break;
      }
    }

    if(customizationItem == undefined)
    {
      log.info("user doesn't have customization category. Granting ... ");
      var itemsToGive = [];
      itemsToGive.push(args.custId);

      var custToGive = server.GrantItemsToUser(
        {
          CatalogVersion : "Customization",
          PlayFabId: currentPlayerId,
          ItemIds : itemsToGive
        }
      );

      if(custToGive.ItemGrantResults[0].Result == false)
      return generateErrObj("something went wrong while granting user customization class object.");

      customizationItemInstance = custToGive.ItemGrantResults[0].ItemInstanceId;
    }

    var customizationData = {};
    customizationData[String(args.custVal)] = "Owned";

    server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: customizationItemInstance,
        Data: customizationData
      }
    );
    var i;
    var objectsUpdated =
    [
      {
        ItemId : args.custId,
        CatalogVersion: "Customization",
        CustomData : customizationData
      }
    ];

    if(custPrice > 0)
    {
      var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
        {
          PlayFabId: currentPlayerId,
          VirtualCurrency : custCurr,
          Amount: custPrice
        }
      );
      updateCurrencySpentStatistic(custCurr, custPrice);
      var currencyUpdated = {};
      currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
      i =
      {
        Inventory: objectsUpdated,
        VirtualCurrency: currencyUpdated
      };
    }
    else
    {
      i =
      {
        Inventory: objectsUpdated
      };
    }
    return generateInventoryChange("InventoryUpdateNewCustomization", i)

    break; // big switch
    case "softCurrencyPurchase":
    //   log.debug("Purchasing pack: " + args.packId);

    //   log.debug("Checking to see if pack exists in catalog");
    var packCatalog = server.GetCatalogItems(
      {
        CatalogVersion : "SoftCurrencyStore"
      }
    );

    var packExists = false;
    var packPrice = 0;
    for(var i = 0; i < packCatalog.Catalog.length; i++)
    {
      if(packCatalog.Catalog[i].ItemId == args.packId)
      {
        packPrice = packCatalog.Catalog[i].VirtualCurrencyPrices.HC;
        cardInfo = JSON.parse(packCatalog.Catalog[i].CustomData);
        packExists = true;
        break;
      }
    }

    if(packExists == false)
    return generateErrObj("pack with ID: " + args.packId + " not found in catalog.");

    if(packPrice <= 0)
    return generateErrObj("pack with ID: " + args.packId + " shouldn't have negative cost.");

    if(packPrice > playerHC)
    return generateFailObj("Not enough HC.");

    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
      {
        PlayFabId: currentPlayerId,
        VirtualCurrency : "HC",
        Amount: packPrice
      }
    );
    updateCurrencySpentStatistic("HC", packPrice);
    var addUserCurrencyResult = server.AddUserVirtualCurrency(
      {
        PlayFabId: currentPlayerId,
        VirtualCurrency : "SC",
        Amount: cardInfo.quantity
      }
    );
    var currencyUpdated = {};
    currencyUpdated[addUserCurrencyResult.VirtualCurrency] = addUserCurrencyResult.Balance;
    currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
    var invChangeObj =
    {
      VirtualCurrency: currencyUpdated
    };
    return generateInventoryChange("SoftCurrencyPurchased", invChangeObj)
    break;

    default:
    log.debug("invalid purchase parameter");
  }
};
