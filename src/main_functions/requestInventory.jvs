handlers.requestInventory = function(args)
{
  //var mC = CheckMaintenanceAndVersion(args);
  //if(mC != "OK") return generateMaintenanceOrUpdateObj(mC);
  var userInventoryObject = server.GetUserInventory(
  {
    PlayFabId: currentPlayerId,
  }
  );
  //let's update the user's current currency statistics
  var sc = Number(userInventoryObject.VirtualCurrency.SC);
  if(isNaN(sc) || sc < 0) sc = 0;

  var hc = Number(userInventoryObject.VirtualCurrency.HC);
  if(isNaN(hc) || hc < 0) hc = 0;

  var suArray = [];
  var sum = {StatisticName: "CurrentMoney", Version : "0", Value: sc};
  suArray.push(sum);
  var sug = {StatisticName: "CurrentGold", Version : "0", Value: hc};
  suArray.push(sug);
   var updateRequest = server.UpdatePlayerStatistics(
      {
         PlayFabId: currentPlayerId,
         Statistics: suArray
      }
      );
  //get catalog data for pr calculation
    var carCardsCatalog = server.GetCatalogItems(
         {
           CatalogVersion : "CarCards"
         }
         );
    var partCardsCatalog = server.GetCatalogItems(
       {
         CatalogVersion : "PartCards"
       }
       );
  var hasCars = false;
  for(var i = 0; i < userInventoryObject.Inventory.length; i++)
  {
    if(userInventoryObject.Inventory[i].CatalogVersion == "CarsProgress")
    {
      hasCars = true;
      var check = checkCarDataValidity(userInventoryObject.Inventory[i], carCardsCatalog);
      //log.debug("check " + check);
      if((check == "PlayFabError") || (check === undefined)) return generateErrObj("PlayfabError");
      else if(check == "OK") log.debug("Data for " + userInventoryObject.Inventory[i].ItemId + " OK");
           else userInventoryObject.Inventory[i].CustomData = check;
      userInventoryObject.Inventory[i].CustomData.Pr = recalculateCarPr(userInventoryObject.Inventory[i].CustomData, userInventoryObject.Inventory[i].ItemId, carCardsCatalog, partCardsCatalog);
      var d = {};
      d["Pr"] = userInventoryObject.Inventory[i].CustomData.Pr;
      server.UpdateUserInventoryItemCustomData( // if this doesn't happen it's still fine; we might actually be able to skip this entirely
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: userInventoryObject.Inventory[i].ItemInstanceId,
        Data: d
      }
      );
    }
  }
  if(hasCars === false)
    {
      var carsToGive = [];
      carsToGive.push("FordFocus");
      var carRequest = server.GrantItemsToUser(
      {
        CatalogVersion : "CarsProgress",
        PlayFabId: currentPlayerId,
        ItemIds : carsToGive
      }
      );
      var CarData = {"CarLvl" : "1","EngineLvl" : "0","ExhaustLvl" : "0","GearboxLvl" : "0","SuspensionLvl" : "0"};
      server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
      }
      );
      CarData = {"TiresLvl" : "0","TurboLvl" : "0","PaintId" : "0","DecalId" : "0","RimsId" : "0"};
      server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
      }
      );
      CarData = {"PlatesId" : "0","WindshieldId" : "0","Pr" : "10"};
      server.UpdateUserInventoryItemCustomData(
      {
        PlayFabId: currentPlayerId,
        ItemInstanceId: carRequest.ItemGrantResults[0].ItemInstanceId,
        Data: CarData
      }
      );
      return generateErrObj("UserHasNoCars ... reiniting");
    }
  return userInventoryObject;
};
