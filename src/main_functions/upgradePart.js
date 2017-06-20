function upgradePart(args, context, userInventoryObject, playerSC, playerHC)
{
  var carCatalog = server.GetCatalogItems(
    {
      CatalogVersion : "CarsProgress"
    }
  );

  var carExists = false;
  for(var i = 0; i < carCatalog.Catalog.length; i++)
  {
    if(carCatalog.Catalog[i].ItemId == args.carId)
    {
      carExists = true;
      break;
    }
  }

  if(carExists === false)
  return generateErrObj("car with ID: " + args.carId + " not found in catalog.");

  // log.debug("Checking to see if part exists in catalog");
  var partsCatalog = server.GetCatalogItems(
    {
      CatalogVersion : "PartCards"
    }
  );

  var partExists = false;
  var cardInfo;
  for(var i = 0; i < partsCatalog.Catalog.length; i++)
  {
    if(partsCatalog.Catalog[i].ItemId == args.partId)
    {
      cardInfo = JSON.parse(partsCatalog.Catalog[i].CustomData);
      partExists = true;
      break;
    }
  }


  if(partExists == false)
  return generateErrObj("part with ID: " + args.partId + " not found in catalog.");

  //log.debug("Checking to see if user has car: " + args.carId);
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

  if(carFound === false)
  {
    return generateFailObj("car with ID: " + args.carId + " not found in user inventory.");
  }
  // log.debug("Checking to see if user has part and or has enough parts");
  var partFound = false;
  var part;
  var newlvl = 0;
  var CarDataToBeUpdated = {};
  for(i = 0; i < userInventoryObject.Inventory.length; i++)
  {
    if((userInventoryObject.Inventory[i].ItemId == args.partId) && (userInventoryObject.Inventory[i].CatalogVersion == "PartCards"))
    {
      partFound = true;
      //log.debug("part is in user's inventory!");
      part = userInventoryObject.Inventory[i];
      var tempDict =
      {
        Exhaust: "ExhaustLvl",
        Engine: "EngineLvl",
        Gearbox:"GearboxLvl",
        Suspension: "SuspensionLvl",
        Tires: "TiresLvl",
        Turbo: "TurboLvl"
      };

      newlvl = parseInt(car.CustomData[tempDict[args.partId]]) + 1;

      //test if maximum pr level was reached
      if(newlvl >= Number(cardInfo.prPerLvl.length))
          return generateFailObj("Maximum pr level was reached!");

      var partsRequired = getObjectValueFromLevel(cardInfo, "cardCostPerLvl", newlvl);
      var currCost = getObjectValueFromLevel(cardInfo, "currCostPerLvl", newlvl);

      CarDataToBeUpdated[tempDict[args.partId]] = newlvl;
      car.CustomData[tempDict[args.partId]] = newlvl;
      // log.debug("we need: " + partsRequired + " cards and " + currCost + " money => base: " + parseInt(cardInfo.baseCurrCost) + " lvls: " + parseInt(car.CustomData[tempDict[args.partId]]) + " perLvlCost: " + parseInt(cardInfo.currCostPerLvl) + " equalling: "  + ((parseInt(car.CustomData[tempDict[args.partId]], 10) * parseInt(cardInfo.currCostPerLvl, 10))));
      var updateCardData;
      var costCheckObj = checkBalance(cardInfo.currType, currCost, playerSC, playerHC);
      if(costCheckObj != "OK") return costCheckObj;
      // log.debug("consuming part instance: " + userInventoryObject.Inventory[i].ItemInstanceId);
      try
      {
        if(userInventoryObject.Inventory[i].CustomData === undefined)//let's check if item has custom data
        {
          return generateFailObj("Insufficient cards");
        }
        else
        {
          if(userInventoryObject.Inventory[i].CustomData.Amount === undefined)//let's check if item has amount custom data
          {
            return generateFailObj("Insufficient cards");
          }
          else // let's check and see if the user has sufficent cards
          {
            if(userInventoryObject.Inventory[i].CustomData.Amount >= partsRequired) // he does so let's remove the appropriate amount
            {
              userInventoryObject.Inventory[i].CustomData.Amount -= partsRequired;
              updateCardData = {"Amount" : userInventoryObject.Inventory[i].CustomData.Amount};
              server.UpdateUserInventoryItemCustomData(
                {
                  PlayFabId: currentPlayerId,
                  ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
                  Data: updateCardData
                }
              );
            }
            else
            {
              return generateFailObj("Insufficient cards");
            }
          }
        }
      }
      catch(err)
      {
        // log.debug("itemConsumptionResult.errorCode " + err);
        return generateFailObj("Insufficient cards");
      }
      break; //for search
    }//if in inventory

  }//for
  if(partFound == false)
  {
    return generateFailObj("Part not found");
  }
  var subtractUserCurrencyResult;
  if(currCost>0)
  {
    subtractUserCurrencyResult = server.SubtractUserVirtualCurrency(
      {
        PlayFabId: currentPlayerId,
        VirtualCurrency : cardInfo.currType,
        Amount: currCost
      }
    );
    updateCurrencySpentStatistic(cardInfo.currType, currCost);
  }
  var newPr = recalculateCarPr(car.CustomData, car.ItemId, undefined, partsCatalog);
  CarDataToBeUpdated.Pr = newPr;

  server.UpdateUserInventoryItemCustomData(
    {
      PlayFabId: currentPlayerId,
      ItemInstanceId: car.ItemInstanceId,
      Data: CarDataToBeUpdated
    }
  );
  var objectsUpdated =
  [
    {
      ItemId : args.partId,
      CatalogVersion: "PartCards",
      CustomData: updateCardData
    },
    {
      ItemId : args.carId,
      CatalogVersion: "CarsProgress",
      CustomData : CarDataToBeUpdated
    }
  ];
  // log.debug("succesfully upgraded part!");



  var currencyUpdated = {};
  i ={Inventory: objectsUpdated};
  if(subtractUserCurrencyResult !== undefined)
  {
    currencyUpdated[subtractUserCurrencyResult.VirtualCurrency] = subtractUserCurrencyResult.Balance;
    i.VirtualCurrency = currencyUpdated;
  }

  //let's udpate our profile
  updateProfileCar(args, context, currentPlayerId);

  i.Experience = UpdateExperience("Balancing", "BalancingItem", "Parts_" + cardInfo.rarity, newlvl, true);
  return generateInventoryChange("InventoryUpdatePart", i);
}
