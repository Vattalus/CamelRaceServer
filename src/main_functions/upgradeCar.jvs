function upgradeCar(args, context, userInventoryObject, playerSC, playerHC)
{
  var carCardsCatalog = server.GetCatalogItems(
    {
      CatalogVersion : "CarCards"
    }
  );

  var carFound = false;
  var car;
  for(var i = 0; i < userInventoryObject.Inventory.length; i++)
  {
    if((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress"))
    {
      carFound = true;
      //log.debug("car is in user's inventory!");
      car = userInventoryObject.Inventory[i];
      break;
    }
  }
  var cardInfo;
  for(i = 0; i < carCardsCatalog.Catalog.length; i++)
  {
    if(carCardsCatalog.Catalog[i].ItemId == args.carId)
    {
      cardInfo = JSON.parse(carCardsCatalog.Catalog[i].CustomData);
      //log.debug("cardInfo found!");
      break;
    }
  }

  if(cardInfo === undefined)
  return generateErrObj("CardNotFoundForCarwithID: " + args.carId + ". It is possible that the carCard ID and the Car ID do not coincide. Check Playfab catalog data.");

  if(carFound === true)
  {
    //test if maximum pr level was reached
    var newLvl = (parseInt(car.CustomData.CarLvl) + 1);
    if(newLvl >= Number(cardInfo.prPerLvl.length))
        return generateFailObj("Maximum pr level was reached!");

    var currCost = getObjectValueFromLevel(cardInfo, "currCostPerLvl", newLvl);
    var costCheckObj = checkBalance(cardInfo.currType, currCost, playerSC, playerHC);
    if(costCheckObj != "OK") return costCheckObj;


    //log.debug("user has enough currency. Let's check for card balance");

    var cardCost =  getObjectValueFromLevel(cardInfo, "cardCostPerLvl", newLvl);
    car.CustomData.CarLvl = newLvl;
    // log.debug("cardCost: " + cardCost);
    var cardFound = false;
    var cardData;
    for(i = 0; i < userInventoryObject.Inventory.length; i++)
    {
      if((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarCards"))
      {
        // log.debug("consuming: " + userInventoryObject.Inventory[i].ItemInstanceId);
        cardFound = true;
        try
        {
          if(userInventoryObject.Inventory[i].CustomData === undefined)//let's check if item has custom data
          {
            return generateFailObj("Insufficient cards, CusotmData undefined");
          }
          else
          {
            if(userInventoryObject.Inventory[i].CustomData.Amount === undefined)//let's check if item has amount custom data
            {
              return generateFailObj("Insufficient cards, CusotmData.Amount udnefined");
            }
            else // let's check and see if the user has sufficent cards
            {
              if(Number(userInventoryObject.Inventory[i].CustomData.Amount) >= cardCost) // he does so let's remove the appropriate amount
              {
                userInventoryObject.Inventory[i].CustomData.Amount -= cardCost;
                cardData = {"Amount" : userInventoryObject.Inventory[i].CustomData.Amount};
                server.UpdateUserInventoryItemCustomData(
                  {
                    PlayFabId: currentPlayerId,
                    ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                    Data: cardData
                  }
                );
              }
              else
              {
                return generateFailObj("Insufficient cards for real: " + userInventoryObject.Inventory[i].CustomData.Amount + " vs " + cardCost);
              }
            }
          }
        }
        catch(err)
        {
          //log.debug("itemConsumptionResult.errorCode " + err);
          return generateFailObj("Insufficient cards");
        }
        break;
      }
    }

    if(cardFound === false)
    {
      return generateFailObj("No cards found");
    }
    // log.debug("user has enough cards to purchase upgrade!");

    var newPr = recalculateCarPr(car.CustomData, car.ItemId, carCardsCatalog, undefined);
    // log.debug("upgrading to car lvl: " +  newLvl + " and pr: " + newPr);
    var CarData = {
      "CarLvl" : newLvl,
      "Pr" : newPr
    };
    server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: car.ItemInstanceId,
        Data: CarData
      }
    );

    //let's udpate our profile
    updateProfileCar(args, context, currentPlayerId);

    var subtractUserCurrencyResult;
    if(currCost > 0){
      subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
        {
          PlayFabId: currentPlayerId,
          VirtualCurrency : cardInfo.currType,
          Amount: currCost
        }
      );
      updateCurrencySpentStatistic(cardInfo.currType, currCost);
    }
    // log.debug("Upgrade Complete!");
    
    var objectsUpdated =
    [
      {
        ItemId : args.carId,
        CatalogVersion: "CarCards",
        CustomData: cardData
      },
      {
        ItemId : args.carId,
        CatalogVersion: "CarsProgress",
        CustomData : CarData
      }
    ];

    var currencyUpdated = {};
    var i =
    {
      Inventory: objectsUpdated
    }
    if(subtractUserCurrencyResult!=undefined)
    {
      currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
      i.VirtualCurrency = currencyUpdated;
    }

    i.Experience = UpdateExperience("Balancing", "BalancingItem", "Car_" + cardInfo.rarity, newLvl, true);
    return generateInventoryChange("InventoryUpdate", i);
  }
  else
  {
    // log.debug("user doesn't have car: " +  args.carId + "... looking for card");
    var cardFound = false;
    var cardData;
    var carCardInstance;
    for(var i = 0; i < userInventoryObject.Inventory.length; i++)
    {
      if((userInventoryObject.Inventory[i].ItemId == args.carId) && (userInventoryObject.Inventory[i].CatalogVersion == "CarCards"))
      {
        //log.debug("consuming: " + userInventoryObject.Inventory[i].ItemInstanceId);
        cardFound = true;
        try
        {
          if(userInventoryObject.Inventory[i].CustomData === undefined)//let's check if item has custom data
          {
            return generateFailObj("Insufficient cards, CustomData null");
          }
          else
          {
            if(userInventoryObject.Inventory[i].CustomData.Amount === undefined)//let's check if item has amount custom data
            {
              return generateFailObj("Insufficient cards, CustomData.Amount null");
            }
            else // let's check and see if the user has sufficent cards
            {
              if(Number(userInventoryObject.Inventory[i].CustomData.Amount) >= Number(cardInfo.cardCostPerLvl[1])) // he does so let's remove the appropriate amount
              {
                carCardInstance = userInventoryObject.Inventory[i].ItemInstanceId;
                userInventoryObject.Inventory[i].CustomData.Amount -= cardInfo.cardCostPerLvl[1];
                cardData = {"Amount" : userInventoryObject.Inventory[i].CustomData.Amount};
              }
              else
              {
                return generateFailObj("Insufficient cards: " + userInventoryObject.Inventory[i].CustomData.Amount + " vs " + cardInfo.cardCostPerLvl[1] +".");
              }
            }
          }
        }
        catch(err)
        {
          return generateFailObj("Insufficient cards: " + err);
        }
        break;
      }
    }

    if(cardFound == false)
    {
      return generateFailObj("No cards found");
    }

    //log.debug("user has enough cards to purchase car. Checking if enough currency is availabe");

    var costCheckObj = checkBalance(cardInfo.currType, cardInfo.currCostPerLvl[1], playerSC, playerHC);
    if(costCheckObj != "OK") return costCheckObj;

    var itemsToGive = [];
    itemsToGive.push(args.carId);

    var carToGive = server.GrantItemsToUser(
      {
        CatalogVersion : "CarsProgress",
        PlayFabId: currentPlayerId,
        ItemIds : itemsToGive
      }
    );

    if(carToGive.ItemGrantResults[0].Result === false)
    {
      log.error("Something went wrong while giving user the item, refunding cards");
      //new refund code
      return generateFailObj("Something went wrong while giving user the item, refunding cards.");
    }
    else
    {
      server.UpdateUserInventoryItemCustomData(
        {
          PlayFabId: currentPlayerId,
          ItemInstanceId: carCardInstance,
          Data: cardData
        }
      );
    }
    var subtractUserCurrencyResult;
    if(cardInfo.currCostPerLvl[1] > 0){
      subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
        {
          PlayFabId: currentPlayerId,
          VirtualCurrency : cardInfo.currType,
          Amount: cardInfo.currCostPerLvl[1]
        }
      );
      updateCurrencySpentStatistic(cardInfo.currType, cardInfo.currCostPerLvl[1]);
    }

    var CarData = {
      "CarLvl" : "1",
      "EngineLvl" : "0",
      "ExhaustLvl" : "0",
      "GearboxLvl" : "0",
      "SuspensionLvl" : "0"
    };

    server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carToGive.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
      }
    );
    CarData = {
      "TiresLvl" : "0",
      "TurboLvl" : "0",
      "PaintId" : cardInfo.defaultPaintID,
      "DecalId" : "0",
      "RimsId" : "0"
    };
    server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carToGive.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
      }
    );
    CarData = {
      "PlatesId" : "0",
      "WindshieldId" : "0",
      "Pr" : (Number(cardInfo.basePr) + cardInfo.prPerLvl[1])
    };

    server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carToGive.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
      }
    );
    //if user doesn't have this paint job we give it to him/her
    var hasPaintJob = false;
    var hasPaintJobItem = false;
    var paintData;
    for(var i = 0; i < userInventoryObject.Inventory.length; i++)
    {
      if(userInventoryObject.Inventory[i].ItemId == "PaintJobs")
      {
        hasPaintJobItem = true;
        //log.debug("user has paintjobs");
        if(userInventoryObject.Inventory[i].CustomData != undefined)
        {
          // log.debug("user has paintjobs customData");
          if (cardInfo.defaultPaintID in userInventoryObject.Inventory[i].CustomData)
          {
            //log.debug("user has paintjob already");
            hasPaintJob = true;
          }
          else
          {
            // log.debug("user doesn't have paintjob");
            paintData = {}
            paintData[cardInfo.defaultPaintID] = "Owned";
          }
        }
        else // userInventoryObject.Inventory[i].CustomData == undefined
        {
          paintData = {}
          paintData[cardInfo.defaultPaintID] = "Owned";
        }
        if(paintData != undefined){
          server.UpdateUserInventoryItemCustomData(
            {
              PlayFabId: currentPlayerId,
              ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
              Data: paintData
            }
          );}
          break;
        }//end if "PaintJobs"
      }//end for

      if(hasPaintJobItem == false)
      {
        paintToGive = [];
        paintToGive.push("PaintJobs");
        var custToGive = server.GrantItemsToUser(
          {
            CatalogVersion : "Customization",
            PlayFabId: currentPlayerId,
            ItemIds : paintToGive
          }
        );

        var paintData = {};
        paintData[cardInfo.defaultPaintID] = "Owned";
        server.UpdateUserInventoryItemCustomData(
          {
            PlayFabId: currentPlayerId,
            ItemInstanceId: custToGive.ItemGrantResults[0].ItemInstanceId,
            Data: paintData
          }
        );

      }

      //create function result object for new car
      CarData = {
        "CarLvl" : "1",
        "EngineLvl" : "0",
        "ExhaustLvl" : "0",
        "GearboxLvl" : "0",
        "SuspensionLvl" : "0"    ,
        "TiresLvl" : "0",
        "TurboLvl" : "0",
        "PaintId" : cardInfo.defaultPaintID,
        "DecalId" : "0",
        "RimsId" : "0"   ,
        "PlatesId" : "0",
        "WindshieldId" : "0",
        "Pr" : Number(cardInfo.basePr) + cardInfo.prPerLvl[1]
      };
      var objectsUpdated =
      [
        {
          ItemId : args.carId,
          CatalogVersion: "CarCards",
          CustomData: cardData
        },
        {
          ItemId : args.carId,
          CatalogVersion: "CarsProgress",
          CustomData : CarData
        }
      ];

      if(hasPaintJob == false)
      {
        var paintDataUpdateObj = {};
        paintDataUpdateObj[cardInfo.defaultPaintID] = "Owned";
        var pObj =
        {
          ItemId : "PaintJobs",
          CatalogVersion: "Customization",
          CustomData : paintDataUpdateObj
        }
        objectsUpdated.push(pObj);
      }

      var currencyUpdated = {};

      i =
      {
        Inventory: objectsUpdated
      }
      if(subtractUserCurrencyResult != undefined)
      {
        currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
        i.VirtualCurrency =currencyUpdated;
      }

      //let's udpate our profile
      updateProfileCar(args, context, currentPlayerId);

      i.Experience = UpdateExperience("Balancing", "BalancingItem", "Car_" + cardInfo.rarity, 1, true);
      return generateInventoryChange("InventoryUpdateNewCar", i);
    }
  }
