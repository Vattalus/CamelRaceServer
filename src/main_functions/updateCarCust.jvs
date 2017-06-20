handlers.updateCarCust = function(args, context)
{
  var mC = CheckMaintenanceAndVersion(args);
  if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  var userInv = server.GetUserInventory(
  {
    PlayFabId : currentPlayerId,
  }
  );
  var itemsToGive = [];
  var carFound = "-1";
  var DataToUpdate = {};
  var customizations = {
    PaintJobs : { itemOwned : "no", itemCustData: args.paintId, carItemId : "PaintId" },
    Decals : { itemOwned : "no", itemCustData: args.decalId, carItemId : "DecalId" },
    Plates : { itemOwned : "no", itemCustData: args.platesId, carItemId : "PlatesId" },
    Rims : { itemOwned : "no", itemCustData: args.rimsId, carItemId : "RimsId" },
    WindshieldText : { itemOwned : "no", itemCustData: args.wsId, carItemId : "WindshieldId" }
  };

  for(var i = 0; i < userInv.Inventory.length; i++)
  {
    if((userInv.Inventory[i].ItemId == args.carId) && (userInv.Inventory[i].CatalogVersion == "CarsProgress"))
    {
      carFound = userInv.Inventory[i].ItemInstanceId;
    }
    if(userInv.Inventory[i].ItemId in customizations)
    {
      customizations[userInv.Inventory[i].ItemId].itemOwned = "yes";
      if(customizations[userInv.Inventory[i].ItemId].itemCustData in userInv.Inventory[i].CustomData)
      {
        DataToUpdate[customizations[userInv.Inventory[i].ItemId].carItemId] = customizations[userInv.Inventory[i].ItemId].itemCustData;
      }
      else
      {
        log.debug("user doesn't own: " + userInv.Inventory[i].ItemId + " " + customizations[userInv.Inventory[i].ItemId].itemCustData);
      }
    }
  }
  if(carFound == "-1")
  {
    return generateFailObj("User does not own car with id: " + args.carId);
  }
    //give inventory
  for (var prop in customizations)
  {
    if (customizations.hasOwnProperty(prop))
    {
        if(customizations[prop].itemOwned == "no")
        {
           itemsToGive.push(prop);
        }
    }
  }

  if(DataToUpdate == {}) return generateFailObj("User doesn't own any of those customizations");
  var updatedItem = server.UpdateUserInventoryItemCustomData(
     {
       PlayFabId: currentPlayerId,
       ItemInstanceId: carFound,
       Data: DataToUpdate
     }
     );

  //let's update user's UserInfoData
  updateProfileCar(args,context, currentPlayerId);

  var objectsUpdated =
  [
  {
    ItemId : args.carId,
    CatalogVersion: "CarsProgress",
    CustomData : DataToUpdate
  }
  ];
  if(itemsToGive.length > 0)
  {
    var grantRequest = server.GrantItemsToUser(
    {
      CatalogVersion : "Customization",
      PlayFabId: currentPlayerId,
      ItemIds : itemsToGive
    }
    );

    var InvData = {
      0 : "Owned"
    };

  for(var i = 0; i < grantRequest.ItemGrantResults.length; i++)
  {
    server.UpdateUserInventoryItemCustomData(
         {
           PlayFabId: currentPlayerId,
           ItemInstanceId: grantRequest.ItemGrantResults[i].ItemInstanceId,
           Data: InvData
         }
         );
  }
  }
  var invChangeObj =
      {
          Inventory: objectsUpdated
      };
  var returnObj = {
    Result: "OK",
    Message: "InventoryUpdate",
    InventoryChange:invChangeObj
  };
  
  return returnObj;

};
