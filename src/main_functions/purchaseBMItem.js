handlers.purchaseBMItem = function(args, context)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  
  //log.debug("purchasing item " + args.itemId + " from black market");
  if((args.itemId < 0) || (args.itemId > 3)) return generateFailObj("invalid item index");
  var keysToGet = [];
  keysToGet.push("BMItem" + args.itemId);

  var getInternalDataResult = server.GetUserInternalData(
  {
    PlayFabId: currentPlayerId,
    Keys: keysToGet
  }
  );

  var userInventoryObject = server.GetUserInventory(
  {
    PlayFabId: currentPlayerId
  }
  );

  var userArray = getInternalDataResult.Data["BMItem" + args.itemId].Value.split("_");//name, curr, baseCost, uses, costUse
  //log.debug("userArray: " + userArray);
  var playerMoney = userInventoryObject.VirtualCurrency[userArray[1]];

  if(userArray.length != 5)
  {
    generateErrObj("User Black Market corrupted. Try again tomorrow");
  }

  var catalogName = "";
  if(args.itemId < 2)
    catalogName = "PartCards";
  else
    catalogName = "CarCards";

  var price = parseInt(userArray[2]) + parseInt(userArray[3])* parseInt(userArray[4]);
  var checkObj = checkBalance(userArray[1], price, playerMoney, playerMoney);
  if(checkObj != "OK") return checkObj;
  //try
  //{
    var cardInstance;
    var cardAmount = 0;
    var cardData;
   // log.debug("searching for: " + userArray[0] + " in " + catalogName);
    for(var i = 0; i < userInventoryObject.Inventory.length; i++) // if we find it in the inventory we just give him the amount of cards we owe the player
    {
      if((userInventoryObject.Inventory[i].ItemId == userArray[0]) && (userInventoryObject.Inventory[i].CatalogVersion == catalogName))
      {
       // log.debug("found it!");
        cardInstance = userInventoryObject.Inventory[i].ItemInstanceId;
        if(userInventoryObject.Inventory[i].CustomData === undefined)
        {
         // log.debug("no custom data. creating ...");
          cardData = {"Amount" : 1};
        }
        else
        {
          if(userInventoryObject.Inventory[i].CustomData.Amount === undefined)
            cardData = {"Amount" : 1};
          else
          {
          var tempAmount = Number(userInventoryObject.Inventory[i].CustomData.Amount) + 1;
          if(isNaN(tempAmount)) tempAmount = 1;
          cardData = {"Amount" : tempAmount};
          }
        }

        server.UpdateUserInventoryItemCustomData(
              {
                PlayFabId: currentPlayerId,
                ItemInstanceId: cardInstance,
                Data: cardData
              }
              );

        break;
      }
    }
    if(cardInstance === undefined)
    {
      //log.debug("cardInstance is undefined");
      var itemsToGive = [];
      itemsToGive.push(userArray[0]);
      var grantRequest = server.GrantItemsToUser(
        {
          CatalogVersion : catalogName,
          PlayFabId: currentPlayerId,
          ItemIds : itemsToGive
        }
        );
      cardInstance = grantRequest.ItemGrantResults[0].ItemInstanceId;
      if(cardInstance === undefined)
        generateErrObj("grantRequest denied");
      else
      {
        cardData = {"Amount" : 1};
        server.UpdateUserInventoryItemCustomData(
          {
            PlayFabId: currentPlayerId,
            ItemInstanceId: cardInstance,
            Data: cardData
          }
          );
      }
    }
    var subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
      {
        PlayFabId: currentPlayerId,
        VirtualCurrency : userArray[1],
        Amount: price
      }
      );
    updateCurrencySpentStatistic(userArray[1], price);
    var itemVal = userArray[0] + "_" + userArray[1] + "_" + userArray[2] + "_"  + (parseInt(userArray[3]) + 1) + "_" +  userArray[4];
    //log.debug("generatedArray: " + itemVal);
    var dataToUpdate = {};
    dataToUpdate["BMItem" + args.itemId] = itemVal;
    server.UpdateUserInternalData(
      {
        PlayFabId : currentPlayerId,
        Data : dataToUpdate
      }  );
    var objectsUpdated =
        [
        {
          ItemId : userArray[0],
          CatalogVersion: catalogName,
          CustomData: cardData
        }
        ];

      var currencyUpdated = {};
      currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
      var b=args.itemId+"_"+userArray[2]+"_"+(parseInt(userArray[3]) + 1)+"_"+userArray[4];
      i={
            Inventory: objectsUpdated,
            VirtualCurrency: currencyUpdated
        };
      var returnObj = {
        Result: "OK",
        Message: "InventoryUpdate",
        InventoryChange:i,
        BMItemChange: b
      };
      return returnObj;
};
